import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import LocalTime from "@/components/local-time";
import EmptyState from "@/components/empty-state";
import Pager from "@/components/pager";
import { tagsInUse, tagsForItems, tagFilterClause } from "@/lib/content-tags";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

// A stable, muted accent colour per category for the topic-card strip.
const ACCENTS = ["#6e7a5e", "#a08442", "#9c6b4f", "#4f7a6e", "#5f7085", "#7a5f70"];
function accentFor(slug: string | null): string {
  if (!slug) return "var(--line)";
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

type TopicRow = {
  id: number;
  title: string;
  last_activity_at: number;
  author: string | null;
  category_name: string | null;
  category_slug: string | null;
  dma_name: string | null;
  reply_count: number;
};

export default async function Board({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; scope?: string; industry?: string; function?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { category, scope, industry, function: fnParam, page: pageParam } = await searchParams;
  const db = getDb();
  const page = Math.max(1, Number(pageParam) || 1);

  const { results: categories } = await db
    .prepare("SELECT id, name, slug FROM categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string; slug: string }>();
  const { industries: tagIndustries, functions: tagFunctions } = await tagsInUse("topic");

  const active = categories.find((c) => c.slug === category) ?? null;
  const scopeMine = scope === "mine" && !!user.dma_slug;
  const activeIndustry = industry ? tagIndustries.find((i) => i.slug === industry) ?? null : null;
  const activeFunction = fnParam ? tagFunctions.find((f) => f.slug === fnParam) ?? null : null;

  // Build the filter from whichever of category / area scope / tags are active.
  const conds: string[] = [];
  const binds: (string | number)[] = [];
  if (active) { conds.push("t.category_id = ?"); binds.push(active.id); }
  if (scopeMine) { conds.push("t.dma_slug = ?"); binds.push(user.dma_slug); }
  if (activeIndustry) { const c = tagFilterClause("topic", "t", "industry", activeIndustry.id); conds.push(c.sql); binds.push(...c.binds); }
  if (activeFunction) { const c = tagFilterClause("topic", "t", "function", activeFunction.id); conds.push(c.sql); binds.push(...c.binds); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const { results: rows } = await db
    .prepare(
      `SELECT t.id, t.title, t.last_activity_at, t.dma_name,
              a.name AS author,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) AS reply_count
       FROM topics t
       LEFT JOIN users a ON a.id = t.created_by
       LEFT JOIN categories c ON c.id = t.category_id
       ${where}
       ORDER BY t.last_activity_at DESC LIMIT ? OFFSET ?`
    )
    .bind(...binds, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<TopicRow>();
  const hasNext = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);
  const tagMap = await tagsForItems("topic", results.map((r) => r.id));
  const pagerParams: Record<string, string> = {};
  if (active) pagerParams.category = active.slug;
  if (scopeMine) pagerParams.scope = "mine";
  if (activeIndustry) pagerParams.industry = activeIndustry.slug;
  if (activeFunction) pagerParams.function = activeFunction.slug;

  // Links that preserve the other active filters.
  const href = (next: { category?: string | null; scope?: string | null; industry?: string | null; function?: string | null }) => {
    const sp = new URLSearchParams();
    const cat = next.category === undefined ? active?.slug : next.category;
    const sc = next.scope === undefined ? (scopeMine ? "mine" : null) : next.scope;
    const ind = next.industry === undefined ? activeIndustry?.slug : next.industry;
    const fn = next.function === undefined ? activeFunction?.slug : next.function;
    if (cat) sp.set("category", cat);
    if (sc) sp.set("scope", sc);
    if (ind) sp.set("industry", ind);
    if (fn) sp.set("function", fn);
    const s = sp.toString();
    return s ? `/board?${s}` : "/board";
  };

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon="board">Discussion</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>The <span className="em">board</span></h1>
        </div>
        <Link href="/board/new" className="btn inline-btn">New topic</Link>
      </div>

      <nav className="chip-row" style={{ marginTop: "1.25rem" }}>
        <Link href={href({ category: null })} className={`chip${!active ? " chip-active" : ""}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={href({ category: c.slug })} className={`chip${active?.slug === c.slug ? " chip-active" : ""}`}>
            {c.name}
          </Link>
        ))}
      </nav>

      {user.dma_slug ? (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }}>
          <Link href={href({ scope: null })} className={`chip${!scopeMine ? " chip-active" : ""}`}>Everywhere</Link>
          <Link href={href({ scope: "mine" })} className={`chip${scopeMine ? " chip-active" : ""}`}>My area · {user.dma_name}</Link>
        </nav>
      ) : null}

      {tagIndustries.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by industry">
          {tagIndustries.map((i) => (
            <Link key={i.id} href={href({ industry: activeIndustry?.slug === i.slug ? null : i.slug })} className={`chip${activeIndustry?.slug === i.slug ? " chip-active" : ""}`}>{i.name}</Link>
          ))}
        </nav>
      )}
      {tagFunctions.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by function">
          {tagFunctions.map((f) => (
            <Link key={f.id} href={href({ function: activeFunction?.slug === f.slug ? null : f.slug })} className={`chip${activeFunction?.slug === f.slug ? " chip-active" : ""}`}>{f.name}</Link>
          ))}
        </nav>
      )}

      <div style={{ marginTop: "1.25rem" }}>
        {results.map((t) => {
          const replies = Math.max(0, t.reply_count - 1); // first post is the opener
          return (
            <Link key={t.id} href={`/board/${t.id}`} className="card member-card topic-card" style={{ borderLeftColor: accentFor(t.category_slug), borderLeftWidth: "3px" }}>
              <div className="member-card-head" style={{ justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1.4rem", marginBottom: 0 }}>{t.title}</h3>
                <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {t.dma_name ? <span className="market-tag">{t.dma_name}</span> : null}
                  {t.category_name ? <span className="chip chip-static">{t.category_name}</span> : null}
                </span>
              </div>
              <p className="card-detail">
                {t.author || "Member"} · {replies} {replies === 1 ? "reply" : "replies"} · last activity <LocalTime ms={t.last_activity_at} />
              </p>
              {tagMap.get(t.id)?.length ? (
                <div className="content-tags">
                  {tagMap.get(t.id)!.map((name, k) => <span key={k} className="market-tag">{name}</span>)}
                </div>
              ) : null}
            </Link>
          );
        })}
        {results.length === 0 && (
          <EmptyState title={scopeMine ? "No topics in your area yet" : active ? "No topics in this category yet" : "No topics yet"}>
            <Link href="/board/new">Start the first conversation →</Link>
          </EmptyState>
        )}
      </div>
      <Pager page={page} hasNext={hasNext} basePath="/board" params={pagerParams} />
    </>
  );
}
