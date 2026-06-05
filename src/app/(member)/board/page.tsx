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
  reply_count: number;
};

export default async function Board() {
  await requireUser();
  const { results } = await getDb()
    .prepare(
      `SELECT t.id, t.title, t.last_activity_at,
              a.name AS author,
              (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) AS reply_count
       FROM topics t
       LEFT JOIN users a ON a.id = t.created_by
       ORDER BY t.last_activity_at DESC`
    )
    .all<TopicRow>();

  return (
    <>
      <div className="topline">
        <div>
          <div className="tag">Discussion</div>
          <h1 style={{ fontSize: "2.6rem" }}>The board</h1>
        </div>
        <Link href="/board/new" className="btn inline-btn">New topic</Link>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((t) => {
          const replies = Math.max(0, t.reply_count - 1); // first post is the opener
          return (
            <Link key={t.id} href={`/board/${t.id}`} className="card member-card">
              <h3 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{t.title}</h3>
              <p className="meta" style={{ margin: 0 }}>
                {t.author || "Member"} · {replies} {replies === 1 ? "reply" : "replies"} · last activity {formatDateTime(t.last_activity_at)}
              </p>
            </Link>
          );
        })}
        {results.length === 0 && <p className="meta">No topics yet. Start the first conversation.</p>}
      </div>
    </>
  );
}
