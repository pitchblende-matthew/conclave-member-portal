// Builds the SQL condition that limits a member listing to the people the viewer
// is allowed to discover, honoring each member's optional discoverability limits:
//   discover_region_only — only same-market viewers
//   discover_peers_only  — only viewers sharing the member's function or seniority
// The viewer always sees themselves; admins see everyone. Designed to be ANDed
// into a WHERE clause on a users alias (default "u").
export type Viewer = {
  id: number;
  is_admin: number;
  dma_slug: string;
  function_id: number;
  seniority_id: number;
};

export function visibleMembersClause(viewer: Viewer, alias = "u"): { sql: string; binds: (string | number)[] } {
  if (viewer.is_admin === 1) return { sql: "1 = 1", binds: [] };
  const a = alias;
  const sql = `(
    ${a}.id = ?
    OR (
      (${a}.discover_region_only = 0 OR ${a}.dma_slug = ?)
      AND (
        ${a}.discover_peers_only = 0
        OR (${a}.function_id <> 0 AND ${a}.function_id = ?)
        OR (${a}.seniority_id <> 0 AND ${a}.seniority_id = ?)
      )
    )
  )`;
  return { sql, binds: [viewer.id, viewer.dma_slug, viewer.function_id, viewer.seniority_id] };
}
