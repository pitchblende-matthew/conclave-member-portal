import { getDb } from "./db";

export type Industry = { id: number; name: string; slug: string; sort_order: number };
export type IndustryCount = { id: number; name: string; slug: string; n: number };

// The full admin-managed list, in display order.
export async function listIndustries(): Promise<Industry[]> {
  const { results } = await getDb()
    .prepare("SELECT id, name, slug, sort_order FROM industries ORDER BY sort_order, name COLLATE NOCASE")
    .all<Industry>();
  return results;
}

// Every industry with its company count — powers the browse grid.
export async function industriesWithCounts(): Promise<IndustryCount[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT i.id, i.name, i.slug, COUNT(c.id) AS n
       FROM industries i
       LEFT JOIN companies c ON c.industry_id = i.id
       GROUP BY i.id
       ORDER BY i.sort_order, i.name COLLATE NOCASE`
    )
    .all<IndustryCount>();
  return results;
}
