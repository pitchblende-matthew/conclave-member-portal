import { getDb } from "./db";

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "topic_reply"
  | "message"
  | "content_reported"
  | "invite_request"
  | "event_submitted"
  | "event_approved"
  | "event_declined"
  | "briefing_submitted"
  | "briefing_approved"
  | "briefing_declined";

// Insert a notification for `userId`. No-ops if there's no recipient or the
// recipient is the actor (you never get notified about your own actions).
export async function notify(
  userId: number | null | undefined,
  type: NotificationType,
  opts: { actorId?: number; topicId?: number; postId?: number } = {}
): Promise<void> {
  if (!userId || userId === opts.actorId) return;
  await getDb()
    .prepare(
      "INSERT INTO notifications (user_id, type, actor_id, topic_id, post_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(userId, type, opts.actorId ?? null, opts.topicId ?? null, opts.postId ?? null, Date.now())
    .run();
}

// Notify every admin (except the actor) — used when a submission needs review.
export async function notifyAdmins(type: NotificationType, opts: { actorId?: number } = {}): Promise<void> {
  const { results } = await getDb()
    .prepare("SELECT id FROM users WHERE is_admin = 1")
    .all<{ id: number }>();
  for (const a of results) {
    await notify(a.id, type, opts);
  }
}
