import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { formatDateTime } from "@/lib/format";
import Avatar from "@/components/avatar";
import ConfirmSubmit from "@/components/confirm-submit";
import ReplyForm from "./reply-form";
import { deletePost, deleteTopic } from "../actions";
import type { Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

type PostRow = {
  id: number;
  user_id: number;
  body: string;
  created_at: number;
  author: string | null;
  avatar_key: string | null;
};

export default async function TopicView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  const user = await requireUser();

  const db = getDb();
  const topic = await db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.slug AS category_slug
       FROM topics t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.id = ?`
    )
    .bind(topicId)
    .first<Topic & { category_name: string | null; category_slug: string | null }>();
  if (!topic) notFound();

  const { results: posts } = await db
    .prepare(
      `SELECT p.id, p.user_id, p.body, p.created_at,
              u.name AS author, u.avatar_key
       FROM posts p LEFT JOIN users u ON u.id = p.user_id
       WHERE p.topic_id = ?
       ORDER BY p.created_at ASC`
    )
    .bind(topicId)
    .all<PostRow>();

  const canDeleteTopic = user.is_admin === 1 || topic.created_by === user.id;

  return (
    <>
      <p className="meta"><Link href="/board">← Board</Link></p>
      {topic.category_name ? (
        <Link href={`/board?category=${topic.category_slug}`} className="chip chip-static" style={{ textDecoration: "none" }}>
          {topic.category_name}
        </Link>
      ) : null}
      <div className="topline" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ fontSize: "2.4rem" }}>{topic.title}</h1>
        {canDeleteTopic && (
          <form action={deleteTopic}>
            <input type="hidden" name="topicId" value={topic.id} />
            <ConfirmSubmit className="btn btn-ghost inline-btn" message="Delete this topic and all its replies?">
              Delete topic
            </ConfirmSubmit>
          </form>
        )}
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        {posts.map((p, i) => {
          const canDeletePost = user.is_admin === 1 || p.user_id === user.id;
          return (
            <div key={p.id} className="card post">
              <div className="post-head">
                <Link href={`/directory/${p.user_id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit" }}>
                  <Avatar src={p.avatar_key ? mediaUrl(p.avatar_key) : null} name={p.author ?? ""} size={36} />
                  <div>
                    <strong>{p.author || "Member"}</strong>
                    {i === 0 ? <span className="badge">Opener</span> : null}
                    <p className="meta" style={{ margin: 0 }}>{formatDateTime(p.created_at)}</p>
                  </div>
                </Link>
                {/* The opening post is removed via "Delete topic" to avoid orphaning it. */}
                {canDeletePost && i !== 0 && (
                  <form action={deletePost}>
                    <input type="hidden" name="postId" value={p.id} />
                    <ConfirmSubmit className="link-danger" message="Delete this reply?">Delete</ConfirmSubmit>
                  </form>
                )}
              </div>
              <p className="post-body">{p.body}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <ReplyForm topicId={topic.id} />
      </div>
    </>
  );
}
