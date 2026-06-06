"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { storeImage, deleteImage } from "@/lib/media";
import type { Briefing } from "@/lib/types";

export type BriefingState = { ok?: boolean; error?: string };

function readFields(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const kind = field("kind") === "link" ? "link" : "article";
  return {
    kind,
    title: field("title"),
    summary: field("summary"),
    body: field("body"),
    url: field("url"),
  };
}

// Title is always required; a link briefing also needs a destination URL.
function validate(f: ReturnType<typeof readFields>): string | null {
  if (!f.title) return "Give the briefing a title.";
  if (f.kind === "link" && !f.url) return "A link briefing needs a destination URL.";
  if (f.kind === "link" && !/^https?:\/\//i.test(f.url)) return "The URL should start with http:// or https://.";
  return null;
}

export async function createBriefing(_prev: BriefingState, formData: FormData): Promise<BriefingState> {
  const admin = await requireAdmin();
  const f = readFields(formData);
  const error = validate(f);
  if (error) return { error };

  const now = Date.now();
  const res = await getDb()
    .prepare(
      `INSERT INTO briefings (kind, title, summary, body, url, author_id, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(f.kind, f.title, f.summary, f.body, f.url, admin.id, now, now)
    .run();

  revalidatePath("/admin/briefings");
  redirect(`/admin/briefings/${Number(res.meta.last_row_id)}/edit`);
}

export async function updateBriefing(_prev: BriefingState, formData: FormData): Promise<BriefingState> {
  await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return { error: "Unknown briefing." };
  const f = readFields(formData);
  const error = validate(f);
  if (error) return { error };

  await getDb()
    .prepare(
      `UPDATE briefings SET kind = ?, title = ?, summary = ?, body = ?, url = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(f.kind, f.title, f.summary, f.body, f.url, Date.now(), id)
    .run();

  revalidatePath("/admin/briefings");
  revalidatePath(`/admin/briefings/${id}/edit`);
  revalidatePath("/briefings");
  revalidatePath(`/briefings/${id}`);
  return { ok: true };
}

export async function uploadCover(_prev: BriefingState, formData: FormData): Promise<BriefingState> {
  await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return { error: "Unknown briefing." };

  const result = await storeImage(`briefings/${id}`, formData.get("cover"));
  if ("error" in result) return { error: result.error };

  const existing = await getDb()
    .prepare("SELECT cover_key FROM briefings WHERE id = ?")
    .bind(id)
    .first<Pick<Briefing, "cover_key">>();

  await getDb().prepare("UPDATE briefings SET cover_key = ?, updated_at = ? WHERE id = ?").bind(result.key, Date.now(), id).run();
  if (existing?.cover_key && existing.cover_key !== result.key) await deleteImage(existing.cover_key);

  revalidatePath("/admin/briefings");
  revalidatePath(`/admin/briefings/${id}/edit`);
  revalidatePath("/briefings");
  return { ok: true };
}

export async function removeCover(_prev: BriefingState, formData: FormData): Promise<BriefingState> {
  await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return { error: "Unknown briefing." };

  const existing = await getDb()
    .prepare("SELECT cover_key FROM briefings WHERE id = ?")
    .bind(id)
    .first<Pick<Briefing, "cover_key">>();
  if (existing?.cover_key) await deleteImage(existing.cover_key);

  await getDb().prepare("UPDATE briefings SET cover_key = '', updated_at = ? WHERE id = ?").bind(Date.now(), id).run();
  revalidatePath(`/admin/briefings/${id}/edit`);
  revalidatePath("/briefings");
  return { ok: true };
}

// Publish or unpublish. Stamps published_at the first time it goes live.
export async function setPublished(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return;
  const publish = formData.get("published") === "1";
  const now = Date.now();

  if (publish) {
    const row = await getDb().prepare("SELECT published_at FROM briefings WHERE id = ?").bind(id).first<{ published_at: number | null }>();
    const publishedAt = row?.published_at ?? now;
    await getDb().prepare("UPDATE briefings SET published = 1, published_at = ?, updated_at = ? WHERE id = ?").bind(publishedAt, now, id).run();
  } else {
    await getDb().prepare("UPDATE briefings SET published = 0, updated_at = ? WHERE id = ?").bind(now, id).run();
  }

  revalidatePath("/admin/briefings");
  revalidatePath(`/admin/briefings/${id}/edit`);
  revalidatePath("/briefings");
  revalidatePath(`/briefings/${id}`);
}

export async function deleteBriefing(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return;

  const existing = await getDb().prepare("SELECT cover_key FROM briefings WHERE id = ?").bind(id).first<Pick<Briefing, "cover_key">>();
  if (existing?.cover_key) await deleteImage(existing.cover_key);
  await getDb().prepare("DELETE FROM briefings WHERE id = ?").bind(id).run();

  revalidatePath("/admin/briefings");
  revalidatePath("/briefings");
  redirect("/admin/briefings");
}
