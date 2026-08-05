import { getDb } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

// Public, read-only feed of approved upcoming events for the marketing site.
// Deliberately excludes attendee lists and join links.
type Row = {
  id: number;
  title: string;
  description: string;
  location: string;
  is_virtual: number;
  dma_name: string;
  starts_at: number;
  webflow_slug: string;
};

export function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  try {
    const { results } = await getDb()
      .prepare(
        `SELECT id, title, description, location, is_virtual, dma_name, starts_at, webflow_slug
         FROM events
         WHERE status = 'approved' AND starts_at > ?
         ORDER BY starts_at ASC LIMIT 50`
      )
      .bind(Date.now())
      .all<Row>();

    const events = results.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.starts_at, // unix ms (UTC); render in local tz on the client
      location: e.location || "",
      isVirtual: e.is_virtual === 1,
      market: e.dma_name || null,
      summary: (e.description || "").slice(0, 240),
      // Slug of the event's page on the marketing site (/event/{slug}), present
      // once the Webflow sync has created it; "" until then so cards stay
      // unlinked rather than pointing at a page that doesn't exist yet.
      slug: e.webflow_slug || "",
    }));

    return Response.json(
      { events },
      { headers: { ...corsHeaders, "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return Response.json({ events: [] }, { status: 200, headers: corsHeaders });
  }
}
