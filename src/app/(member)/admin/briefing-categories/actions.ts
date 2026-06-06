"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "topic";
}

async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  let slug = base;
  let n = 2;
  while (await db.prepare("SELECT id FROM briefing_categories WHERE slug = ?").bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createBriefingCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const db = getDb();
  const slug = await uniqueSlug(slugify(name));
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM briefing_categories").first<{ n: number }>();
  await db
    .prepare("INSERT INTO briefing_categories (name, slug, sort_order, created_at) VALUES (?, ?, ?, ?)")
    .bind(name, slug, order?.n ?? 1, Date.now())
    .run();
  revalidatePath("/admin/briefing-categories");
  revalidatePath("/briefings");
}

export async function renameBriefingCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await getDb().prepare("UPDATE briefing_categories SET name = ? WHERE id = ?").bind(name, id).run();
  revalidatePath("/admin/briefing-categories");
  revalidatePath("/briefings");
}

export async function deleteBriefingCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("categoryId"));
  if (!id) return;
  // Briefings in this category become uncategorized.
  const db = getDb();
  await db.prepare("UPDATE briefings SET category_id = 0 WHERE category_id = ?").bind(id).run();
  await db.prepare("DELETE FROM briefing_categories WHERE id = ?").bind(id).run();
  revalidatePath("/admin/briefing-categories");
  revalidatePath("/briefings");
}
