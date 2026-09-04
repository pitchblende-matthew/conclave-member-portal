import { getCloudflareContext } from "@opennextjs/cloudflare";
import { discoverBriefings } from "@/lib/briefings-discover";

export const dynamic = "force-dynamic";

// Discover a few fresh industry briefings from curated RSS feeds, rank them with
// Claude, and publish the best. Webflow Cloud has no cron, so an external
// scheduler pings this daily (see .github/workflows/briefings-discover.yml).
// Protected by ?key=<DIGEST_SECRET>. Insert-only + deduped by URL, so extra runs
// are harmless.
export async function GET(req: Request): Promise<Response> {
  let secret = "";
  try {
    const { env } = getCloudflareContext() as unknown as { env: { DIGEST_SECRET?: string } };
    secret = env?.DIGEST_SECRET || "";
  } catch {
    /* not in CF context */
  }

  const url = new URL(req.url);
  if (!secret || url.searchParams.get("key") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await discoverBriefings();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
