import { getDb } from "./db";

// Total unread direct messages for the bell/nav badge.
export async function unreadMessageCount(meId: number): Promise<number> {
  const row = await getDb()
    .prepare("SELECT COUNT(*) AS n FROM messages WHERE recipient_id = ? AND read_at IS NULL")
    .bind(meId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
