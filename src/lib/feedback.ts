import { getDb } from "./db";

export type FeedbackKind = "bug" | "feature";

export type FeedbackRow = {
  id: number;
  user_id: number;
  kind: string;
  page: string;
  body: string;
  status: string;
  screenshot_key: string;
  created_at: number;
  author: string | null;
};

export async function createFeedback(userId: number, kind: FeedbackKind, page: string, body: string, screenshotKey = ""): Promise<void> {
  await getDb()
    .prepare("INSERT INTO feedback (user_id, kind, page, body, screenshot_key, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)")
    .bind(userId, kind, page, body, screenshotKey, Date.now())
    .run();
}

// Open items first, then newest.
export async function listFeedback(): Promise<FeedbackRow[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT f.id, f.user_id, f.kind, f.page, f.body, f.status, f.screenshot_key, f.created_at, u.name AS author
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id
       ORDER BY (f.status = 'open') DESC, f.created_at DESC
       LIMIT 300`
    )
    .all<FeedbackRow>();
  return results;
}

export async function setFeedbackStatus(id: number, status: "open" | "closed"): Promise<void> {
  await getDb().prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function deleteFeedback(id: number): Promise<void> {
  await getDb().prepare("DELETE FROM feedback WHERE id = ?").bind(id).run();
}

export async function openFeedbackCount(): Promise<number> {
  const row = await getDb().prepare("SELECT COUNT(*) AS n FROM feedback WHERE status = 'open'").first<{ n: number }>();
  return row?.n ?? 0;
}
