import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import EventForm from "../event-form";
import type { EventRow, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const db = getDb();
  const ev = await db.prepare("SELECT * FROM events WHERE id = ?").bind(eventId).first<EventRow>();
  if (!ev) notFound();

  const { results: attendees } = await db
    .prepare(
      `SELECT u.id, u.name, u.avatar_key, u.role
       FROM rsvps r JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ?
       ORDER BY u.name COLLATE NOCASE`
    )
    .bind(eventId)
    .all<Partial<User>>();

  return (
    <>
      <p className="meta"><Link href="/admin/events">← Events</Link></p>
      <div className="tag">Admin · Edit event</div>
      <h1 style={{ fontSize: "2.6rem" }}>{ev.title}</h1>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <EventForm
          initial={{
            id: ev.id,
            title: ev.title,
            description: ev.description,
            location: ev.location,
            startsAtMs: ev.starts_at,
            capacity: ev.capacity,
          }}
        />
      </div>

      <h2 style={{ fontSize: "1.6rem", marginTop: "2rem" }}>
        Attendees {attendees.length > 0 ? `· ${attendees.length}` : ""}
      </h2>
      <div className="grid" style={{ marginTop: "0.75rem" }}>
        {attendees.map((a) => (
          <Link key={a.id} href={`/directory/${a.id}`} className="card member-card">
            <div className="member-card-head">
              <Avatar src={a.avatar_key ? mediaUrl(a.avatar_key) : null} name={a.name} size={44} />
              <div>
                <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>{a.name || "Member"}</h3>
                <p className="meta" style={{ margin: 0 }}>{a.role || "—"}</p>
              </div>
            </div>
          </Link>
        ))}
        {attendees.length === 0 && <p className="meta">No RSVPs yet.</p>}
      </div>
    </>
  );
}
