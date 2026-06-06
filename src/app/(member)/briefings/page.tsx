import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import LocalTime from "@/components/local-time";
import EmptyState from "@/components/empty-state";
import Pager from "@/components/pager";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 18;

type Row = Briefing & { category_name: string | null };

export default async function Briefings({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  await requireUser();
  const { category, page: pageParam } = await searchParams;
  const db = getDb();
  const page = Math.max(1, Number(pageParam) || 1);

  const { results: categories } = await db
    .prepare("SELECT id, name, slug FROM briefing_categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string; slug: string }>();
  const active = categories.find((c) => c.slug === category) ?? null;

  const { results: rows } = await db
    .prepare(
      `SELECT b.*, c.name AS category_name
       FROM briefings b LEFT JOIN briefing_categories c ON c.id = b.category_id
       WHERE b.published = 1${active ? " AND b.category_id = ?" : ""}
       ORDER BY b.published_at DESC, b.id DESC LIMIT ? OFFSET ?`
    )
    .bind(...(active ? [active.id] : []), PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<Row>();
  const hasNext = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);
  const pagerParams: Record<string, string> = {};
  if (active) pagerParams.category = active.slug;

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
        <Link href="/briefings" className={`chip${!active ? " chip-active" : ""}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/briefings?category=${c.slug}`} className={`chip${active?.slug === c.slug ? " chip-active" : ""}`}>
            {c.name}
          </Link>
        ))}
      </nav>

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
                <p className="meta" style={{ marginTop: "0.6rem", fontSize: "0.78rem" }}>
                  {b.published_at ? <LocalTime ms={b.published_at} /> : ""}
                </p>
              </div>
            </>
          );
          return isLink ? (
            <a key={b.id} href={b.url} target="_blank" rel="noreferrer" className="card briefing-card">
              {inner}
            </a>
          ) : (
            <Link key={b.id} href={`/briefings/${b.id}`} className="card briefing-card">
              {inner}
            </Link>
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
