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

  // New companies inherit the creating member's region so they appear in the
  // right market right away (editable later on the company page).
  const u = await db
    .prepare("SELECT location, city, state, zip, dma_slug, dma_name FROM users WHERE id = ?")
    .bind(userId)
    .first<{ location: string; city: string; state: string; zip: string; dma_slug: string; dma_name: string }>();

  const res = await db
    .prepare(
      `INSERT INTO companies (name, location, city, state, zip, dma_slug, dma_name, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      trimmed,
      u?.location ?? "", u?.city ?? "", u?.state ?? "", u?.zip ?? "", u?.dma_slug ?? "", u?.dma_name ?? "",
      userId, Date.now()
    )
    .run();
  return Number(res.meta.last_row_id);
}
