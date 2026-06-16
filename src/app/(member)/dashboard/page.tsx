import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { connectionCounts } from "@/lib/connections";
import { suggestedMembers } from "@/lib/suggestions";
import { networkFeed } from "@/lib/feed";
import Icon from "@/components/icons";
import Eyebrow from "@/components/eyebrow";
import SectionDivider from "@/components/section-divider";
import SuggestedMemberCard from "@/components/suggested-member-card";
import LocalTime from "@/components/local-time";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const db = getDb();
  const now = Date.now();
  const hasDma = !!user.dma_slug;
  const one = async (sql: string, ...binds: (string | number)[]) =>
    (await db.prepare(sql).bind(...binds).first<{ n: number }>())?.n ?? 0;

  // Your market (or the whole network if location isn't set yet).
  const marketMembers = hasDma
    ? await one("SELECT COUNT(*) AS n FROM users WHERE status='approved' AND dma_slug=?", user.dma_slug)
    : await one("SELECT COUNT(*) AS n FROM users WHERE status='approved'");
  const marketCompanies = hasDma
    ? await one("SELECT COUNT(*) AS n FROM companies WHERE dma_slug=?", user.dma_slug)
    : await one("SELECT COUNT(*) AS n FROM companies");
  const marketEvents = hasDma
    ? await one("SELECT COUNT(*) AS n FROM events WHERE starts_at>? AND status='approved' AND (dma_slug=? OR is_virtual=1)", now, user.dma_slug)
    : await one("SELECT COUNT(*) AS n FROM events WHERE starts_at>? AND status='approved'", now);

  // Your upcoming RSVPs.
  const { results: myEvents } = await db
    .prepare(
      `SELECT e.id, e.title, e.starts_at, e.is_virtual, e.location, e.dma_name
       FROM rsvps r JOIN events e ON e.id = r.event_id
       WHERE r.user_id = ? AND e.starts_at > ?
       ORDER BY e.starts_at ASC LIMIT 4`
    )
    .bind(user.id, now)
    .all<{ id: number; title: string; starts_at: number; is_virtual: number; location: string; dma_name: string }>();

  const { connections, pendingIncoming } = await connectionCounts(user.id);

  // Latest briefings.
  const { results: briefings } = await db
    .prepare("SELECT * FROM briefings WHERE published = 1 ORDER BY published_at DESC, id DESC LIMIT 3")
    .all<Briefing>();

  // Recent board activity, weighted to your area (your-market + network-wide topics).
  const { results: topics } = await db
    .prepare(
      `SELECT t.id, t.title, t.last_activity_at, t.dma_name,
              c.name AS category_name,
              (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) - 1 AS replies
       FROM topics t LEFT JOIN categories c ON c.id = t.category_id
       ${hasDma ? "WHERE t.dma_slug = ? OR t.dma_slug = ''" : ""}
       ORDER BY t.last_activity_at DESC LIMIT 5`
    )
    .bind(...(hasDma ? [user.dma_slug] : []))
    .all<{ id: number; title: string; last_activity_at: number; dma_name: string; category_name: string | null; replies: number }>();

  const marketLabel = hasDma ? user.dma_name : "the network";
  const suggestions = await suggestedMembers(user, 4);
  const feed = await networkFeed(user.id, 12);

  // Activation checklist — the first actions that turn a new member into an
  // active one (and that power matching). Hidden once everything's done.
  const rsvpCount = await one("SELECT COUNT(*) AS n FROM rsvps WHERE user_id = ?", user.id);
  const steps = [
    { label: "Add a profile photo", done: !!user.avatar_key, href: "/profile" },
    { label: "Write a short bio", done: !!user.bio, href: "/profile" },
    { label: "Set your market", done: !!user.dma_slug, href: "/profile" },
    { label: "Make your first connection", done: connections > 0, href: "/discover" },
    { label: "RSVP to an event", done: rsvpCount > 0, href: "/events" },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const activated = stepsDone === steps.length;

  return (
    <>
      <div className="dash-hero">
        <Eyebrow icon="dashboard">Member dashboard</Eyebrow>
        <h1 style={{ fontSize: "2.6rem", marginBottom: "0.35rem" }}>
          Welcome{user.name ? <>, <span className="em">{user.name}</span></> : ""}.
        </h1>
        <p className="meta" style={{ maxWidth: 600 }}>
          {hasDma ? (
            <>Your market is <strong>{user.dma_name}</strong>. Here&apos;s what&apos;s near you.</>
          ) : (
            <>Add your City / State / ZIP in your <Link href="/profile">profile</Link> to localize everything to your media market.</>
          )}
        </p>
      </div>

      {!activated && (
        <section className="card getstarted" style={{ marginTop: "1.5rem" }}>
          <div className="topline">
            <h2 className="sec-head" style={{ fontSize: "1.4rem", margin: 0 }}><Icon name="sparkle" size={18} />Get started</h2>
            <span className="meta">{stepsDone} of {steps.length} done</span>
          </div>
          <div className="gs-bar"><span className="gs-fill" style={{ width: `${(stepsDone / steps.length) * 100}%` }} /></div>
          <div className="checklist">
            {steps.map((s) =>
              s.done ? (
                <div key={s.label} className="check-item done">
                  <span className="check-mark">✓</span>
                  <span className="check-label">{s.label}</span>
                </div>
              ) : (
                <Link key={s.label} href={s.href} className="check-item">
                  <span className="check-mark" aria-hidden />
                  <span className="check-label">{s.label}</span>
                  <span className="check-go">Do it →</span>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* Market snapshot */}
      <div className="grid" style={{ marginTop: "1.5rem" }}>
        <Link href={hasDma ? `/directory?area=${user.dma_slug}` : "/directory"} className="card member-card stat-card">
          <div className="topline"><span className="card-ico"><Icon name="members" size={20} /></span><span className="stat">{marketMembers}</span></div>
          <div className="tag" style={{ marginTop: "0.5rem" }}>Members</div>
          <p className="meta" style={{ margin: 0 }}>in {marketLabel}</p>
        </Link>
        <Link href={hasDma ? `/companies?area=${user.dma_slug}` : "/companies"} className="card member-card stat-card">
          <div className="topline"><span className="card-ico"><Icon name="companies" size={20} /></span><span className="stat">{marketCompanies}</span></div>
          <div className="tag" style={{ marginTop: "0.5rem" }}>Companies</div>
          <p className="meta" style={{ margin: 0 }}>in {marketLabel}</p>
        </Link>
        <Link href={hasDma ? `/events?area=${user.dma_slug}` : "/events"} className="card member-card stat-card">
          <div className="topline"><span className="card-ico"><Icon name="events" size={20} /></span><span className="stat">{marketEvents}</span></div>
          <div className="tag" style={{ marginTop: "0.5rem" }}>Upcoming events</div>
          <p className="meta" style={{ margin: 0 }}>near you &amp; virtual</p>
        </Link>
        <Link href="/connections" className="card member-card stat-card">
          <div className="topline"><span className="card-ico"><Icon name="connections" size={20} /></span><span className="stat">{connections}</span></div>
          <div className="tag" style={{ marginTop: "0.5rem" }}>Connections</div>
          <p className="meta" style={{ margin: 0 }}>
            {pendingIncoming > 0 ? <strong>{pendingIncoming} request{pendingIncoming === 1 ? "" : "s"} waiting</strong> : "mutual connections"}
          </p>
        </Link>
      </div>

      {suggestions.length > 0 && (
        <>
          <SectionDivider />
          <section>
            <div className="topline">
              <h2 className="sec-head" style={{ fontSize: "1.5rem" }}><Icon name="connections" size={18} />Members you should meet</h2>
              <Link href="/discover" className="meta">See more →</Link>
            </div>
            <div className="suggest-grid">
              {suggestions.map((m) => <SuggestedMemberCard key={m.id} m={m} />)}
            </div>
          </section>
        </>
      )}

      <SectionDivider />
      <section>
        <div className="topline">
          <h2 className="sec-head" style={{ fontSize: "1.5rem" }}><Icon name="sparkle" size={18} />Around the network</h2>
        </div>
        <div className="card feed" style={{ marginTop: "0.75rem" }}>
          {feed.map((f, i) => {
            const inner = (
              <>
                <span className="feed-ico"><Icon name={f.icon} size={15} /></span>
                <span className="feed-text">{f.text}</span>
                <span className="feed-time"><LocalTime ms={f.created_at} mode="date" /></span>
              </>
            );
            return f.external ? (
              <a key={i} href={f.href} target="_blank" rel="noreferrer" className="feed-item">{inner}</a>
            ) : (
              <Link key={i} href={f.href} className="feed-item">{inner}</Link>
            );
          })}
          {feed.length === 0 && <p className="meta" style={{ margin: "0.5rem" }}>Quiet so far — start a discussion or RSVP to an event to get things going.</p>}
        </div>
      </section>

      <SectionDivider />

      <div className="dash-cols">
        {/* Your events */}
        <section className="card">
          <div className="topline">
            <h2 className="sec-head" style={{ fontSize: "1.5rem" }}><Icon name="events" size={18} />Your events</h2>
            <Link href="/events" className="meta">All events →</Link>
          </div>
          {myEvents.length > 0 ? (
            <ul className="dash-list">
              {myEvents.map((e) => (
                <li key={e.id}>
                  <span className="dash-date"><LocalTime ms={e.starts_at} mode="dayshort" /></span>
                  <span className="dash-title">
                    {e.title}
                    {e.is_virtual ? <span className="market-tag" style={{ marginLeft: "0.5rem" }}>Virtual</span> : e.dma_name ? <span className="market-tag" style={{ marginLeft: "0.5rem" }}>{e.dma_name}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta">No upcoming RSVPs. <Link href="/events">Find an event →</Link></p>
          )}
        </section>

        {/* Board activity */}
        <section className="card">
          <div className="topline">
            <h2 className="sec-head" style={{ fontSize: "1.5rem" }}><Icon name="board" size={18} />From the board</h2>
            <Link href="/board" className="meta">Open board →</Link>
          </div>
          {topics.length > 0 ? (
            <ul className="dash-list">
              {topics.map((t) => (
                <li key={t.id}>
                  <Link href={`/board/${t.id}`} className="dash-row">
                    <span className="dash-title">
                      {t.title}
                      {t.dma_name ? <span className="market-tag" style={{ marginLeft: "0.5rem" }}>{t.dma_name}</span> : null}
                    </span>
                    <span className="dash-sub">
                      {t.category_name ? `${t.category_name} · ` : ""}{Math.max(0, t.replies)} repl{t.replies === 1 ? "y" : "ies"} · <LocalTime ms={t.last_activity_at} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta">No discussions yet. <Link href="/board/new">Start one →</Link></p>
          )}
        </section>
      </div>

      <SectionDivider />

      {/* Latest briefings */}
      <section style={{ marginTop: "0.5rem" }}>
        <div className="topline">
          <h2 className="sec-head" style={{ fontSize: "1.5rem" }}><Icon name="briefings" size={18} />Latest briefings</h2>
          <Link href="/briefings" className="meta">All briefings →</Link>
        </div>
        <div className="grid" style={{ marginTop: "0.75rem" }}>
          {briefings.map((b) => {
            const cover = b.cover_key ? mediaUrl(b.cover_key) : (b.cover_url || null);
            const inner = (
              <>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="briefing-cover" />
                ) : null}
                <div className="briefing-body">
                  <span className="market-tag">{b.kind === "link" ? "Link ↗" : "Article"}</span>
                  <h3 style={{ fontSize: "1.25rem", margin: "0.4rem 0 0.2rem" }}>{b.title}</h3>
                  {b.summary ? <p className="meta" style={{ margin: 0 }}>{b.summary}</p> : null}
                </div>
              </>
            );
            return b.kind === "link" ? (
              <a key={b.id} href={b.url} target="_blank" rel="noreferrer" className="card briefing-card">{inner}</a>
            ) : (
              <Link key={b.id} href={`/briefings/${b.id}`} className="card briefing-card">{inner}</Link>
            );
          })}
          {briefings.length === 0 && <p className="meta">No briefings yet.</p>}
        </div>
      </section>
    </>
  );
}
