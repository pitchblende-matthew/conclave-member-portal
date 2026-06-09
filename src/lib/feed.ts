import { getDb } from "./db";
import type { IconName } from "@/components/icons";

export type FeedItem = {
  icon: IconName;
  text: string;
  href: string;
  created_at: number;
  external?: boolean;
};

// A merged, time-sorted feed of recent network activity. Each source is queried
// separately and combined in JS (no compound SELECT — D1 limits UNION terms).
export async function networkFeed(viewerId: number, limit = 12): Promise<FeedItem[]> {
  const db = getDb();
  const [members, topics, events, briefings, listings] = await Promise.all([
    db.prepare("SELECT id, name, created_at FROM users WHERE status='approved' AND name != '' AND id != ? ORDER BY created_at DESC LIMIT 8")
      .bind(viewerId).all<{ id: number; name: string; created_at: number }>(),
    db.prepare(`SELECT t.id, t.title, t.created_at, u.name AS author
                FROM topics t LEFT JOIN users u ON u.id = t.created_by
                ORDER BY t.created_at DESC LIMIT 8`).all<{ id: number; title: string; created_at: number; author: string | null }>(),
    db.prepare("SELECT id, title, created_at FROM events WHERE status='approved' ORDER BY created_at DESC LIMIT 5")
      .all<{ id: number; title: string; created_at: number }>(),
    db.prepare("SELECT id, title, kind, url, created_at FROM briefings WHERE published=1 ORDER BY published_at DESC, id DESC LIMIT 4")
      .all<{ id: number; title: string; kind: string; url: string; created_at: number }>(),
    db.prepare("SELECT id, kind, title, created_at FROM listings WHERE status='open' ORDER BY created_at DESC LIMIT 5")
      .all<{ id: number; kind: string; title: string; created_at: number }>(),
  ]);

  const items: FeedItem[] = [];
  for (const m of members.results) items.push({ icon: "members", text: `${m.name} joined`, href: `/directory/${m.id}`, created_at: m.created_at });
  for (const t of topics.results) items.push({ icon: "board", text: `${t.author || "A member"} started “${t.title}”`, href: `/board/${t.id}`, created_at: t.created_at });
  for (const e of events.results) items.push({ icon: "events", text: `New event · ${e.title}`, href: `/events/${e.id}`, created_at: e.created_at });
  for (const b of briefings.results) items.push({ icon: "briefings", text: `New briefing · ${b.title}`, href: b.kind === "link" ? b.url : `/briefings/${b.id}`, created_at: b.created_at, external: b.kind === "link" });
  for (const l of listings.results) items.push({ icon: l.kind === "job" ? "briefcase" : "store", text: `${l.kind === "job" ? "New job" : "Business for sale"} · ${l.title}`, href: `/${l.kind === "job" ? "jobs" : "businesses"}/${l.id}`, created_at: l.created_at });

  items.sort((a, b) => b.created_at - a.created_at);
  return items.slice(0, limit);
}
