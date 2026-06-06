import { getDb } from "./db";

export type ConnState = "self" | "none" | "outgoing" | "incoming" | "connected";

// The connection state between the viewer and another member.
export async function connectionState(meId: number, otherId: number): Promise<ConnState> {
  if (meId === otherId) return "self";
  const row = await getDb()
    .prepare(
      `SELECT requester_id, status FROM connections
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .bind(meId, otherId, otherId, meId)
    .first<{ requester_id: number; status: string }>();
  if (!row) return "none";
  if (row.status === "accepted") return "connected";
  return row.requester_id === meId ? "outgoing" : "incoming";
}

// Connection state for many members at once (for the directory list).
export async function connectionStates(meId: number, ids: number[]): Promise<Map<number, ConnState>> {
  const out = new Map<number, ConnState>();
  if (ids.length === 0) return out;
  const { results } = await getDb()
    .prepare(
      `SELECT requester_id, addressee_id, status FROM connections
       WHERE requester_id = ? OR addressee_id = ?`
    )
    .bind(meId, meId)
    .all<{ requester_id: number; addressee_id: number; status: string }>();
  for (const r of results) {
    const other = r.requester_id === meId ? r.addressee_id : r.requester_id;
    out.set(other, r.status === "accepted" ? "connected" : r.requester_id === meId ? "outgoing" : "incoming");
  }
  return out;
}

export async function connectionCounts(meId: number): Promise<{ connections: number; pendingIncoming: number }> {
  const c = await getDb()
    .prepare("SELECT COUNT(*) AS n FROM connections WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)")
    .bind(meId, meId)
    .first<{ n: number }>();
  const p = await getDb()
    .prepare("SELECT COUNT(*) AS n FROM connections WHERE status = 'pending' AND addressee_id = ?")
    .bind(meId)
    .first<{ n: number }>();
  return { connections: c?.n ?? 0, pendingIncoming: p?.n ?? 0 };
}
