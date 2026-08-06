import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { announceBriefing } from "./board-announce";

// Pull published pitchblende.net Insights posts into the portal's briefings as
// 'link' entries, so new posts appear automatically. Pitchblende's Webflow CMS
// is the source of truth; this is one-way and insert-only, keyed by the post
// URL — existing briefings are never modified or removed, so any admin curation
// (edits, unpublishing) sticks. Mirrors the 0034 / 0040 seed mappings.
//
// Everything is env-gated: with no token configured the sync no-ops.
//
// Required env (set on Webflow Cloud):
//   PITCHBLENDE_WEBFLOW_TOKEN  - Webflow API token with READ access to the
//                                pitchblende.net site. Falls back to
//                                WEBFLOW_API_TOKEN if that token can read it
//                                (e.g. a workspace-scoped token).
//   WEBFLOW_SYNC_SECRET        - guards the /api/briefings/sync endpoint.
// Optional:
//   PITCHBLENDE_INSIGHTS_COLLECTION_ID - override the "Blog Posts" collection id.

const WEBFLOW_API = "https://api.webflow.com/v2";
const INSIGHTS_COLLECTION = "6a162febea119994996bd4a3"; // pitchblende "Blog Posts"
const CATEGORIES_COLLECTION = "6a162fdbf7d0e4721c681b9e"; // pitchblende "Categories"
const INSIGHTS_BASE = "https://www.pitchblende.net/insights/";

type Env = {
  WEBFLOW_API_TOKEN?: string;
  PITCHBLENDE_WEBFLOW_TOKEN?: string;
  PITCHBLENDE_INSIGHTS_COLLECTION_ID?: string;
};

function readEnv(): Env {
  try {
    const { env } = getCloudflareContext() as unknown as { env: Env };
    return env ?? {};
  } catch {
    return {};
  }
}

function readToken(env: Env): string {
  return env.PITCHBLENDE_WEBFLOW_TOKEN || env.WEBFLOW_API_TOKEN || "";
}

export function briefingsSyncEnabled(): boolean {
  return !!readToken(readEnv());
}

// Map a Pitchblende category name to the closest portal briefing topic, same
// spirit as the 0034 backfill (Brand & Growth + Performance Marketing ->
// Marketing; SEO & AI -> Technology; Company News -> Leadership). Keyword-based
// so new categories still land somewhere sensible.
function topicForCategory(name: string): string {
  const n = (name || "").toLowerCase();
  if (/(seo|ai|tech|search|answer engine|automation|analytics)/.test(n)) return "technology";
  if (/(news|hiring|company|leadership|team|culture)/.test(n)) return "leadership";
  return "marketing";
}

type WfItem = { id: string; isArchived?: boolean; isDraft?: boolean; lastPublished?: string; fieldData?: Record<string, unknown> };

async function wfGet(path: string, token: string): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${WEBFLOW_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, body };
}

// Fetch every published item in a collection, following pagination.
async function fetchAllLiveItems(collection: string, token: string): Promise<WfItem[]> {
  const items: WfItem[] = [];
  let offset = 0;
  for (;;) {
    const r = await wfGet(`/collections/${collection}/items/live?limit=100&offset=${offset}`, token);
    if (!r.ok) throw new Error(`items ${r.status}: ${JSON.stringify(r.body)}`);
    const page: WfItem[] = r.body?.items ?? [];
    items.push(...page);
    const total: number = r.body?.pagination?.total ?? items.length;
    offset += page.length;
    if (page.length === 0 || items.length >= total) break;
  }
  return items;
}

export type BriefingsSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  created: number;
  existing: number;
  errors: string[];
};

export async function syncBriefingsFromPitchblende(): Promise<BriefingsSyncResult> {
  const result: BriefingsSyncResult = { ok: true, created: 0, existing: 0, errors: [] };
  const env = readEnv();
  const token = readToken(env);
  if (!token) {
    return { ...result, ok: false, skipped: true, reason: "PITCHBLENDE_WEBFLOW_TOKEN / WEBFLOW_API_TOKEN not set" };
  }
  const collection = env.PITCHBLENDE_INSIGHTS_COLLECTION_ID || INSIGHTS_COLLECTION;
  const db = getDb();

  // portal topic slug -> briefing_categories.id
  const { results: cats } = await db.prepare(`SELECT id, slug FROM briefing_categories`).all<{ id: number; slug: string }>();
  const topicId = new Map(cats.map((c) => [c.slug, c.id]));

  // pitchblende category item id -> name (best-effort; defaults to Marketing)
  const catName = new Map<string, string>();
  try {
    for (const c of await fetchAllLiveItems(CATEGORIES_COLLECTION, token)) {
      catName.set(c.id, String(c.fieldData?.name ?? ""));
    }
  } catch (e) {
    result.errors.push(`categories: ${String(e)}`);
  }

  let posts: WfItem[];
  try {
    posts = await fetchAllLiveItems(collection, token);
  } catch (e) {
    return { ...result, ok: false, reason: `insights fetch failed: ${String(e)}`, errors: [String(e)] };
  }

  for (const p of posts) {
    try {
      if (p.isArchived || p.isDraft) continue;
      const fd = p.fieldData ?? {};
      const slug = typeof fd.slug === "string" ? fd.slug : "";
      if (!slug) continue;
      const url = `${INSIGHTS_BASE}${slug}`;

      const exists = await db.prepare(`SELECT 1 FROM briefings WHERE url = ? LIMIT 1`).bind(url).first();
      if (exists) {
        result.existing++;
        continue;
      }

      const topic = topicForCategory(catName.get(String(fd.category ?? "")) ?? "");
      const categoryId = topicId.get(topic) ?? topicId.get("marketing") ?? 0;
      const image = fd["featured-image"];
      const cover = image && typeof image === "object" ? String((image as { url?: string }).url ?? "") : "";
      const pub = typeof fd["publish-date"] === "string" ? Date.parse(fd["publish-date"] as string) : NaN;
      const publishedAt = Number.isNaN(pub) ? (p.lastPublished ? Date.parse(p.lastPublished) : Date.now()) : pub;
      const now = Date.now();

      const title = String(fd.name ?? slug);
      const summary = typeof fd.excerpt === "string" ? fd.excerpt : "";
      const ins = await db
        .prepare(
          `INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
           VALUES ('link', ?, ?, '', ?, '', ?, NULL, 1, ?, 'approved', NULL, ?, ?, ?)`
        )
        .bind(title, summary, url, cover, Number.isNaN(publishedAt) ? now : publishedAt, categoryId, now, now)
        .run();
      result.created++;
      // Open a discussion thread for the newly imported post.
      await announceBriefing(Number(ins.meta.last_row_id), { title, summary, url });
    } catch (e) {
      result.errors.push(`post ${String(p?.fieldData?.slug ?? p?.id)}: ${String(e)}`);
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
