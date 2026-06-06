"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { storeImage, deleteImage } from "@/lib/media";
import { notify } from "@/lib/notifications";
import { emailSubmissionDecision } from "@/lib/email";
import { fetchOgImage } from "@/lib/opengraph";
import type { Briefing } from "@/lib/types";

export type BriefingState = { ok?: boolean; error?: string };

// Scrape the link's OpenGraph image into cover_url (best effort).
async function applyOgCover(id: number, url: string): Promise<void> {
  const og = await fetchOgImage(url);
  if (og) await getDb().prepare("UPDATE briefings SET cover_url = ? WHERE id = ?").bind(og, id).run();
}

// Re-fetch the OG cover for one link briefing (admin button).
export async function fetchBriefingCover(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return;
  const b = await getDb().prepare("SELECT url, kind FROM briefings WHERE id = ?").bind(id).first<{ url: string; kind: string }>();
  if (b?.kind === "link" && b.url) await applyOgCover(id, b.url);
  revalidatePath("/admin/briefings");
  revalidatePath("/briefings");
}

// Backfill covers for every link briefing that has none (e.g. the seeded set).
export async function fetchMissingBriefingCovers(): Promise<void> {
  await requireAdmin();
  const { results } = await getDb()
    .prepare("SELECT id, url FROM briefings WHERE kind = 'link' AND cover_key = '' AND cover_url = '' AND url != ''")
    .all<{ id: number; url: string }>();
  await Promise.all(results.slice(0, 40).map((b) => applyOgCover(b.id, b.url)));
  revalidatePath("/admin/briefings");
  revalidatePath("/briefings");
}

// Approve a member-submitted briefing — this publishes it.
export async function approveBriefing(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return;
  const b = await getDb().prepare("SELECT submitted_by, title, published_at FROM briefings WHERE id = ?").bind(id).first<{ submitted_by: number | null; title: string; published_at: number | null }>();
  const now = Date.now();
  await getDb()
    .prepare("UPDATE briefings SET status = 'approved', published = 1, published_at = ?, updated_at = ? WHERE id = ?")
    .bind(b?.published_at ?? now, now, id)
    .run();
  if (b?.submitted_by) {
    await notify(b.submitted_by, "briefing_approved", { actorId: admin.id });
    const u = await getDb().prepare("SELECT email FROM users WHERE id = ?").bind(b.submitted_by).first<{ email: string }>();
    if (u?.email) await emailSubmissionDecision(u.email, "briefing", b.title, true);
  }
  revalidatePath("/admin/briefings");
  revalidatePath("/briefings");
}

// Decline a member-submitted briefing (stays unpublished, kept out of lists).
export async function declineBriefing(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("briefingId"));
  if (!id) return;
  const b = await getDb().prepare("SELECT submitted_by, title FROM briefings WHERE id = ?").bind(id).first<{ submitted_by: number | null; title: string }>();
  await getDb().prepare("UPDATE briefings SET status = 'declined', published = 0, updated_at = ? WHERE id = ?").bind(Date.now(), id).run();
  if (b?.submitted_by) {
    await notify(b.submitted_by, "briefing_declined", { actorId: admin.id });
    const u = await getDb().prepare("SELECT email FROM users WHERE id = ?").bind(b.submitted_by).first<{ email: string }>();
    if (u?.email) await emailSubmissionDecision(u.email, "briefing", b.title, false);
  }
  revalidatePath("/admin/briefings");
}

function readFields(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const kind = field("kind") === "link" ? "link" : "article";
  return {
    kind,
    title: field("title"),
    summary: field("summary"),
    body: field("body"),
    url: field("url"),
    categoryId: Number(formData.get("category_id")) || 0,
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
      `INSERT INTO briefings (kind, title, summary, body, url, category_id, author_id, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(f.kind, f.title, f.summary, f.body, f.url, f.categoryId, admin.id, now, now)
    .run();

  const id = Number(res.meta.last_row_id);
  if (f.kind === "link") await applyOgCover(id, f.url);

  revalidatePath("/admin/briefings");
  redirect(`/admin/briefings/${id}/edit`);
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
      `UPDATE briefings SET kind = ?, title = ?, summary = ?, body = ?, url = ?, category_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(f.kind, f.title, f.summary, f.body, f.url, f.categoryId, Date.now(), id)
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
    // Publishing also clears any pending-review state.
    await getDb().prepare("UPDATE briefings SET published = 1, status = 'approved', published_at = ?, updated_at = ? WHERE id = ?").bind(publishedAt, now, id).run();
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
