import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { connectionState } from "@/lib/connections";
import Avatar from "@/components/avatar";
import LocalTime from "@/components/local-time";
import MessageComposer from "./composer";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const other = Number(id);
  const me = await requireUser();
  if (!other || other === me.id) redirect("/messages");

  // Messaging is connections-only.
  if ((await connectionState(me.id, other)) !== "connected") redirect(`/directory/${other}`);

  const db = getDb();
  const peer = await db.prepare("SELECT id, name, avatar_key FROM users WHERE id = ?").bind(other).first<{ id: number; name: string; avatar_key: string }>();
  if (!peer) notFound();

  // Opening the thread marks their messages (and matching notifications) read.
  const now = Date.now();
  await db.prepare("UPDATE messages SET read_at = ? WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL").bind(now, me.id, other).run();
  await db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND actor_id = ? AND type = 'message' AND read_at IS NULL").bind(now, me.id, other).run();

  const { results: messages } = await db
    .prepare(
      `SELECT * FROM messages
       WHERE (sender_id = ?1 AND recipient_id = ?2) OR (sender_id = ?2 AND recipient_id = ?1)
       ORDER BY created_at ASC`
    )
    .bind(me.id, other)
    .all<Message>();

  return (
    <>
      <p className="meta"><Link href="/messages">← Messages</Link></p>
      <div className="topline" style={{ alignItems: "center" }}>
        <Link href={`/directory/${peer.id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit" }}>
          <Avatar src={peer.avatar_key ? mediaUrl(peer.avatar_key) : null} name={peer.name} size={44} />
          <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{peer.name || "Member"}</h1>
        </Link>
      </div>

      <div className="msg-thread">
        {messages.map((m) => (
          <div key={m.id} className={`msg-bubble${m.sender_id === me.id ? " mine" : ""}`}>
            <span className="msg-body">{m.body}</span>
            <span className="msg-time"><LocalTime ms={m.created_at} /></span>
          </div>
        ))}
        {messages.length === 0 && <p className="meta">No messages yet — say hello.</p>}
      </div>

      <MessageComposer otherId={other} />
    </>
  );
}
