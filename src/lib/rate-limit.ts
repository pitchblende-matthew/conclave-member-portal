import { getDb } from "./db";

// Sliding-window rate limiter backed by D1. Returns true when the action should
// be BLOCKED (the caller is over the limit). Best-effort: on any DB error it
// fails open (returns false) so a hiccup never locks members out.
export async function rateLimited(bucket: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const db = getDb();
    const now = Date.now();
    const since = now - windowMs;
    // Prune this bucket's stale events, then count what's left in the window.
    await db.prepare("DELETE FROM rate_events WHERE bucket = ? AND created_at < ?").bind(bucket, since).run();
    const row = await db
      .prepare("SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ? AND created_at >= ?")
      .bind(bucket, since)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= max) return true;
    await db.prepare("INSERT INTO rate_events (bucket, created_at) VALUES (?, ?)").bind(bucket, now).run();
    return false;
  } catch {
    return false;
  }
}
