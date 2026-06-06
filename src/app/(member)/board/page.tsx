import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type TopicRow = {
  id: number;
  title: string;
  last_activity_at: number;
  author: string | null;
  category_name: string | null;
  category_slug: string | null;
  reply_count: number;
};

export default async function Board({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireUser();
  const { category } = await searchParams;
  const db = getDb();

  const { results: categories } = await db
    .prepare("SELECT id, name, slug FROM categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string; slug: string }>();

  const active = categories.find((c) => c.slug === category) ?? null;

  const { results } = await db
    .prepare(
      `SELECT t.id, t.title, t.last_activity_at,
              a.name AS author,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) AS reply_count
       FROM topics t
       LEFT JOIN users a ON a.id = t.created_by
       LEFT JOIN categories c ON c.id = t.category_id
       ${active ? "WHERE t.category_id = ?" : ""}
       ORDER BY t.last_activity_at DESC`
    )
    .bind(...(active ? [active.id] : []))
    .all<TopicRow>();

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
        <Link href="/board" className={`chip${!active ? " chip-active" : ""}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/board?category=${c.slug}`} className={`chip${active?.slug === c.slug ? " chip-active" : ""}`}>
            {c.name}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: "1.25rem" }}>
        {results.map((t) => {
          const replies = Math.max(0, t.reply_count - 1); // first post is the opener
          return (
            <Link key={t.id} href={`/board/${t.id}`} className="card member-card">
              <div className="member-card-head" style={{ justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1.4rem", marginBottom: 0 }}>{t.title}</h3>
                {t.category_name ? <span className="chip chip-static">{t.category_name}</span> : null}
              </div>
              <p className="meta" style={{ margin: "0.4rem 0 0" }}>
                {t.author || "Member"} · {replies} {replies === 1 ? "reply" : "replies"} · last activity {formatDateTime(t.last_activity_at)}
              </p>
            </Link>
          );
        })}
        {results.length === 0 && (
          <p className="meta">{active ? "No topics in this category yet." : "No topics yet. Start the first conversation."}</p>
        )}
      </div>
    </>
  );
}
