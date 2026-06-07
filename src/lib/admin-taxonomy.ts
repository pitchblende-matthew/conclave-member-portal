import { getDb } from "./db";

// Shared CRUD for the member function/seniority taxonomy tables (same shape).
// Table/column names come from a fixed whitelist below — never user input.
type Table = "functions" | "seniorities";
type Column = "function_id" | "seniority_id";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

async function uniqueSlug(table: Table, base: string): Promise<string> {
  const db = getDb();
  let slug = base;
  let n = 2;
  while (await db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createTaxon(table: Table, name: string): Promise<void> {
  const db = getDb();
  const slug = await uniqueSlug(table, slugify(name));
  const order = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM ${table}`).first<{ n: number }>();
  await db
    .prepare(`INSERT INTO ${table} (name, slug, sort_order, created_at) VALUES (?, ?, ?, ?)`)
    .bind(name, slug, order?.n ?? 1, Date.now())
    .run();
}

export async function renameTaxon(table: Table, id: number, name: string): Promise<void> {
  // Slug stays stable so existing links keep working.
  await getDb().prepare(`UPDATE ${table} SET name = ? WHERE id = ?`).bind(name, id).run();
}

export async function deleteTaxon(table: Table, column: Column, id: number): Promise<void> {
  const db = getDb();
  // Reassign affected members to "Other" (or unset when deleting Other itself).
  const other = await db.prepare(`SELECT id FROM ${table} WHERE slug = 'other'`).first<{ id: number }>();
  const fallback = other && other.id !== id ? other.id : 0;
  await db.prepare(`UPDATE users SET ${column} = ? WHERE ${column} = ?`).bind(fallback, id).run();
  await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
}
