import { getDb } from "./db";
import { visibleMembersClause, type Viewer } from "./discovery";

export type Expertise = { id: number; name: string; slug: string; sort_order: number };
export type ExpertiseCount = Expertise & { n: number };

// Most members specialise in a handful of areas; cap keeps profiles legible.
export const MAX_EXPERTISE = 8;

export async function listExpertise(): Promise<Expertise[]> {
  const { results } = await getDb()
    .prepare("SELECT id, name, slug, sort_order FROM expertise ORDER BY sort_order, name COLLATE NOCASE")
    .all<Expertise>();
  return results;
}

// Expertise areas with a count of (visible, approved) members for the viewer —
// drives the directory filter chips, mirroring functionsWithCounts.
export async function expertiseWithCounts(viewer?: Viewer): Promise<ExpertiseCount[]> {
  const binds: (string | number)[] = [];
  let userCond = "u.status = 'approved'";
  if (viewer) {
    const vis = visibleMembersClause(viewer, "u");
    userCond += ` AND ${vis.sql}`;
    binds.push(...vis.binds);
  }
  const { results } = await getDb()
    .prepare(
      `SELECT e.id, e.name, e.slug, COUNT(u.id) AS n
       FROM expertise e
       LEFT JOIN user_expertise ue ON ue.expertise_id = e.id
       LEFT JOIN users u ON u.id = ue.user_id AND ${userCond}
       GROUP BY e.id
       ORDER BY e.sort_order, e.name COLLATE NOCASE`
    )
    .bind(...binds)
    .all<ExpertiseCount>();
  return results;
}

export async function getUserExpertiseIds(userId: number): Promise<number[]> {
  const { results } = await getDb()
    .prepare("SELECT expertise_id FROM user_expertise WHERE user_id = ?")
    .bind(userId)
    .all<{ expertise_id: number }>();
  return results.map((r) => r.expertise_id);
}

// Replace a member's expertise with the given ids (validated against the
// taxonomy, de-duped, capped).
export async function setUserExpertise(userId: number, ids: number[]): Promise<void> {
  const db = getDb();
  const { results: valid } = await db.prepare("SELECT id FROM expertise").all<{ id: number }>();
  const allowed = new Set(valid.map((r) => r.id));
  const clean = [...new Set(ids)].filter((id) => allowed.has(id)).slice(0, MAX_EXPERTISE);
  await db.prepare("DELETE FROM user_expertise WHERE user_id = ?").bind(userId).run();
  for (const id of clean) {
    await db.prepare("INSERT OR IGNORE INTO user_expertise (user_id, expertise_id) VALUES (?, ?)").bind(userId, id).run();
  }
}

// Expertise areas for a set of members, ordered, keyed by user id.
export async function expertiseForUsers(userIds: number[]): Promise<Map<number, Expertise[]>> {
  const map = new Map<number, Expertise[]>();
  if (!userIds.length) return map;
  const ph = userIds.map(() => "?").join(",");
  const { results } = await getDb()
    .prepare(
      `SELECT ue.user_id, e.id, e.name, e.slug, e.sort_order
       FROM user_expertise ue JOIN expertise e ON e.id = ue.expertise_id
       WHERE ue.user_id IN (${ph})
       ORDER BY e.sort_order, e.name COLLATE NOCASE`
    )
    .bind(...userIds)
    .all<{ user_id: number } & Expertise>();
  for (const r of results) {
    const arr = map.get(r.user_id) ?? [];
    arr.push({ id: r.id, name: r.name, slug: r.slug, sort_order: r.sort_order });
    map.set(r.user_id, arr);
  }
  return map;
}

// --- Admin CRUD (taxonomy management) ---------------------------------------
// Expertise is many-to-many, so deletion just drops the join rows (no "Other"
// fallback like the single-select function/seniority taxonomies).

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  let slug = base;
  let n = 2;
  while (await db.prepare("SELECT id FROM expertise WHERE slug = ?").bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createExpertise(name: string): Promise<void> {
  const db = getDb();
  const slug = await uniqueSlug(slugify(name));
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM expertise").first<{ n: number }>();
  await db
    .prepare("INSERT INTO expertise (name, slug, sort_order, created_at) VALUES (?, ?, ?, ?)")
    .bind(name, slug, order?.n ?? 1, Date.now())
    .run();
}

export async function renameExpertise(id: number, name: string): Promise<void> {
  // Slug stays stable so existing filter links keep working.
  await getDb().prepare("UPDATE expertise SET name = ? WHERE id = ?").bind(name, id).run();
}

export async function deleteExpertise(id: number): Promise<void> {
  const db = getDb();
  await db.prepare("DELETE FROM user_expertise WHERE expertise_id = ?").bind(id).run();
  await db.prepare("DELETE FROM expertise WHERE id = ?").bind(id).run();
}
