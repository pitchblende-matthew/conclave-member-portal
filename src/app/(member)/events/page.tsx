import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { marketsIn, resolveArea } from "@/lib/region";
import { tagsInUse, tagsForItems, tagFilterClause } from "@/lib/content-tags";
import AreaFilter from "@/components/area-filter";
import EmptyState from "@/components/empty-state";
import LocalTime from "@/components/local-time";
import BookmarkButton from "@/components/bookmark-button";
import { myFlags } from "@/lib/engagement";
import type { EventRow } from "@/lib/types";
import { toggleRsvp } from "./actions";

export const dynamic = "force-dynamic";

export default async function Events({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; industry?: string; function?: string }>;
}) {
  const user = await requireUser();
  const db = getDb();
  const { area, industry, function: fnParam } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("events");
  const { industries: tagIndustries, functions: tagFunctions } = await tagsInUse("event");
  const activeIndustry = industry ? tagIndustries.find((i) => i.slug === industry) ?? null : null;
  const activeFunction = fnParam ? tagFunctions.find((f) => f.slug === fnParam) ?? null : null;

  // Only approved events are shown. When filtering to a market, still include
  // network-wide and virtual events.
  const conds: string[] = ["status = 'approved'"];
  const binds: (string | number)[] = [];
  if (active) { conds.push("(dma_slug = ? OR dma_slug = '' OR is_virtual = 1)"); binds.push(active); }
  if (activeIndustry) { const c = tagFilterClause("event", "events", "industry", activeIndustry.id); conds.push(c.sql); binds.push(...c.binds); }
  if (activeFunction) { const c = tagFilterClause("event", "events", "function", activeFunction.id); conds.push(c.sql); binds.push(...c.binds); }

  const { results: events } = await db
    .prepare(`SELECT * FROM events WHERE ${conds.join(" AND ")} ORDER BY starts_at ASC`)
    .bind(...binds)
    .all<EventRow>();
  const tagMap = await tagsForItems("event", events.map((e) => e.id));
  const savedEvents = await myFlags(user.id, "save", "event", events.map((e) => e.id));

  // Industry/function chip links preserve the active market + other tag.
  const tagHref = (over: { industry?: string | null; function?: string | null }) => {
    const sp = new URLSearchParams();
    if (area) sp.set("area", area);
    const ind = over.industry === undefined ? activeIndustry?.slug : over.industry;
    const fn = over.function === undefined ? activeFunction?.slug : over.function;
    if (ind) sp.set("industry", ind);
    if (fn) sp.set("function", fn);
    const s = sp.toString();
    return s ? `/events?${s}` : "/events";
  };

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
        hidden={{
          ...(activeIndustry ? { industry: activeIndustry.slug } : {}),
          ...(activeFunction ? { function: activeFunction.slug } : {}),
        }}
      />

      {tagIndustries.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by industry">
          {tagIndustries.map((i) => (
            <Link key={i.id} href={tagHref({ industry: activeIndustry?.slug === i.slug ? null : i.slug })} className={`chip${activeIndustry?.slug === i.slug ? " chip-active" : ""}`}>{i.name}</Link>
          ))}
        </nav>
      )}
      {tagFunctions.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by function">
          {tagFunctions.map((f) => (
            <Link key={f.id} href={tagHref({ function: activeFunction?.slug === f.slug ? null : f.slug })} className={`chip${activeFunction?.slug === f.slug ? " chip-active" : ""}`}>{f.name}</Link>
          ))}
        </nav>
      )}

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
              <h3 style={{ fontSize: "1.7rem", margin: "0.4rem 0 0.5rem" }}>{ev.title}</h3>
              <p style={{ margin: "0 0 0.65rem" }}>{ev.description}</p>
              <p className="card-detail">
                {attending} attending{ev.capacity ? ` · ${ev.capacity} seats` : ""}
              </p>
              {tagMap.get(ev.id)?.length ? (
                <div className="content-tags">
                  {tagMap.get(ev.id)!.map((name, k) => <span key={k} className="market-tag">{name}</span>)}
                </div>
              ) : null}
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
                <BookmarkButton contentType="event" contentId={ev.id} saved={savedEvents.has(ev.id)} path="/events" />
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
