import { getDb } from "./db";

export type Kind = "react" | "save";
export type CType = "briefing" | "post" | "topic" | "event";

// Toggle a reaction/bookmark on/off. Returns the new state (true = on).
export async function toggleUserContent(userId: number, kind: Kind, type: CType, id: number): Promise<boolean> {
  const db = getDb();
  const existing = await db
    .prepare("SELECT 1 FROM user_content WHERE user_id = ? AND kind = ? AND content_type = ? AND content_id = ?")
    .bind(userId, kind, type, id)
    .first();
  if (existing) {
    await db
      .prepare("DELETE FROM user_content WHERE user_id = ? AND kind = ? AND content_type = ? AND content_id = ?")
      .bind(userId, kind, type, id)
      .run();
    return false;
  }
  await db
    .prepare("INSERT OR IGNORE INTO user_content (user_id, kind, content_type, content_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, kind, type, id, Date.now())
    .run();
  return true;
}

// Reaction counts for a set of items of one type.
export async function reactionCounts(type: CType, ids: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!ids.length) return map;
  const ph = ids.map(() => "?").join(",");
  const { results } = await getDb()
    .prepare(`SELECT content_id AS id, COUNT(*) AS n FROM user_content WHERE kind = 'react' AND content_type = ? AND content_id IN (${ph}) GROUP BY content_id`)
    .bind(type, ...ids)
    .all<{ id: number; n: number }>();
  for (const r of results) map.set(r.id, r.n);
  return map;
}

// Which of these ids the viewer has flagged (react or save).
export async function myFlags(userId: number, kind: Kind, type: CType, ids: number[]): Promise<Set<number>> {
  const set = new Set<number>();
  if (!ids.length) return set;
  const ph = ids.map(() => "?").join(",");
  const { results } = await getDb()
    .prepare(`SELECT content_id AS id FROM user_content WHERE user_id = ? AND kind = ? AND content_type = ? AND content_id IN (${ph})`)
    .bind(userId, kind, type, ...ids)
    .all<{ id: number }>();
  for (const r of results) set.add(r.id);
  return set;
}

export type SavedItem = { type: CType; id: number; title: string; meta: string; href: string; external?: boolean };

// Everything the viewer has bookmarked, newest first, resolved for display.
export async function savedItems(userId: number): Promise<SavedItem[]> {
  const db = getDb();
  const { results: rows } = await db
    .prepare("SELECT content_type, content_id, created_at FROM user_content WHERE user_id = ? AND kind = 'save' ORDER BY created_at DESC LIMIT 200")
    .bind(userId)
    .all<{ content_type: string; content_id: number; created_at: number }>();
  if (!rows.length) return [];

  const byType = (t: string) => rows.filter((r) => r.content_type === t).map((r) => r.content_id);
  const briefingIds = byType("briefing");
  const topicIds = byType("topic");
  const eventIds = byType("event");

  const fetchIn = async <T,>(sql: string, ids: number[]): Promise<T[]> => {
    if (!ids.length) return [];
    const ph = ids.map(() => "?").join(",");
    return (await db.prepare(sql.replace("{ph}", ph)).bind(...ids).all<T>()).results;
  };

  const briefings = await fetchIn<{ id: number; title: string; kind: string; url: string; summary: string }>(
    "SELECT id, title, kind, url, summary FROM briefings WHERE published = 1 AND id IN ({ph})",
    briefingIds
  );
  const topics = await fetchIn<{ id: number; title: string; category_name: string | null }>(
    "SELECT t.id, t.title, c.name AS category_name FROM topics t LEFT JOIN categories c ON c.id = t.category_id WHERE t.id IN ({ph})",
    topicIds
  );
  const events = await fetchIn<{ id: number; title: string; starts_at: number; location: string }>(
    "SELECT id, title, starts_at, location FROM events WHERE id IN ({ph})",
    eventIds
  );

  const bMap = new Map(briefings.map((b) => [b.id, b]));
  const tMap = new Map(topics.map((t) => [t.id, t]));
  const eMap = new Map(events.map((e) => [e.id, e]));

  const out: SavedItem[] = [];
  for (const r of rows) {
    if (r.content_type === "briefing") {
      const b = bMap.get(r.content_id);
      if (b) out.push({ type: "briefing", id: b.id, title: b.title, meta: b.summary || (b.kind === "link" ? "Link" : "Article"), href: b.kind === "link" ? b.url : `/briefings/${b.id}`, external: b.kind === "link" });
    } else if (r.content_type === "topic") {
      const t = tMap.get(r.content_id);
      if (t) out.push({ type: "topic", id: t.id, title: t.title, meta: t.category_name ? `Board · ${t.category_name}` : "Board", href: `/board/${t.id}` });
    } else if (r.content_type === "event") {
      const e = eMap.get(r.content_id);
      if (e) out.push({ type: "event", id: e.id, title: e.title, meta: e.location || "Event", href: "/events" });
    }
  }
  return out;
}
