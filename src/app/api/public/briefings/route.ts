import { getDb } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

// Public, read-only feed of published briefings for the marketing site's
// "What we're reading" page. A teaser only: title, one-line summary, topic,
// cover, and — for link briefings — the external article URL. No article
// bodies and nothing member-identifiable is exposed.
type Row = {
  id: number;
  kind: string;
  title: string;
  summary: string;
  url: string;
  cover_url: string;
  published_at: number | null;
  category: string | null;
};

export function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  try {
    const { results } = await getDb()
      .prepare(
        `SELECT b.id, b.kind, b.title, b.summary, b.url, b.cover_url, b.published_at,
                c.name AS category
         FROM briefings b
         LEFT JOIN briefing_categories c ON c.id = b.category_id
         WHERE b.published = 1
         ORDER BY b.published_at DESC, b.id DESC
         LIMIT 30`
      )
      .all<Row>();

    const briefings = results.map((b) => ({
      id: b.id,
      title: b.title,
      summary: (b.summary || "").slice(0, 240),
      category: b.category || null,
      // Link briefings point at the public article; article (in-portal)
      // briefings expose no URL — the marketing page funnels those to apply.
      url: b.kind === "link" ? b.url || "" : "",
      // Only external cover images are surfaced (member-uploaded covers stay
      // inside the portal).
      cover: b.cover_url || "",
      publishedAt: b.published_at,
    }));

    return Response.json(
      { briefings },
      { headers: { ...corsHeaders, "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return Response.json({ briefings: [] }, { status: 200, headers: corsHeaders });
  }
}
