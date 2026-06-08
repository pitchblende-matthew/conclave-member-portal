import { getDb } from "./db";
import { US_STATES, STATE_ABBRS } from "./us-states";

export { US_STATES };

export type ZipInfo = { zip: string; city: string; state: string; dma_slug: string; dma_name: string };
export type RegionFields = { city: string; state: string; zip: string; dma_slug: string; dma_name: string };

// Look up a 5-digit US ZIP in the bundled crosswalk.
export async function lookupZip(zip: string): Promise<ZipInfo | null> {
  const z = String(zip ?? "").trim();
  if (!/^\d{5}$/.test(z)) return null;
  const row = await getDb()
    .prepare("SELECT zip, city, state, dma_slug, dma_name FROM zip_dma WHERE zip = ?")
    .bind(z)
    .first<ZipInfo>();
  return row ?? null;
}

// Build the region columns from submitted City / State / ZIP. The DMA is derived
// from the ZIP crosswalk; we keep the member's typed city/state for display.
export async function regionFromForm(city: string, state: string, zip: string): Promise<RegionFields> {
  const info = await lookupZip(zip);
  return {
    city: city.trim(),
    state: state.trim().toUpperCase(),
    zip: zip.trim(),
    dma_slug: info?.dma_slug ?? "",
    dma_name: info?.dma_name ?? "",
  };
}

// Validate a US City/State/ZIP triple. Returns an error string, or null if OK.
export function validateRegion(city: string, state: string, zip: string): string | null {
  if (!city.trim()) return "Enter your city.";
  if (!STATE_ABBRS.has(state.trim().toUpperCase())) return "Choose your state.";
  if (!/^\d{5}$/.test(zip.trim())) return "Enter a 5-digit ZIP code.";
  return null;
}

// "City, ST" for single-line display (also kept in the legacy `location` column).
export function locationLabel(city: string, state: string): string {
  return [city.trim(), state.trim().toUpperCase()].filter(Boolean).join(", ");
}

// Distinct markets present in a table, with counts — powers the filter menus.
export async function marketsIn(table: "users" | "companies" | "events" | "listings"): Promise<{ slug: string; name: string; n: number }[]> {
  const where = table === "users" ? "WHERE status = 'approved' AND dma_slug != ''" : "WHERE dma_slug != ''";
  const { results } = await getDb()
    .prepare(
      `SELECT dma_slug AS slug, dma_name AS name, COUNT(*) AS n
       FROM ${table} ${where} GROUP BY dma_slug ORDER BY dma_name COLLATE NOCASE`
    )
    .all<{ slug: string; name: string; n: number }>();
  return results;
}

// Resolve the active area filter from the ?area query param.
//   "all"      -> null (show everything)
//   "<slug>"   -> that market
//   undefined  -> the viewer's own DMA (near-me default), or null if they have none
export function resolveArea(param: string | undefined, myDmaSlug: string): string | null {
  if (param === "all") return null;
  if (param && param.length) return param;
  return myDmaSlug || null;
}
