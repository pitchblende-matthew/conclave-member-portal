import { getDb } from "./db";

export type ContentType = "topic" | "event" | "briefing";
export type TagKind = "industry" | "function";
export type UsedTag = { id: number; name: string; slug: string; n: number };

// Read the industry/function ids submitted from a TagPicker (checkbox groups
// named "industry" and "function").
export function readTagIds(formData: FormData): { industry: number[]; function: number[] } {
  const nums = (key: string) =>
    formData.getAll(key).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  return { industry: nums("industry"), function: nums("function") };
}

// Replace all tags for one content item.
export async function setContentTags(type: ContentType, id: number, industryIds: number[], functionIds: number[]): Promise<void> {
  const db = getDb();
  await db.prepare("DELETE FROM content_tags WHERE content_type = ? AND content_id = ?").bind(type, id).run();
  const rows: { kind: TagKind; taxon: number }[] = [
    ...[...new Set(industryIds)].map((t) => ({ kind: "industry" as const, taxon: t })),
    ...[...new Set(functionIds)].map((t) => ({ kind: "function" as const, taxon: t })),
  ];
  for (const r of rows) {
    await db
      .prepare("INSERT OR IGNORE INTO content_tags (content_type, content_id, kind, taxon_id) VALUES (?, ?, ?, ?)")
      .bind(type, id, r.kind, r.taxon)
      .run();
  }
}

// Selected tag ids for one item (for edit forms).
export async function getContentTagIds(type: ContentType, id: number): Promise<{ industry: number[]; function: number[] }> {
  const { results } = await getDb()
    .prepare("SELECT kind, taxon_id FROM content_tags WHERE content_type = ? AND content_id = ?")
    .bind(type, id)
    .all<{ kind: string; taxon_id: number }>();
  return {
    industry: results.filter((r) => r.kind === "industry").map((r) => r.taxon_id),
    function: results.filter((r) => r.kind === "function").map((r) => r.taxon_id),
  };
}

// Tag display names keyed by content_id, for a set of items in one list.
export async function tagsForItems(type: ContentType, ids: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (!ids.length) return map;
  const ph = ids.map(() => "?").join(",");
  const { results } = await getDb()
    .prepare(
      `SELECT ct.content_id AS id,
              CASE ct.kind WHEN 'industry' THEN i.name ELSE f.name END AS name
       FROM content_tags ct
       LEFT JOIN industries i ON ct.kind = 'industry' AND i.id = ct.taxon_id
       LEFT JOIN functions f ON ct.kind = 'function' AND f.id = ct.taxon_id
       WHERE ct.content_type = ? AND ct.content_id IN (${ph})
       ORDER BY ct.kind, name COLLATE NOCASE`
    )
    .bind(type, ...ids)
    .all<{ id: number; name: string | null }>();
  for (const r of results) {
    if (!r.name) continue;
    const arr = map.get(r.id) ?? [];
    arr.push(r.name);
    map.set(r.id, arr);
  }
  return map;
}

// Industries / functions actually used to tag this content type — powers filter chips.
export async function tagsInUse(type: ContentType): Promise<{ industries: UsedTag[]; functions: UsedTag[] }> {
  const db = getDb();
  const q = (kind: TagKind, table: "industries" | "functions") =>
    db
      .prepare(
        `SELECT t.id, t.name, t.slug, COUNT(*) AS n
         FROM content_tags ct JOIN ${table} t ON t.id = ct.taxon_id
         WHERE ct.content_type = ? AND ct.kind = ?
         GROUP BY t.id ORDER BY t.sort_order, t.name COLLATE NOCASE`
      )
      .bind(type, kind)
      .all<UsedTag>();
  const [industries, functions] = await Promise.all([q("industry", "industries"), q("function", "functions")]);
  return { industries: industries.results, functions: functions.results };
}

// EXISTS condition to filter a content query by a tag. `alias` is the content
// table alias whose `.id` joins to content_tags.content_id.
export function tagFilterClause(type: ContentType, alias: string, kind: TagKind, taxonId: number): { sql: string; binds: (string | number)[] } {
  return {
    sql: `EXISTS (SELECT 1 FROM content_tags ct WHERE ct.content_type = ? AND ct.content_id = ${alias}.id AND ct.kind = ? AND ct.taxon_id = ?)`,
    binds: [type, kind, taxonId],
  };
}
