import { getDb } from "./db";

export type FeedbackKind = "bug" | "feature";
export type FeedbackStatus = "open" | "triaged" | "in_progress" | "closed";

// Lightweight triage workflow. "closed" is the resolved/done state.
export const FEEDBACK_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Resolved" },
];

export function feedbackStatusLabel(value: string): string {
  return FEEDBACK_STATUSES.find((s) => s.value === value)?.label ?? "Open";
}

export type FeedbackRow = {
  id: number;
  user_id: number;
  kind: string;
  page: string;
  body: string;
  status: string;
  screenshot_key: string;
  user_agent: string;
  admin_reply: string;
  replied_at: number | null;
  created_at: number;
  author: string | null;
};

const SELECT_COLS =
  "f.id, f.user_id, f.kind, f.page, f.body, f.status, f.screenshot_key, f.user_agent, f.admin_reply, f.replied_at, f.created_at";

export async function createFeedback(
  userId: number,
  kind: FeedbackKind,
  page: string,
  body: string,
  screenshotKey = "",
  userAgent = ""
): Promise<void> {
  await getDb()
    .prepare(
      "INSERT INTO feedback (user_id, kind, page, body, screenshot_key, user_agent, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)"
    )
    .bind(userId, kind, page, body, screenshotKey, userAgent, Date.now())
    .run();
}

// All feedback for admins — active items (anything not resolved) first, newest
// first — with optional status / kind filters.
export async function listFeedback(filter: { status?: string; kind?: string } = {}): Promise<FeedbackRow[]> {
  const conds: string[] = [];
  const binds: string[] = [];
  if (filter.status && filter.status !== "all") { conds.push("f.status = ?"); binds.push(filter.status); }
  if (filter.kind && filter.kind !== "all") { conds.push("f.kind = ?"); binds.push(filter.kind); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const { results } = await getDb()
    .prepare(
      `SELECT ${SELECT_COLS}, u.name AS author
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id
       ${where}
       ORDER BY (f.status = 'closed'), f.created_at DESC
       LIMIT 300`
    )
    .bind(...binds)
    .all<FeedbackRow>();
  return results;
}

// Save an admin reply; returns the tester's user/email/name so the caller can
// notify them. null if the item is gone.
export async function replyToFeedback(id: number, reply: string): Promise<{ user_id: number; email: string; name: string } | null> {
  const db = getDb();
  const rec = await db
    .prepare("SELECT f.user_id, u.email, u.name FROM feedback f JOIN users u ON u.id = f.user_id WHERE f.id = ?")
    .bind(id)
    .first<{ user_id: number; email: string; name: string }>();
  await db.prepare("UPDATE feedback SET admin_reply = ?, replied_at = ? WHERE id = ?").bind(reply, Date.now(), id).run();
  return rec ?? null;
}

// A single tester's own reports.
export async function listUserFeedback(userId: number): Promise<FeedbackRow[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT ${SELECT_COLS}, u.name AS author
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC LIMIT 100`
    )
    .bind(userId)
    .all<FeedbackRow>();
  return results;
}

export async function setFeedbackStatus(id: number, status: FeedbackStatus): Promise<void> {
  await getDb().prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function deleteFeedback(id: number): Promise<void> {
  await getDb().prepare("DELETE FROM feedback WHERE id = ?").bind(id).run();
}

// "Active" = anything an admin still needs to act on (not resolved).
export async function openFeedbackCount(): Promise<number> {
  const row = await getDb().prepare("SELECT COUNT(*) AS n FROM feedback WHERE status != 'closed'").first<{ n: number }>();
  return row?.n ?? 0;
}

// Best-effort, human-readable "Browser on OS" from a user-agent string.
export function friendlyUserAgent(ua: string): string {
  if (!ua) return "";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" :
    /Mac OS X|Macintosh/.test(ua) ? "macOS" :
    /Windows/.test(ua) ? "Windows" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
