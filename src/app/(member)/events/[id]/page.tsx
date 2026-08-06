import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { tagsForItems } from "@/lib/content-tags";
import { myFlags } from "@/lib/engagement";
import { googleCalendarUrl } from "@/lib/ics";
import LocalTime from "@/components/local-time";
import Avatar from "@/components/avatar";
import BookmarkButton from "@/components/bookmark-button";
import type { EventRow } from "@/lib/types";
import { topicForSource } from "@/lib/board-announce";
import { toggleRsvp } from "../actions";

export const dynamic = "force-dynamic";

type Attendee = { id: number; name: string; role: string; avatar_key: string; company_name: string | null };

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  const user = await requireUser();
  const db = getDb();

  const ev = await db
    .prepare(
      `SELECT e.*, u.name AS host_name
       FROM events e LEFT JOIN users u ON u.id = e.submitted_by
       WHERE e.id = ?`
    )
    .bind(eventId)
    .first<EventRow & { host_name: string | null }>();
  if (!ev) notFound();
  // Pending/declined events are visible only to admins and their submitter.
  if (ev.status !== "approved" && user.is_admin !== 1 && ev.submitted_by !== user.id) notFound();

  const { results: attendees } = await db
    .prepare(
      `SELECT u.id, u.name, u.role, u.avatar_key,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM rsvps r JOIN users u ON u.id = r.user_id
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE r.event_id = ? AND u.status = 'approved'
       ORDER BY u.name COLLATE NOCASE`
    )
    .bind(eventId)
    .all<Attendee>();

  const isGoing = attendees.some((a) => a.id === user.id);
  const tags = (await tagsForItems("event", [eventId])).get(eventId) ?? [];
  const saved = (await myFlags(user.id, "save", "event", [eventId])).has(eventId);
  const threadId = await topicForSource("event", eventId);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const path = `/events/${eventId}`;

  return (
    <article style={{ maxWidth: 720, margin: "0 auto" }}>
      <p className="meta"><Link href="/events">← Events</Link></p>

      <div className="tag">
        <LocalTime ms={ev.starts_at} />
        {ev.location ? ` · ${ev.location}` : ""}
        {ev.is_virtual === 1 ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>Virtual</span> : null}
        {ev.dma_name ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{ev.dma_name}</span> : null}
        {ev.status !== "approved" ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{ev.status}</span> : null}
      </div>

      <h1 style={{ fontSize: "2.6rem", margin: "0.4rem 0 0.4rem" }}>{ev.title}</h1>
      {ev.host_name ? <p className="meta" style={{ marginTop: 0 }}>Hosted by {ev.host_name}</p> : null}

      {ev.description ? <p style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>{ev.description}</p> : null}

      <p className="card-detail">
        {attendees.length} attending{ev.capacity ? ` · ${ev.capacity} seats` : ""}
      </p>

      {tags.length ? (
        <div className="content-tags">
          {tags.map((name, k) => <span key={k} className="market-tag">{name}</span>)}
        </div>
      ) : null}

      <div className="btn-row" style={{ marginTop: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <form action={toggleRsvp}>
          <input type="hidden" name="eventId" value={ev.id} />
          <button className={`btn inline-btn ${isGoing ? "btn-ghost" : ""}`} type="submit">
            {isGoing ? "Cancel RSVP" : "RSVP"}
          </button>
        </form>
        {isGoing && ev.is_virtual === 1 && ev.meeting_url ? (
          <a className="btn inline-btn" href={ev.meeting_url} target="_blank" rel="noreferrer">Join online ↗</a>
        ) : null}
        <a className="btn btn-ghost inline-btn" href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
        <a className="btn btn-ghost inline-btn" href={`${base}${path}/ics`}>Download .ics</a>
        <BookmarkButton contentType="event" contentId={ev.id} saved={saved} path={path} />
        {threadId ? <Link href={`/board/${threadId}`} className="btn btn-ghost inline-btn">Discuss on the board →</Link> : null}
      </div>

      <h2 style={{ fontSize: "1.4rem", marginTop: "2rem" }}>
        Who&apos;s going{attendees.length ? ` · ${attendees.length}` : ""}
      </h2>
      {attendees.length === 0 ? (
        <p className="meta">No RSVPs yet — be the first.</p>
      ) : (
        <div className="grid" style={{ marginTop: "0.75rem" }}>
          {attendees.map((a) => (
            <Link key={a.id} href={`/directory/${a.id}`} className="card member-card">
              <div className="member-card-head">
                <Avatar src={a.avatar_key ? mediaUrl(a.avatar_key) : null} name={a.name} size={44} />
                <div>
                  <strong>{a.name || "Member"}</strong>
                  <p className="meta" style={{ margin: 0 }}>
                    {[a.role, a.company_name].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
