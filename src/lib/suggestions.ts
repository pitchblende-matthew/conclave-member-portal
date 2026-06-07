import { getDb } from "./db";
import { visibleMembersClause, type Viewer } from "./discovery";

export type Suggestion = {
  id: number;
  name: string;
  role: string;
  avatar_key: string;
  pronouns: string;
  company_name: string | null;
  reasons: string[];
};

type Row = {
  id: number;
  name: string;
  role: string;
  avatar_key: string;
  pronouns: string;
  dma_slug: string;
  dma_name: string;
  function_id: number;
  seniority_id: number;
  company_name: string | null;
  company_industry_id: number;
  function_name: string | null;
  seniority_name: string | null;
  industry_name: string | null;
};

// "Members you should meet" — approved members the viewer isn't connected to (or
// pending with), ranked by shared market / function / industry / seniority, and
// limited to people the viewer is allowed to discover.
export async function suggestedMembers(viewer: Viewer & { company_id: number }, limit = 6): Promise<Suggestion[]> {
  const db = getDb();
  const myIndustry = viewer.company_id
    ? (await db.prepare("SELECT industry_id FROM companies WHERE id = ?").bind(viewer.company_id).first<{ industry_id: number }>())?.industry_id ?? 0
    : 0;
  const vis = visibleMembersClause(viewer, "u");

  const { results } = await db
    .prepare(
      `SELECT * FROM (
         SELECT u.id, u.name, u.role, u.avatar_key, u.pronouns,
                u.dma_slug, u.dma_name, u.function_id, u.seniority_id,
                COALESCE(co.name, NULLIF(u.company, '')) AS company_name,
                COALESCE(co.industry_id, 0) AS company_industry_id,
                f.name AS function_name, s.name AS seniority_name, i.name AS industry_name,
                ( (CASE WHEN u.dma_slug <> '' AND u.dma_slug = ? THEN 3 ELSE 0 END)
                + (CASE WHEN u.function_id <> 0 AND u.function_id = ? THEN 2 ELSE 0 END)
                + (CASE WHEN u.seniority_id <> 0 AND u.seniority_id = ? THEN 1 ELSE 0 END)
                + (CASE WHEN COALESCE(co.industry_id, 0) <> 0 AND co.industry_id = ? THEN 2 ELSE 0 END) ) AS score
         FROM users u
         LEFT JOIN companies co ON co.id = u.company_id
         LEFT JOIN functions f ON f.id = u.function_id
         LEFT JOIN seniorities s ON s.id = u.seniority_id
         LEFT JOIN industries i ON i.id = co.industry_id
         WHERE u.status = 'approved' AND u.id <> ?
           AND NOT EXISTS (
             SELECT 1 FROM connections cn
             WHERE (cn.requester_id = ? AND cn.addressee_id = u.id)
                OR (cn.requester_id = u.id AND cn.addressee_id = ?)
           )
           AND ${vis.sql}
       )
       WHERE score > 0
       ORDER BY score DESC, RANDOM()
       LIMIT ?`
    )
    .bind(
      viewer.dma_slug, viewer.function_id, viewer.seniority_id, myIndustry,
      viewer.id, viewer.id, viewer.id, ...vis.binds, limit
    )
    .all<Row>();

  return results.map((r) => {
    const reasons: string[] = [];
    if (r.dma_slug && r.dma_slug === viewer.dma_slug && r.dma_name) reasons.push(`Near you · ${r.dma_name}`);
    if (r.function_id && r.function_id === viewer.function_id && r.function_name) reasons.push(`Also in ${r.function_name}`);
    if (r.company_industry_id && r.company_industry_id === myIndustry && r.industry_name) reasons.push(`Same industry · ${r.industry_name}`);
    if (r.seniority_id && r.seniority_id === viewer.seniority_id && r.seniority_name) reasons.push(r.seniority_name);
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      avatar_key: r.avatar_key,
      pronouns: r.pronouns,
      company_name: r.company_name,
      reasons: reasons.slice(0, 2),
    };
  });
}
