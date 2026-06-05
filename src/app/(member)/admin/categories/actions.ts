"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";
}

async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  let slug = base;
  let n = 2;
  while (await db.prepare("SELECT id FROM categories WHERE slug = ?").bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const db = getDb();
  const slug = await uniqueSlug(slugify(name));
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM categories").first<{ n: number }>();
  await db
    .prepare("INSERT INTO categories (name, slug, sort_order, created_at) VALUES (?, ?, ?, ?)")
    .bind(name, slug, order?.n ?? 1, Date.now())
    .run();
  revalidatePath("/admin/categories");
  revalidatePath("/board");
}

export async function renameCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  // Slug is left stable so existing links keep working.
  await getDb().prepare("UPDATE categories SET name = ? WHERE id = ?").bind(name, id).run();
  revalidatePath("/admin/categories");
  revalidatePath("/board");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("categoryId"));
  if (!id) return;

  const db = getDb();
  const general = await db.prepare("SELECT id FROM categories WHERE slug = 'general'").first<{ id: number }>();
  // Move this category's topics to General (or uncategorized if deleting General itself).
  const fallback = general && general.id !== id ? general.id : 0;
  await db.prepare("UPDATE topics SET category_id = ? WHERE category_id = ?").bind(fallback, id).run();
  await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  revalidatePath("/admin/categories");
  revalidatePath("/board");
}
