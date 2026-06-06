"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Post, Topic } from "@/lib/types";

export type BoardState = { ok?: boolean; error?: string };

export async function createTopic(_prev: BoardState, formData: FormData): Promise<BoardState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryId = Number(formData.get("category_id")) || 0;
  // Optionally scope the topic to the author's market.
  const scoped = formData.get("scope_area") === "1" && !!user.dma_slug;
  const dmaSlug = scoped ? user.dma_slug : "";
  const dmaName = scoped ? user.dma_name : "";
  if (!title) return { error: "Give your topic a title." };
  if (!body) return { error: "Write something to start the discussion." };

  const db = getDb();
  const now = Date.now();
  const res = await db
    .prepare("INSERT INTO topics (title, category_id, dma_slug, dma_name, created_by, created_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(title, categoryId, dmaSlug, dmaName, user.id, now, now)
    .run();
  const topicId = Number(res.meta.last_row_id);
  await db
    .prepare("INSERT INTO posts (topic_id, user_id, body, created_at) VALUES (?, ?, ?, ?)")
    .bind(topicId, user.id, body, now)
    .run();

  revalidatePath("/board");
  redirect(`/board/${topicId}`);
}

export async function createReply(_prev: BoardState, formData: FormData): Promise<BoardState> {
  const user = await requireUser();
  const topicId = Number(formData.get("topicId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!topicId) return { error: "Unknown topic." };
  if (!body) return { error: "Write a reply first." };

  const db = getDb();
  const now = Date.now();
  await db
    .prepare("INSERT INTO posts (topic_id, user_id, body, created_at) VALUES (?, ?, ?, ?)")
    .bind(topicId, user.id, body, now)
    .run();
  await db.prepare("UPDATE topics SET last_activity_at = ? WHERE id = ?").bind(now, topicId).run();

  revalidatePath(`/board/${topicId}`);
  revalidatePath("/board");
  return { ok: true };
}

// Delete a single post (reply). Author or admin only. Keeps last_activity_at fresh.
export async function deletePost(formData: FormData): Promise<void> {
  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  if (!postId) return;

  const db = getDb();
  const post = await db.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first<Post>();
  if (!post) return;
  if (user.is_admin !== 1 && post.user_id !== user.id) return;

  await db.prepare("DELETE FROM posts WHERE id = ?").bind(postId).run();

  const latest = await db
    .prepare("SELECT MAX(created_at) AS n FROM posts WHERE topic_id = ?")
    .bind(post.topic_id)
    .first<{ n: number | null }>();
  if (latest?.n) {
    await db.prepare("UPDATE topics SET last_activity_at = ? WHERE id = ?").bind(latest.n, post.topic_id).run();
  }

  revalidatePath(`/board/${post.topic_id}`);
  revalidatePath("/board");
}

// Delete a whole topic and its posts. Topic author or admin only.
export async function deleteTopic(formData: FormData): Promise<void> {
  const user = await requireUser();
  const topicId = Number(formData.get("topicId"));
  if (!topicId) return;

  const db = getDb();
  const topic = await db.prepare("SELECT * FROM topics WHERE id = ?").bind(topicId).first<Topic>();
  if (!topic) return;
  if (user.is_admin !== 1 && topic.created_by !== user.id) return;

  await db.prepare("DELETE FROM posts WHERE topic_id = ?").bind(topicId).run();
  await db.prepare("DELETE FROM topics WHERE id = ?").bind(topicId).run();

  revalidatePath("/board");
  redirect("/board");
}
