import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import LocalTime from "@/components/local-time";
import { deleteEvent, approveEvent, declineEvent } from "./actions";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEvents() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const db = getDb();
  const { results: events } = await db
    .prepare("SELECT * FROM events WHERE status = 'approved' ORDER BY starts_at ASC")
    .all<EventRow>();
  const { results: pending } = await db
    .prepare(
      `SELECT e.*, u.name AS submitter
       FROM events e LEFT JOIN users u ON u.id = e.submitted_by
       WHERE e.status = 'pending' ORDER BY e.created_at ASC`
    )
    .all<EventRow & { submitter: string | null }>();
  const counts = await db
    .prepare("SELECT event_id, COUNT(*) AS n FROM rsvps GROUP BY event_id")
    .all<{ event_id: number; n: number }>();
  const countMap = new Map(counts.results.map((c) => [c.event_id, c.n]));

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="topline">
        <div>
          <div className="tag">Admin · Events</div>
          <h1 style={{ fontSize: "2.6rem" }}>Manage events</h1>
        </div>
        <Link href="/admin/events/new" className="btn inline-btn">New event</Link>
      </div>

      {pending.length > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Pending submissions <span className="badge">{pending.length}</span></h2>
          {pending.map((ev) => (
            <div key={ev.id} className="card">
              <div className="tag"><LocalTime ms={ev.starts_at} mode="datetimeLong" />{ev.location ? ` · ${ev.location}` : ""}{ev.is_virtual ? " · Virtual" : ""}</div>
              <h3 style={{ fontSize: "1.5rem" }}>{ev.title}</h3>
              <p className="meta">Submitted by {ev.submitter || "a member"}{ev.dma_name ? ` · ${ev.dma_name}` : ""}</p>
              {ev.description ? <p>{ev.description}</p> : null}
              <div className="btn-row">
                <form action={approveEvent}>
                  <input type="hidden" name="eventId" value={ev.id} />
                  <button className="btn inline-btn" type="submit">Approve</button>
                </form>
                <Link href={`/admin/events/${ev.id}`} className="btn btn-ghost inline-btn">Edit first</Link>
                <form action={declineEvent}>
                  <input type="hidden" name="eventId" value={ev.id} />
                  <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Decline "${ev.title}"?`}>Decline</ConfirmSubmit>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        {pending.length > 0 && <h2 style={{ fontSize: "1.5rem" }}>On the calendar</h2>}
        {events.map((ev) => (
          <div key={ev.id} className="card">
            <div className="tag"><LocalTime ms={ev.starts_at} mode="datetimeLong" />{ev.location ? ` · ${ev.location}` : ""}{ev.is_virtual ? " · Virtual" : ""}</div>
            <h3 style={{ fontSize: "1.5rem" }}>{ev.title}</h3>
            <p className="meta">
              {(countMap.get(ev.id) ?? 0)} attending{ev.capacity ? ` · ${ev.capacity} seats` : ""}
            </p>
            <div className="btn-row">
              <Link href={`/admin/events/${ev.id}`} className="btn btn-ghost inline-btn">Edit &amp; attendees</Link>
              <form action={deleteEvent}>
                <input type="hidden" name="eventId" value={ev.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${ev.title}"? This removes its RSVPs too.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="meta">No events yet. Create the first one.</p>}
      </div>
    </>
  );
}
