"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

async function setStatus(id: number, status: string, adminId: number): Promise<void> {
  await getDb()
    .prepare("UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ?")
    .bind(status, adminId, Date.now(), id)
    .run();
}

export async function dismissReport(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("reportId"));
  if (!id) return;
  await setStatus(id, "dismissed", admin.id);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function resolveReport(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("reportId"));
  if (!id) return;
  await setStatus(id, "resolved", admin.id);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

// Delete the reported board content (post or topic), then resolve every open
// report pointing at it. Members are not deleted here (use member tools).
export async function removeReportedContent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("reportId"));
  if (!id) return;
  const db = getDb();
  const r = await db.prepare("SELECT target_type, target_id FROM reports WHERE id = ?").bind(id).first<{ target_type: string; target_id: number }>();
  if (!r) return;

  if (r.target_type === "post") {
    const post = await db.prepare("SELECT topic_id FROM posts WHERE id = ?").bind(r.target_id).first<{ topic_id: number }>();
    await db.prepare("DELETE FROM posts WHERE id = ?").bind(r.target_id).run();
    if (post?.topic_id) {
      const latest = await db.prepare("SELECT MAX(created_at) AS n FROM posts WHERE topic_id = ?").bind(post.topic_id).first<{ n: number | null }>();
      if (latest?.n) await db.prepare("UPDATE topics SET last_activity_at = ? WHERE id = ?").bind(latest.n, post.topic_id).run();
    }
  } else if (r.target_type === "topic") {
    await db.prepare("DELETE FROM posts WHERE topic_id = ?").bind(r.target_id).run();
    await db.prepare("DELETE FROM topics WHERE id = ?").bind(r.target_id).run();
    await db.prepare("DELETE FROM notifications WHERE topic_id = ?").bind(r.target_id).run();
  }

  await db
    .prepare("UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = ? WHERE target_type = ? AND target_id = ? AND status = 'open'")
    .bind(admin.id, Date.now(), r.target_type, r.target_id)
    .run();
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  revalidatePath("/board");
}
