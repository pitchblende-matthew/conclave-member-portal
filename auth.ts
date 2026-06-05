import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { EventRow } from "@/lib/types";
import { toggleRsvp } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString("en-US", {
      weekday: "short", month: "long", day: "numeric", year: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function Events() {
  const user = await requireUser();
  const db = getDb();

  const { results: events } = await db
    .prepare("SELECT * FROM events ORDER BY starts_at ASC")
    .all<EventRow>();

  const { results: myRsvps } = await db
    .prepare("SELECT event_id FROM rsvps WHERE user_id = ?")
    .bind(user.id)
    .all<{ event_id: number }>();
  const going = new Set(myRsvps.map((r) => r.event_id));

  const counts = await db
    .prepare("SELECT event_id, COUNT(*) AS n FROM rsvps GROUP BY event_id")
    .all<{ event_id: number; n: number }>();
  const countMap = new Map(counts.results.map((c) => [c.event_id, c.n]));

  return (
    <>
      <div className="tag">Events</div>
      <h1 style={{ fontSize: "2.6rem" }}>What&apos;s happening</h1>
      <div style={{ marginTop: "1.5rem" }}>
        {events.map((ev) => {
          const isGoing = going.has(ev.id);
          const attending = countMap.get(ev.id) ?? 0;
          return (
            <div key={ev.id} className="card">
              <div className="tag">{formatDate(ev.starts_at)} · {ev.location}</div>
              <h3 style={{ fontSize: "1.7rem" }}>{ev.title}</h3>
              <p>{ev.description}</p>
              <p className="meta">
                {attending} attending{ev.capacity ? ` · ${ev.capacity} seats` : ""}
              </p>
              <form action={toggleRsvp}>
                <input type="hidden" name="eventId" value={ev.id} />
                <button className={`btn inline-btn ${isGoing ? "btn-ghost" : ""}`} type="submit">
                  {isGoing ? "Cancel RSVP" : "RSVP"}
                </button>
              </form>
            </div>
          );
        })}
        {events.length === 0 && <p className="meta">No events scheduled yet.</p>}
      </div>
    </>
  );
}
