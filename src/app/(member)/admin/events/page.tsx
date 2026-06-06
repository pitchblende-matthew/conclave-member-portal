import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { deleteEvent } from "./actions";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString("en-US", {
      weekday: "short", month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", timeZone: "UTC",
    }) + " UTC";
  } catch {
    return "";
  }
}

export default async function AdminEvents() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const db = getDb();
  const { results: events } = await db.prepare("SELECT * FROM events ORDER BY starts_at ASC").all<EventRow>();
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

      <div style={{ marginTop: "1.5rem" }}>
        {events.map((ev) => (
          <div key={ev.id} className="card">
            <div className="tag">{formatDate(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ""}{ev.is_virtual ? " · Virtual" : ""}</div>
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
