import { getDb } from "./db";
import { stripHtml } from "./html";

// One-off maintenance: some briefings were stored with raw/entity-encoded HTML
// in their summary (from feeds that ship <description> as encoded markup, before
// the two-pass stripHtml fix). Re-clean every stored summary so the website (and
// digests) show plain text. Insert-safe + idempotent: only rows whose cleaned
// summary differs are updated, so re-runs are no-ops.

export type CleanupResult = {
  ok: boolean;
  scanned: number;
  cleaned: number;
  samples: { id: number; before: string; after: string }[];
  errors: string[];
};

// A summary "needs cleaning" if stripping HTML changes it (tags, entity-encoded
// tags, stray entities, or collapsible whitespace).
export async function cleanupBriefingSummaries(): Promise<CleanupResult> {
  const db = getDb();
  const result: CleanupResult = { ok: true, scanned: 0, cleaned: 0, samples: [], errors: [] };
  const { results } = await db
    .prepare("SELECT id, summary FROM briefings WHERE summary IS NOT NULL AND summary != ''")
    .all<{ id: number; summary: string }>();

  for (const row of results) {
    result.scanned += 1;
    const cleaned = stripHtml(row.summary);
    if (cleaned === row.summary) continue;
    try {
      await db.prepare("UPDATE briefings SET summary = ?, updated_at = ? WHERE id = ?").bind(cleaned, Date.now(), row.id).run();
      result.cleaned += 1;
      if (result.samples.length < 5) {
        result.samples.push({ id: row.id, before: row.summary.slice(0, 120), after: cleaned.slice(0, 120) });
      }
    } catch (e) {
      result.errors.push(`briefing ${row.id}: ${String(e)}`);
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
