"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "industry";
}

async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  let slug = base;
  let n = 2;
  while (await db.prepare("SELECT id FROM industries WHERE slug = ?").bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function revalidate() {
  revalidatePath("/admin/industries");
  revalidatePath("/industries");
  revalidatePath("/companies");
}

export async function createIndustry(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const db = getDb();
  const slug = await uniqueSlug(slugify(name));
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM industries").first<{ n: number }>();
  await db
    .prepare("INSERT INTO industries (name, slug, sort_order, created_at) VALUES (?, ?, ?, ?)")
    .bind(name, slug, order?.n ?? 1, Date.now())
    .run();
  revalidate();
}

export async function renameIndustry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("industryId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  const db = getDb();
  // Slug stays stable so existing links keep working. Keep the denormalized
  // companies.industry text in sync with the canonical name.
  await db.prepare("UPDATE industries SET name = ? WHERE id = ?").bind(name, id).run();
  await db.prepare("UPDATE companies SET industry = ? WHERE industry_id = ?").bind(name, id).run();
  revalidate();
}

export async function deleteIndustry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("industryId"));
  if (!id) return;

  const db = getDb();
  // Reassign this industry's companies to "Other" (or uncategorized if deleting Other itself).
  const other = await db.prepare("SELECT id, name FROM industries WHERE slug = 'other'").first<{ id: number; name: string }>();
  const fallbackId = other && other.id !== id ? other.id : 0;
  const fallbackName = fallbackId ? other!.name : "";
  await db.prepare("UPDATE companies SET industry_id = ?, industry = ? WHERE industry_id = ?").bind(fallbackId, fallbackName, id).run();
  await db.prepare("DELETE FROM industries WHERE id = ?").bind(id).run();
  revalidate();
}
