import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";

// One-way sync of events from the portal (source of truth) into a Webflow CMS
// collection, so each approved, upcoming event becomes its own page on the
// marketing site at jointheconclave.com/event/{slug}.
//
// Everything is env-gated: with no WEBFLOW_API_TOKEN / WEBFLOW_EVENTS_COLLECTION_ID
// configured, the sync no-ops (like email.ts), so the app runs fine until the
// secrets are added in Webflow Cloud.
//
// Required env (set as secrets / vars on Webflow Cloud):
//   WEBFLOW_API_TOKEN               - Webflow site API token with CMS read/write
//   WEBFLOW_EVENTS_COLLECTION_ID    - the "Events" collection id
// Optional:
//   EMAIL_BASE_URL                  - absolute portal URL; used to build the
//                                     per-event RSVP deep link into the portal
//   NEXT_PUBLIC_BASE_PATH / COSMIC_MOUNT_PATH - portal mount path (e.g. /portal)

const WEBFLOW_API = "https://api.webflow.com/v2";

// Field slugs in the Webflow "Events" collection (see data_cms_tool schema).
const FIELD = {
  name: "name",
  slug: "slug",
  start: "start",
  location: "location",
  market: "market",
  virtual: "virtual",
  summary: "summary",
  description: "description",
  rsvpUrl: "rsvp-url",
  portalEventId: "portal-event-id",
} as const;

type Env = {
  WEBFLOW_API_TOKEN?: string;
  WEBFLOW_EVENTS_COLLECTION_ID?: string;
  EMAIL_BASE_URL?: string;
  NEXT_PUBLIC_BASE_PATH?: string;
  COSMIC_MOUNT_PATH?: string;
};

function readEnv(): Env {
  try {
    const { env } = getCloudflareContext() as unknown as { env: Env };
    return env ?? {};
  } catch {
    return {};
  }
}

export function webflowSyncEnabled(): boolean {
  const env = readEnv();
  return !!(env.WEBFLOW_API_TOKEN && env.WEBFLOW_EVENTS_COLLECTION_ID);
}

type EventRow = {
  id: number;
  title: string;
  description: string;
  location: string;
  dma_name: string;
  is_virtual: number;
  meeting_url: string;
  starts_at: number;
  status: string;
  webflow_item_id: string;
  webflow_synced_hash: string;
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event";
}

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Plain-text description -> minimal RichText HTML (paragraphs on blank lines).
function toRichText(text: string): string {
  const blocks = String(text ?? "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks.map((b) => `<p>${esc(b).replace(/\n/g, "<br>")}</p>`).join("");
}

// Absolute deep link into the portal event, or "" if we can't build one.
// Non-members land on sign-in/apply, which is the intended funnel.
function rsvpUrl(id: number, env: Env): string {
  const base = (env.EMAIL_BASE_URL || "").replace(/\/$/, "");
  if (!/^https?:\/\//i.test(base)) return "";
  const mount = (env.NEXT_PUBLIC_BASE_PATH || env.COSMIC_MOUNT_PATH || "").replace(/\/$/, "");
  const withMount = mount && !base.endsWith(mount) ? `${base}${mount}` : base;
  return `${withMount}/events/${id}`;
}

// Stable, dependency-free content hash (FNV-1a) so we only push changed items.
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// The fields we send to Webflow (excludes slug, which is set once at create so
// existing URLs stay stable even if the title is later edited).
function fieldData(e: EventRow, env: Env): Record<string, unknown> {
  const summary = (e.description || "").slice(0, 240).trim();
  return {
    [FIELD.name]: e.title,
    [FIELD.start]: new Date(e.starts_at).toISOString(),
    [FIELD.location]: e.is_virtual === 1 ? "" : e.location || "",
    [FIELD.market]: e.is_virtual === 1 ? "" : e.dma_name || "",
    [FIELD.virtual]: e.is_virtual === 1,
    [FIELD.summary]: summary,
    [FIELD.description]: toRichText(e.description || ""),
    [FIELD.rsvpUrl]: rsvpUrl(e.id, env),
    [FIELD.portalEventId]: e.id,
  };
}

async function wf(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${WEBFLOW_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
      ...(init.headers || {}),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body (e.g. 204) */
  }
  return { ok: res.ok, status: res.status, body };
}

export type SyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  errors: string[];
};

export async function syncEventsToWebflow(): Promise<SyncResult> {
  const result: SyncResult = { ok: true, created: 0, updated: 0, unchanged: 0, removed: 0, errors: [] };
  const env = readEnv();
  const token = env.WEBFLOW_API_TOKEN;
  const collection = env.WEBFLOW_EVENTS_COLLECTION_ID;
  if (!token || !collection) {
    return { ...result, ok: false, skipped: true, reason: "WEBFLOW_API_TOKEN / WEBFLOW_EVENTS_COLLECTION_ID not set" };
  }

  const db = getDb();
  const now = Date.now();

  // Events that should be live on the marketing site: approved and upcoming.
  const { results: desired } = await db
    .prepare(
      `SELECT id, title, description, location, dma_name, is_virtual, meeting_url,
              starts_at, status, webflow_item_id, webflow_synced_hash
       FROM events
       WHERE status = 'approved' AND starts_at > ?
       ORDER BY starts_at ASC`
    )
    .bind(now)
    .all<EventRow>();

  for (const e of desired) {
    const data = fieldData(e, env);
    const h = hash(JSON.stringify(data));
    try {
      if (!e.webflow_item_id) {
        // Create + publish live in one call.
        const slug = `${slugify(e.title)}-${e.id}`;
        const res = await wf(`/collections/${collection}/items/live`, token, {
          method: "POST",
          body: JSON.stringify({ isArchived: false, isDraft: false, fieldData: { ...data, [FIELD.slug]: slug } }),
        });
        const itemId = (res.body as { id?: string } | null)?.id;
        if (!res.ok || !itemId) {
          result.errors.push(`create #${e.id}: ${res.status} ${JSON.stringify(res.body)}`);
          continue;
        }
        await db
          .prepare(`UPDATE events SET webflow_item_id = ?, webflow_slug = ?, webflow_synced_hash = ? WHERE id = ?`)
          .bind(itemId, slug, h, e.id)
          .run();
        result.created++;
      } else if (e.webflow_synced_hash !== h) {
        // Update + publish live (slug intentionally omitted to keep URL stable).
        const res = await wf(`/collections/${collection}/items/${e.webflow_item_id}/live`, token, {
          method: "PATCH",
          body: JSON.stringify({ fieldData: data }),
        });
        if (!res.ok) {
          result.errors.push(`update #${e.id}: ${res.status} ${JSON.stringify(res.body)}`);
          continue;
        }
        await db.prepare(`UPDATE events SET webflow_synced_hash = ? WHERE id = ?`).bind(h, e.id).run();
        result.updated++;
      } else {
        result.unchanged++;
      }
    } catch (err) {
      result.errors.push(`sync #${e.id}: ${String(err)}`);
    }
  }

  // Events that once synced but are no longer approved/upcoming: remove their
  // page from the marketing site and forget the mapping.
  const { results: stale } = await db
    .prepare(
      `SELECT id, webflow_item_id
       FROM events
       WHERE webflow_item_id != '' AND (status != 'approved' OR starts_at <= ?)`
    )
    .bind(now)
    .all<{ id: number; webflow_item_id: string }>();

  for (const s of stale) {
    try {
      const res = await wf(`/collections/${collection}/items/${s.webflow_item_id}/live`, token, { method: "DELETE" });
      // 404 = already gone; treat as success so the mapping is cleared.
      if (!res.ok && res.status !== 404) {
        result.errors.push(`remove #${s.id}: ${res.status} ${JSON.stringify(res.body)}`);
        continue;
      }
      await db.prepare(`UPDATE events SET webflow_item_id = '', webflow_slug = '', webflow_synced_hash = '' WHERE id = ?`).bind(s.id).run();
      result.removed++;
    } catch (err) {
      result.errors.push(`remove #${s.id}: ${String(err)}`);
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
