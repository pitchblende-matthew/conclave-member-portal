import { getDb } from "./db";

// Resolves a typed company name to a company id, creating the company if no
// case-insensitive match exists. Returns 0 for an empty name (no company).
export async function findOrCreateCompany(name: string, userId: number): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) return 0;

  const db = getDb();
  const existing = await db
    .prepare("SELECT id FROM companies WHERE name = ? COLLATE NOCASE")
    .bind(trimmed)
    .first<{ id: number }>();
  if (existing) return existing.id;

  const res = await db
    .prepare("INSERT INTO companies (name, created_by, created_at) VALUES (?, ?, ?)")
    .bind(trimmed, userId, Date.now())
    .run();
  return Number(res.meta.last_row_id);
}
