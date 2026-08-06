import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import LocalTime from "@/components/local-time";
import EmptyState from "@/components/empty-state";
import Pager from "@/components/pager";
import { tagsInUse, tagsForItems, tagFilterClause } from "@/lib/content-tags";
import { topicsForSources } from "@/lib/board-announce";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 18;

type Row = Briefing & { category_name: string | null };

export default async function Briefings({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; industry?: string; function?: string; page?: string }>;
}) {
  await requireUser();
  const { category, industry, function: fnParam, page: pageParam } = await searchParams;
  const db = getDb();
  const page = Math.max(1, Number(pageParam) || 1);

  const { results: categories } = await db
    .prepare("SELECT id, name, slug FROM briefing_categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string; slug: string }>();
  const { industries: tagIndustries, functions: tagFunctions } = await tagsInUse("briefing");
  const active = categories.find((c) => c.slug === category) ?? null;
  const activeIndustry = industry ? tagIndustries.find((i) => i.slug === industry) ?? null : null;
  const activeFunction = fnParam ? tagFunctions.find((f) => f.slug === fnParam) ?? null : null;

  const conds: string[] = ["b.published = 1"];
  const binds: (string | number)[] = [];
  if (active) { conds.push("b.category_id = ?"); binds.push(active.id); }
  if (activeIndustry) { const c = tagFilterClause("briefing", "b", "industry", activeIndustry.id); conds.push(c.sql); binds.push(...c.binds); }
  if (activeFunction) { const c = tagFilterClause("briefing", "b", "function", activeFunction.id); conds.push(c.sql); binds.push(...c.binds); }

  const { results: rows } = await db
    .prepare(
      `SELECT b.*, c.name AS category_name
       FROM briefings b LEFT JOIN briefing_categories c ON c.id = b.category_id
       WHERE ${conds.join(" AND ")}
       ORDER BY b.published_at DESC, b.id DESC LIMIT ? OFFSET ?`
    )
    .bind(...binds, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<Row>();
  const hasNext = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);
  const tagMap = await tagsForItems("briefing", results.map((r) => r.id));
  const threadMap = await topicsForSources("briefing", results.map((r) => r.id));
  const pagerParams: Record<string, string> = {};
  if (active) pagerParams.category = active.slug;
  if (activeIndustry) pagerParams.industry = activeIndustry.slug;
  if (activeFunction) pagerParams.function = activeFunction.slug;

  const buildHref = (over: { category?: string | null; industry?: string | null; function?: string | null }) => {
    const sp = new URLSearchParams();
    const cat = over.category === undefined ? active?.slug : over.category;
    const ind = over.industry === undefined ? activeIndustry?.slug : over.industry;
    const fn = over.function === undefined ? activeFunction?.slug : over.function;
    if (cat) sp.set("category", cat);
    if (ind) sp.set("industry", ind);
    if (fn) sp.set("function", fn);
    const s = sp.toString();
    return s ? `/briefings?${s}` : "/briefings";
  };

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon="briefings">Briefings</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>What we&apos;re <span className="em">reading</span></h1>
        </div>
        <Link href="/briefings/submit" className="btn inline-btn">Submit a briefing</Link>
      </div>
      <p className="meta">Notes, essays, and links worth your time — curated for the network.</p>

      <nav className="chip-row" style={{ marginTop: "1.25rem" }}>
        <Link href={buildHref({ category: null })} className={`chip${!active ? " chip-active" : ""}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={buildHref({ category: c.slug })} className={`chip${active?.slug === c.slug ? " chip-active" : ""}`}>
            {c.name}
          </Link>
        ))}
      </nav>
      {tagIndustries.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by industry">
          {tagIndustries.map((i) => (
            <Link key={i.id} href={buildHref({ industry: activeIndustry?.slug === i.slug ? null : i.slug })} className={`chip${activeIndustry?.slug === i.slug ? " chip-active" : ""}`}>{i.name}</Link>
          ))}
        </nav>
      )}
      {tagFunctions.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by function">
          {tagFunctions.map((f) => (
            <Link key={f.id} href={buildHref({ function: activeFunction?.slug === f.slug ? null : f.slug })} className={`chip${activeFunction?.slug === f.slug ? " chip-active" : ""}`}>{f.name}</Link>
          ))}
        </nav>
      )}

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {results.map((b) => {
          const isLink = b.kind === "link";
          const cover = b.cover_key ? mediaUrl(b.cover_key) : (b.cover_url || null);
          const inner = (
            <>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="briefing-cover" />
              ) : null}
              <div className="briefing-body">
                <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span className="market-tag">{isLink ? "Link ↗" : "Article"}</span>
                  {b.category_name ? <span className="chip chip-static">{b.category_name}</span> : null}
                </span>
                <h3 style={{ fontSize: "1.4rem", margin: "0.5rem 0 0.25rem" }}>{b.title}</h3>
                {b.summary ? <p className="meta" style={{ margin: 0 }}>{b.summary}</p> : null}
                {tagMap.get(b.id)?.length ? (
                  <div className="content-tags">
                    {tagMap.get(b.id)!.map((name, k) => <span key={k} className="market-tag">{name}</span>)}
                  </div>
                ) : null}
                <p className="meta" style={{ marginTop: "0.6rem", fontSize: "0.78rem" }}>
                  {b.published_at ? <LocalTime ms={b.published_at} /> : ""}
                </p>
              </div>
            </>
          );
          const threadId = threadMap.get(b.id);
          const card = isLink ? (
            <a href={b.url} target="_blank" rel="noreferrer" className="card briefing-card">
              {inner}
            </a>
          ) : (
            <Link href={`/briefings/${b.id}`} className="card briefing-card">
              {inner}
            </Link>
          );
          return (
            <div key={b.id} style={{ display: "flex", flexDirection: "column" }}>
              {card}
              {threadId ? (
                <Link href={`/board/${threadId}`} className="meta" style={{ marginTop: "0.5rem", fontSize: "0.8rem", textDecoration: "none" }}>
                  💬 Discuss on the board →
                </Link>
              ) : null}
            </div>
          );
        })}
        {results.length === 0 && (
          <EmptyState title={active ? "Nothing in this category yet" : "No briefings yet"}>
            <Link href="/briefings/submit">Submit one for review →</Link>
          </EmptyState>
        )}
      </div>
      <Pager page={page} hasNext={hasNext} basePath="/briefings" params={pagerParams} />
    </>
  );
}
