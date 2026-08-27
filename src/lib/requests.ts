import { getDb } from "./db";

// Asks & Offers — a member give/get board. An "ask" is a need; an "offer" is
// help on tap. Both share one table, discriminated by `kind`.

export const REQUEST_CATEGORIES = [
  { slug: "intro", label: "Intro" },
  { slug: "advice", label: "Advice" },
  { slug: "hiring", label: "Hiring / talent" },
  { slug: "vendor", label: "Vendor / recommendation" },
  { slug: "capital", label: "Capital / funding" },
  { slug: "partnership", label: "Partnership" },
  { slug: "other", label: "Other" },
] as const;

export function categoryLabel(slug: string): string {
  return REQUEST_CATEGORIES.find((c) => c.slug === slug)?.label ?? "Other";
}

export type RequestKind = "ask" | "offer";

export type Request = {
  id: number;
  kind: string;
  user_id: number;
  title: string;
  body: string;
  category: string;
  status: string;
  created_at: number;
  updated_at: number;
};

export type RequestRow = Request & { author: string | null; avatar_key: string | null; responses: number };

export type RequestResponse = {
  id: number;
  request_id: number;
  user_id: number;
  body: string;
  created_at: number;
  author: string | null;
  avatar_key: string | null;
};

// Listing with optional filters. `kind`/`category` narrow the set; by default
// open posts come first (newest), with resolved ones after.
export async function listRequests(opts: { kind?: RequestKind | null; category?: string | null; includeResolved?: boolean } = {}): Promise<RequestRow[]> {
  const conds: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.kind) { conds.push("r.kind = ?"); binds.push(opts.kind); }
  if (opts.category) { conds.push("r.category = ?"); binds.push(opts.category); }
  if (!opts.includeResolved) conds.push("r.status = 'open'");
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const { results } = await getDb()
    .prepare(
      `SELECT r.*, u.name AS author, u.avatar_key,
              (SELECT COUNT(*) FROM request_responses rr WHERE rr.request_id = r.id) AS responses
       FROM requests r LEFT JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY (r.status = 'open') DESC, r.created_at DESC`
    )
    .bind(...binds)
    .all<RequestRow>();
  return results;
}

export async function getRequest(id: number): Promise<RequestRow | null> {
  return await getDb()
    .prepare(
      `SELECT r.*, u.name AS author, u.avatar_key,
              (SELECT COUNT(*) FROM request_responses rr WHERE rr.request_id = r.id) AS responses
       FROM requests r LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`
    )
    .bind(id)
    .first<RequestRow>();
}

export async function getResponses(requestId: number): Promise<RequestResponse[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT rr.*, u.name AS author, u.avatar_key
       FROM request_responses rr LEFT JOIN users u ON u.id = rr.user_id
       WHERE rr.request_id = ?
       ORDER BY rr.created_at ASC`
    )
    .bind(requestId)
    .all<RequestResponse>();
  return results;
}

export async function insertRequest(d: { kind: RequestKind; userId: number; title: string; body: string; category: string }): Promise<number> {
  const now = Date.now();
  const res = await getDb()
    .prepare(
      `INSERT INTO requests (kind, user_id, title, body, category, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`
    )
    .bind(d.kind, d.userId, d.title, d.body, d.category, now, now)
    .run();
  return Number(res.meta.last_row_id);
}

export async function insertResponse(requestId: number, userId: number, body: string): Promise<void> {
  await getDb()
    .prepare("INSERT INTO request_responses (request_id, user_id, body, created_at) VALUES (?, ?, ?, ?)")
    .bind(requestId, userId, body, Date.now())
    .run();
  await getDb().prepare("UPDATE requests SET updated_at = ? WHERE id = ?").bind(Date.now(), requestId).run();
}

export async function setRequestStatus(id: number, status: "open" | "resolved"): Promise<void> {
  await getDb().prepare("UPDATE requests SET status = ?, updated_at = ? WHERE id = ?").bind(status, Date.now(), id).run();
}

export async function removeRequest(id: number): Promise<void> {
  const db = getDb();
  await db.prepare("DELETE FROM request_responses WHERE request_id = ?").bind(id).run();
  await db.prepare("DELETE FROM requests WHERE id = ?").bind(id).run();
}
