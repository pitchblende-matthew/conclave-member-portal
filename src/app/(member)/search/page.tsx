import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import Eyebrow from "@/components/eyebrow";
import Icon from "@/components/icons";

export const dynamic = "force-dynamic";

type MemberHit = { id: number; name: string; role: string; avatar_key: string; company_name: string | null };
type CompanyHit = { id: number; name: string; logo_key: string; industry: string };
type BriefingHit = { id: number; kind: string; title: string; summary: string; url: string };
type TopicHit = { id: number; title: string; category_name: string | null };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, 100);
  const db = getDb();
  const like = `%${q}%`;

  let members: MemberHit[] = [];
  let companies: CompanyHit[] = [];
  let briefings: BriefingHit[] = [];
  let topics: TopicHit[] = [];

  if (q) {
    members = (await db
      .prepare(
        `SELECT u.id, u.name, u.role, u.avatar_key, COALESCE(c.name, NULLIF(u.company,'')) AS company_name
         FROM users u LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.status = 'approved' AND (u.name LIKE ? OR u.role LIKE ? OR u.company LIKE ? OR c.name LIKE ? OR u.bio LIKE ?)
         ORDER BY u.name COLLATE NOCASE LIMIT 8`
      )
      .bind(like, like, like, like, like)
      .all<MemberHit>()).results;

    companies = (await db
      .prepare(
        `SELECT id, name, logo_key, industry FROM companies
         WHERE name LIKE ? OR industry LIKE ? OR description LIKE ?
         ORDER BY name COLLATE NOCASE LIMIT 8`
      )
      .bind(like, like, like)
      .all<CompanyHit>()).results;

    briefings = (await db
      .prepare(
        `SELECT id, kind, title, summary, url FROM briefings
         WHERE published = 1 AND (title LIKE ? OR summary LIKE ?)
         ORDER BY published_at DESC LIMIT 8`
      )
      .bind(like, like)
      .all<BriefingHit>()).results;

    topics = (await db
      .prepare(
        `SELECT t.id, t.title, c.name AS category_name
         FROM topics t LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.title LIKE ?
         ORDER BY t.last_activity_at DESC LIMIT 8`
      )
      .bind(like)
      .all<TopicHit>()).results;
  }

  const total = members.length + companies.length + briefings.length + topics.length;

  return (
    <>
      <Eyebrow icon="search">Search</Eyebrow>
      <h1 style={{ fontSize: "2.6rem" }}>Find <span className="em">anything</span></h1>

      <form className="search-form" method="get" action="/search">
        <span className="search-ico"><Icon name="search" size={18} /></span>
        <input name="q" defaultValue={q} placeholder="Members, companies, briefings, topics…" autoFocus aria-label="Search" />
        <button className="btn inline-btn" type="submit">Search</button>
      </form>

      {q && total === 0 && <p className="meta" style={{ marginTop: "1.5rem" }}>No matches for “{q}”.</p>}

      {members.length > 0 && (
        <section style={{ marginTop: "1.75rem" }}>
          <h2 className="sec-head" style={{ fontSize: "1.4rem" }}><Icon name="members" size={17} />Members</h2>
          <div className="grid" style={{ marginTop: "0.75rem" }}>
            {members.map((m) => (
              <Link key={m.id} href={`/directory/${m.id}`} className="card member-card">
                <div className="member-card-head">
                  <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={44} />
                  <div>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>{m.name || "Member"}</h3>
                    <p className="meta" style={{ margin: 0 }}>{[m.role, m.company_name].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {companies.length > 0 && (
        <section style={{ marginTop: "1.75rem" }}>
          <h2 className="sec-head" style={{ fontSize: "1.4rem" }}><Icon name="companies" size={17} />Companies</h2>
          <div className="grid" style={{ marginTop: "0.75rem" }}>
            {companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="card member-card">
                <div className="member-card-head">
                  <Avatar src={c.logo_key ? mediaUrl(c.logo_key) : null} name={c.name} size={44} />
                  <div>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>{c.name}</h3>
                    <p className="meta" style={{ margin: 0 }}>{c.industry || "—"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {briefings.length > 0 && (
        <section style={{ marginTop: "1.75rem" }}>
          <h2 className="sec-head" style={{ fontSize: "1.4rem" }}><Icon name="briefings" size={17} />Briefings</h2>
          <div style={{ marginTop: "0.75rem" }}>
            {briefings.map((b) =>
              b.kind === "link" ? (
                <a key={b.id} href={b.url} target="_blank" rel="noreferrer" className="card member-card">
                  <h3 style={{ fontSize: "1.2rem", marginBottom: "0.15rem" }}>{b.title} ↗</h3>
                  {b.summary ? <p className="meta" style={{ margin: 0 }}>{b.summary}</p> : null}
                </a>
              ) : (
                <Link key={b.id} href={`/briefings/${b.id}`} className="card member-card">
                  <h3 style={{ fontSize: "1.2rem", marginBottom: "0.15rem" }}>{b.title}</h3>
                  {b.summary ? <p className="meta" style={{ margin: 0 }}>{b.summary}</p> : null}
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section style={{ marginTop: "1.75rem" }}>
          <h2 className="sec-head" style={{ fontSize: "1.4rem" }}><Icon name="board" size={17} />Board topics</h2>
          <div style={{ marginTop: "0.75rem" }}>
            {topics.map((t) => (
              <Link key={t.id} href={`/board/${t.id}`} className="card member-card">
                <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>{t.title}</h3>
                {t.category_name ? <p className="meta" style={{ margin: 0 }}>{t.category_name}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
