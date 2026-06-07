import { getDb } from "./db";

export type Taxon = { id: number; name: string; slug: string; sort_order: number };
export type TaxonCount = { id: number; name: string; slug: string; n: number };

// Generic readers over the function/seniority taxonomy tables. Both have the same
// shape, so they share one implementation.
async function list(table: "functions" | "seniorities"): Promise<Taxon[]> {
  const { results } = await getDb()
    .prepare(`SELECT id, name, slug, sort_order FROM ${table} ORDER BY sort_order, name COLLATE NOCASE`)
    .all<Taxon>();
  return results;
}

async function withCounts(table: "functions" | "seniorities", column: "function_id" | "seniority_id"): Promise<TaxonCount[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT t.id, t.name, t.slug, COUNT(u.id) AS n
       FROM ${table} t
       LEFT JOIN users u ON u.${column} = t.id AND u.status = 'approved'
       GROUP BY t.id
       ORDER BY t.sort_order, t.name COLLATE NOCASE`
    )
    .all<TaxonCount>();
  return results;
}

export const listFunctions = () => list("functions");
export const listSeniorities = () => list("seniorities");
export const functionsWithCounts = () => withCounts("functions", "function_id");
export const senioritiesWithCounts = () => withCounts("seniorities", "seniority_id");
