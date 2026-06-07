import { getDb } from "./db";
import { visibleMembersClause, type Viewer } from "./discovery";

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

async function withCounts(table: "functions" | "seniorities", column: "function_id" | "seniority_id", viewer?: Viewer): Promise<TaxonCount[]> {
  let joinCond = `u.${column} = t.id AND u.status = 'approved'`;
  const binds: (string | number)[] = [];
  if (viewer) {
    const vis = visibleMembersClause(viewer, "u");
    joinCond += ` AND ${vis.sql}`;
    binds.push(...vis.binds);
  }
  const { results } = await getDb()
    .prepare(
      `SELECT t.id, t.name, t.slug, COUNT(u.id) AS n
       FROM ${table} t
       LEFT JOIN users u ON ${joinCond}
       GROUP BY t.id
       ORDER BY t.sort_order, t.name COLLATE NOCASE`
    )
    .bind(...binds)
    .all<TaxonCount>();
  return results;
}

export const listFunctions = () => list("functions");
export const listSeniorities = () => list("seniorities");
export const functionsWithCounts = (viewer?: Viewer) => withCounts("functions", "function_id", viewer);
export const senioritiesWithCounts = (viewer?: Viewer) => withCounts("seniorities", "seniority_id", viewer);
