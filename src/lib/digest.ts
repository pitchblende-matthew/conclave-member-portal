import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { emailEnabled, emailWeeklyDigest, siteUrl } from "./email";

const DAY = 86400000;
const WEEK = 7 * DAY;
const MIN_GAP = 3.5 * DAY; // don't re-send within this window unless forced

function digestSecret(): string {
  try {
    const { env } = getCloudflareContext() as unknown as { env: { DIGEST_SECRET?: string } };
    return env?.DIGEST_SECRET || "";
  } catch {
    return "";
  }
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stable per-member token for one-click unsubscribe links (low-stakes: the only
// thing it gates is opting out of a digest). Uses DIGEST_SECRET when set.
export async function unsubToken(userId: number): Promise<string> {
  return (await sha256hex(`${userId}.conclave-digest.${digestSecret()}`)).slice(0, 24);
}

export async function unsubscribeUrl(userId: number): Promise<string> {
  const token = await unsubToken(userId);
  return siteUrl(`/api/digest/unsubscribe?u=${userId}&t=${token}`);
}

async function getSetting(key: string): Promise<string | null> {
  const row = await getDb().prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}
async function setSetting(key: string, value: string): Promise<void> {
  await getDb()
    .prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, value)
    .run();
}

export async function lastDigestAt(): Promise<number | null> {
  const v = await getSetting("last_digest_at");
  return v ? Number(v) : null;
}

export type DigestData = {
  members: { id: number; name: string; role: string }[];
  events: { id: number; title: string; starts_at: number }[];
  topics: { id: number; title: string; replies: number }[];
  briefings: { id: number; title: string; kind: string; url: string }[];
  listings: { id: number; kind: string; title: string }[];
  empty: boolean;
};

// Shared digest content: what's happened/coming up across the network.
export async function buildDigest(): Promise<DigestData> {
  const db = getDb();
  const now = Date.now();
  const weekAgo = now - WEEK;
  const [members, events, topics, briefings, listings] = await Promise.all([
    db.prepare("SELECT id, name, role FROM users WHERE status='approved' AND name != '' AND created_at>=? ORDER BY created_at DESC LIMIT 8").bind(weekAgo).all<{ id: number; name: string; role: string }>(),
    db.prepare("SELECT id, title, starts_at FROM events WHERE status='approved' AND starts_at>? AND starts_at<? ORDER BY starts_at ASC LIMIT 5").bind(now, now + 3 * WEEK).all<{ id: number; title: string; starts_at: number }>(),
    db.prepare("SELECT id, title, (SELECT COUNT(*) FROM posts p WHERE p.topic_id=t.id)-1 AS replies FROM topics t WHERE last_activity_at>=? ORDER BY last_activity_at DESC LIMIT 5").bind(weekAgo).all<{ id: number; title: string; replies: number }>(),
    db.prepare("SELECT id, title, kind, url FROM briefings WHERE published=1 AND published_at>=? ORDER BY published_at DESC LIMIT 5").bind(weekAgo).all<{ id: number; title: string; kind: string; url: string }>(),
    db.prepare("SELECT id, kind, title FROM listings WHERE status='open' AND created_at>=? ORDER BY created_at DESC LIMIT 5").bind(weekAgo).all<{ id: number; kind: string; title: string }>(),
  ]);
  const data: DigestData = {
    members: members.results,
    events: events.results,
    topics: topics.results,
    briefings: briefings.results,
    listings: listings.results,
    empty: false,
  };
  data.empty = !data.members.length && !data.events.length && !data.topics.length && !data.briefings.length && !data.listings.length;
  return data;
}

async function recipients(): Promise<{ id: number; email: string; name: string }[]> {
  const { results } = await getDb()
    .prepare("SELECT id, email, name FROM users WHERE status='approved' AND onboarded=1 AND digest_opt_out=0 AND email != ''")
    .all<{ id: number; email: string; name: string }>();
  return results;
}

export type DigestResult = { sent: number } | { skipped: string } | { error: string };

// Build and send the weekly digest to every eligible member. Guarded against
// double-sends; `force` bypasses the gap + empty-content checks (admin button).
export async function sendWeeklyDigest({ force = false }: { force?: boolean } = {}): Promise<DigestResult> {
  if (!emailEnabled()) return { error: "Email isn't configured (set RESEND_API_KEY and EMAIL_FROM)." };

  const last = await lastDigestAt();
  if (!force && last && Date.now() - last < MIN_GAP) return { skipped: "A digest was already sent in the last few days." };

  const data = await buildDigest();
  if (!force && data.empty) return { skipped: "Nothing new to send this week." };

  const tos = await recipients();
  let sent = 0;
  for (const r of tos) {
    await emailWeeklyDigest(r.email, r.name, data, await unsubscribeUrl(r.id));
    sent += 1;
  }
  await setSetting("last_digest_at", String(Date.now()));
  return { sent };
}

// Verify an unsubscribe link and opt the member out.
export async function applyUnsubscribe(userId: number, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  const expected = await unsubToken(userId);
  if (token !== expected) return false;
  await getDb().prepare("UPDATE users SET digest_opt_out=1 WHERE id=?").bind(userId).run();
  return true;
}
