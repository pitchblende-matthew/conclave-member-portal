import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import Eyebrow from "@/components/eyebrow";
import EmptyState from "@/components/empty-state";
import LocalTime from "@/components/local-time";

export const dynamic = "force-dynamic";

type Convo = {
  other: number;
  other_name: string;
  other_avatar: string;
  body: string;
  created_at: number;
  sender_id: number;
};

export default async function Messages() {
  const me = await requireUser();
  const db = getDb();

  // Latest message per conversation partner.
  const { results: convos } = await db
    .prepare(
      `SELECT m.sender_id, m.body, m.created_at,
              (CASE WHEN m.sender_id = ?1 THEN m.recipient_id ELSE m.sender_id END) AS other,
              u.name AS other_name, u.avatar_key AS other_avatar
       FROM messages m
       JOIN (
         SELECT (CASE WHEN sender_id = ?1 THEN recipient_id ELSE sender_id END) AS other, MAX(created_at) AS last_at
         FROM messages WHERE sender_id = ?1 OR recipient_id = ?1
         GROUP BY other
       ) g ON g.other = (CASE WHEN m.sender_id = ?1 THEN m.recipient_id ELSE m.sender_id END) AND m.created_at = g.last_at
       JOIN users u ON u.id = (CASE WHEN m.sender_id = ?1 THEN m.recipient_id ELSE m.sender_id END)
       ORDER BY m.created_at DESC`
    )
    .bind(me.id)
    .all<Convo>();

  const { results: unreadRows } = await db
    .prepare("SELECT sender_id AS other, COUNT(*) AS n FROM messages WHERE recipient_id = ? AND read_at IS NULL GROUP BY sender_id")
    .bind(me.id)
    .all<{ other: number; n: number }>();
  const unread = new Map(unreadRows.map((r) => [r.other, r.n]));

  return (
    <>
      <Eyebrow icon="connections">Messages</Eyebrow>
      <h1 style={{ fontSize: "2.6rem" }}>Your <span className="em">messages</span></h1>

      <div style={{ marginTop: "1.5rem" }}>
        {convos.map((c) => {
          const n = unread.get(c.other) ?? 0;
          return (
            <Link key={c.other} href={`/messages/${c.other}`} className="card member-card convo-row">
              <Avatar src={c.other_avatar ? mediaUrl(c.other_avatar) : null} name={c.other_name} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="convo-top">
                  <strong>{c.other_name || "Member"}</strong>
                  <span className="meta convo-time"><LocalTime ms={c.created_at} /></span>
                </div>
                <p className={`convo-snippet${n > 0 ? " unread" : ""}`}>
                  {c.sender_id === me.id ? "You: " : ""}{c.body}
                </p>
              </div>
              {n > 0 ? <span className="badge">{n}</span> : null}
            </Link>
          );
        })}
        {convos.length === 0 && (
          <EmptyState title="No messages yet">
            Message a connection from their profile or your <Link href="/connections">connections</Link>.
          </EmptyState>
        )}
      </div>
    </>
  );
}
