import { getDb } from "./db";

// When an event or briefing is added, open a board topic for it so members can
// discuss. Authored by the "Conclave" system account (see migration 0042).
// Idempotent — one thread per source — and best-effort: any failure here is
// logged and swallowed so it never breaks the primary action (creating the
// event/briefing).

const SYSTEM_EMAIL = "conclave-system@jointheconclave.com";

// Board category each source type files its threads under (see migration 0043).
const CATEGORY_SLUG: Record<"event" | "briefing", string> = { event: "events", briefing: "briefings" };

async function systemUserId(db: D1Database): Promise<number | null> {
  const row = await db.prepare("SELECT id FROM users WHERE email = ?").bind(SYSTEM_EMAIL).first<{ id: number }>();
  return row?.id ?? null;
}

async function categoryId(db: D1Database, slug: string): Promise<number> {
  const row = await db.prepare("SELECT id FROM categories WHERE slug = ?").bind(slug).first<{ id: number }>();
  return row?.id ?? 0;
}

// The board topic that was opened for a given event/briefing, if any. Used to
// link the source back to its discussion thread.
export async function topicForSource(sourceType: "event" | "briefing", sourceId: number): Promise<number | null> {
  if (!sourceId) return null;
  try {
    const row = await getDb()
      .prepare("SELECT id FROM topics WHERE source_type = ? AND source_id = ?")
      .bind(sourceType, sourceId)
      .first<{ id: number }>();
    return row?.id ?? null;
  } catch {
    return null;
  }
}

async function announce(sourceType: "event" | "briefing", sourceId: number, title: string, body: string): Promise<void> {
  try {
    if (!sourceId) return;
    const db = getDb();
    // One thread per source.
    const existing = await db
      .prepare("SELECT id FROM topics WHERE source_type = ? AND source_id = ?")
      .bind(sourceType, sourceId)
      .first<{ id: number }>();
    if (existing) return;
    // No system account yet (e.g. before migration 0042 has run) — skip quietly.
    const sys = await systemUserId(db);
    if (!sys) return;

    const now = Date.now();
    const catId = await categoryId(db, CATEGORY_SLUG[sourceType]);
    const res = await db
      .prepare(
        "INSERT INTO topics (title, category_id, dma_slug, dma_name, created_by, created_at, last_activity_at, source_type, source_id) VALUES (?, ?, '', '', ?, ?, ?, ?, ?)"
      )
      .bind(title, catId, sys, now, now, sourceType, sourceId)
      .run();
    const topicId = Number(res.meta.last_row_id);
    await db
      .prepare("INSERT INTO posts (topic_id, user_id, body, created_at) VALUES (?, ?, ?, ?)")
      .bind(topicId, sys, body, now)
      .run();
  } catch (err) {
    console.error(`[board-announce] failed for ${sourceType} ${sourceId}:`, err);
  }
}

export async function announceEvent(id: number, e: { title: string; description?: string }): Promise<void> {
  const intro = (e.description ?? "").trim() || "A new gathering has been added to the calendar.";
  const body = `${intro}\n\nThis event is now on the Conclave calendar — RSVP on the Events page and let everyone know if you're planning to come.`;
  await announce("event", id, `New event · ${e.title}`, body);
}

export async function announceBriefing(id: number, b: { title: string; summary?: string; url?: string }): Promise<void> {
  const parts = [(b.summary ?? "").trim() || "A new briefing has been shared."];
  if (b.url) parts.push(b.url);
  parts.push("Worth a read — what stood out to you?");
  await announce("briefing", id, `New briefing · ${b.title}`, parts.join("\n\n"));
}
