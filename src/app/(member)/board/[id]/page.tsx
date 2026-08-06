import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import LocalTime from "@/components/local-time";
import { renderMarkdown } from "@/lib/markdown";
import Avatar from "@/components/avatar";
import ConfirmSubmit from "@/components/confirm-submit";
import ReplyForm from "./reply-form";
import ReportButton from "@/components/report-button";
import ReactButton from "@/components/react-button";
import BookmarkButton from "@/components/bookmark-button";
import { reactionCounts, myFlags } from "@/lib/engagement";
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

  // If this thread was auto-opened for an event/briefing, link back to it so the
  // conversation and the source sit next to each other.
  let source: { href: string; label: string; external: boolean } | null = null;
  if (topic.source_type === "event" && topic.source_id) {
    const e = await db.prepare("SELECT title FROM events WHERE id = ?").bind(topic.source_id).first<{ title: string }>();
    if (e) source = { href: `/events/${topic.source_id}`, label: `About this event · ${e.title}`, external: false };
  } else if (topic.source_type === "briefing" && topic.source_id) {
    const b = await db.prepare("SELECT title, kind, url FROM briefings WHERE id = ?").bind(topic.source_id).first<{ title: string; kind: string; url: string }>();
    if (b) {
      const external = b.kind === "link" && !!b.url;
      source = { href: external ? b.url : `/briefings/${topic.source_id}`, label: `About this briefing · ${b.title}`, external };
    }
  }

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

  const postIds = posts.map((p) => p.id);
  const [reactCounts, myReacts, savedTopics] = await Promise.all([
    reactionCounts("post", postIds),
    myFlags(user.id, "react", "post", postIds),
    myFlags(user.id, "save", "topic", [topicId]),
  ]);
  const topicSaved = savedTopics.has(topicId);
  const path = `/board/${topicId}`;

  return (
    <>
      <p className="meta"><Link href="/board">← Board</Link></p>
      <span style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {topic.category_name ? (
          <Link href={`/board?category=${topic.category_slug}`} className="chip chip-static" style={{ textDecoration: "none" }}>
            {topic.category_name}
          </Link>
        ) : null}
        {topic.dma_name ? (
          <Link href="/board?scope=mine" className="market-tag" style={{ textDecoration: "none" }}>{topic.dma_name}</Link>
        ) : null}
      </span>
      <div className="topline" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ fontSize: "2.4rem" }}>{topic.title}</h1>
        <div className="btn-row" style={{ alignItems: "center" }}>
          <BookmarkButton contentType="topic" contentId={topic.id} saved={topicSaved} path={path} />
          {topic.created_by !== user.id && <ReportButton targetType="topic" targetId={topic.id} />}
          {canDeleteTopic && (
            <form action={deleteTopic}>
              <input type="hidden" name="topicId" value={topic.id} />
              <ConfirmSubmit className="btn btn-ghost inline-btn" message="Delete this topic and all its replies?">
                Delete topic
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </div>

      {source ? (
        <p className="meta" style={{ marginTop: "0.5rem" }}>
          {source.external ? (
            <a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a>
          ) : (
            <Link href={source.href}>{source.label} →</Link>
          )}
        </p>
      ) : null}

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
                    <p className="meta" style={{ margin: 0 }}><LocalTime ms={p.created_at} /></p>
                  </div>
                </Link>
                {/* The opening post is removed via "Delete topic" to avoid orphaning it. */}
                <div className="btn-row" style={{ alignItems: "center" }}>
                  <ReactButton contentType="post" contentId={p.id} count={reactCounts.get(p.id) ?? 0} reacted={myReacts.has(p.id)} path={path} />
                  {i !== 0 && p.user_id !== user.id && <ReportButton targetType="post" targetId={p.id} />}
                  {canDeletePost && i !== 0 && (
                    <form action={deletePost}>
                      <input type="hidden" name="postId" value={p.id} />
                      <ConfirmSubmit className="link-danger" message="Delete this reply?">Delete</ConfirmSubmit>
                    </form>
                  )}
                </div>
              </div>
              <div className="post-body prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
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
