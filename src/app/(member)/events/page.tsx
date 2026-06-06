import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { marketsIn, resolveArea } from "@/lib/region";
import AreaFilter from "@/components/area-filter";
import EmptyState from "@/components/empty-state";
import LocalTime from "@/components/local-time";
import type { EventRow } from "@/lib/types";
import { toggleRsvp } from "./actions";

export const dynamic = "force-dynamic";

export default async function Events({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const user = await requireUser();
  const db = getDb();
  const { area } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("events");

  // Only approved events are shown. When filtering to a market, still include
  // network-wide and virtual events.
  const { results: events } = await db
    .prepare(
      `SELECT * FROM events
       WHERE status = 'approved'${active ? " AND (dma_slug = ? OR dma_slug = '' OR is_virtual = 1)" : ""}
       ORDER BY starts_at ASC`
    )
    .bind(...(active ? [active] : []))
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
      <div className="topline">
        <div>
          <Eyebrow icon="events">Events</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>What&apos;s happening</h1>
        </div>
        <Link href="/events/submit" className="btn inline-btn">Submit an event</Link>
      </div>

      <AreaFilter
        basePath="/events"
        active={active}
        myDma={user.dma_slug ? { slug: user.dma_slug, name: user.dma_name } : null}
        markets={markets}
        label="events"
      />

      <div style={{ marginTop: "1.5rem" }}>
        {events.map((ev) => {
          const isGoing = going.has(ev.id);
          const attending = countMap.get(ev.id) ?? 0;
          return (
            <div key={ev.id} className="card">
              <div className="tag">
<LocalTime ms={ev.starts_at} mode="date" />{ev.location ? ` · ${ev.location}` : ""}
                {ev.is_virtual === 1 ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>Virtual</span> : null}
                {ev.dma_name ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{ev.dma_name}</span> : null}
              </div>
              <h3 style={{ fontSize: "1.7rem" }}>{ev.title}</h3>
              <p>{ev.description}</p>
              <p className="meta">
                {attending} attending{ev.capacity ? ` · ${ev.capacity} seats` : ""}
              </p>
              <div className="btn-row">
                <form action={toggleRsvp}>
                  <input type="hidden" name="eventId" value={ev.id} />
                  <button className={`btn inline-btn ${isGoing ? "btn-ghost" : ""}`} type="submit">
                    {isGoing ? "Cancel RSVP" : "RSVP"}
                  </button>
                </form>
                {isGoing && ev.is_virtual === 1 && ev.meeting_url ? (
                  <a className="btn inline-btn" href={ev.meeting_url} target="_blank" rel="noreferrer">Join online ↗</a>
                ) : null}
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <EmptyState title="No events scheduled yet">
            <Link href="/events/submit">Submit one for review →</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
