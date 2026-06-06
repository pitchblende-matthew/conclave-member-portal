import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ category?: string; scope?: string }>;
}) {
  const user = await requireUser();
  const { category, scope } = await searchParams;
  const db = getDb();

  const { results: categories } = await db
    .prepare("SELECT id, name, slug FROM categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string; slug: string }>();

  const active = categories.find((c) => c.slug === category) ?? null;
  const scopeMine = scope === "mine" && !!user.dma_slug;

  // Build the filter from whichever of category / area scope is active.
  const conds: string[] = [];
  const binds: (string | number)[] = [];
  if (active) { conds.push("t.category_id = ?"); binds.push(active.id); }
  if (scopeMine) { conds.push("t.dma_slug = ?"); binds.push(user.dma_slug); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const { results } = await db
    .prepare(
      `SELECT t.id, t.title, t.last_activity_at, t.dma_name,
              a.name AS author,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) AS reply_count
       FROM topics t
       LEFT JOIN users a ON a.id = t.created_by
       LEFT JOIN categories c ON c.id = t.category_id
       ${where}
       ORDER BY t.last_activity_at DESC`
    )
    .bind(...binds)
    .all<TopicRow>();

  // Links that preserve the other active filter.
  const href = (next: { category?: string | null; scope?: string | null }) => {
    const sp = new URLSearchParams();
    const cat = next.category === undefined ? active?.slug : next.category;
    const sc = next.scope === undefined ? (scopeMine ? "mine" : null) : next.scope;
    if (cat) sp.set("category", cat);
    if (sc) sp.set("scope", sc);
    const s = sp.toString();
    return s ? `/board?${s}` : "/board";
  };

  return (
    <>
      <div className="topline">
        <div>
          <div className="tag">Discussion</div>
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

      <div style={{ marginTop: "1.25rem" }}>
        {results.map((t) => {
          const replies = Math.max(0, t.reply_count - 1); // first post is the opener
          return (
            <Link key={t.id} href={`/board/${t.id}`} className="card member-card">
              <div className="member-card-head" style={{ justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1.4rem", marginBottom: 0 }}>{t.title}</h3>
                <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {t.dma_name ? <span className="market-tag">{t.dma_name}</span> : null}
                  {t.category_name ? <span className="chip chip-static">{t.category_name}</span> : null}
                </span>
              </div>
              <p className="meta" style={{ margin: "0.4rem 0 0" }}>
                {t.author || "Member"} · {replies} {replies === 1 ? "reply" : "replies"} · last activity {formatDateTime(t.last_activity_at)}
              </p>
            </Link>
          );
        })}
        {results.length === 0 && (
          <EmptyState title={scopeMine ? "No topics in your area yet" : active ? "No topics in this category yet" : "No topics yet"}>
            <Link href="/board/new">Start the first conversation →</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
