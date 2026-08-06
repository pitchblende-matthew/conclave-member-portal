import { getCloudflareContext } from "@opennextjs/cloudflare";
import { syncBriefingsFromPitchblende } from "@/lib/briefings-sync";

export const dynamic = "force-dynamic";

// Pull the latest published pitchblende.net Insights posts into the briefings
// section as 'link' entries. Webflow Cloud has no cron, so this is triggered by
// an external scheduler (see .github/workflows/briefings-sync.yml) on a daily
// cadence — new posts are rare, and the sync is insert-only + idempotent.
//
// Shares the WEBFLOW_SYNC_SECRET guard with the events sync.
export async function GET(req: Request): Promise<Response> {
  let secret = "";
  try {
    const { env } = getCloudflareContext() as unknown as { env: { WEBFLOW_SYNC_SECRET?: string } };
    secret = env?.WEBFLOW_SYNC_SECRET || "";
  } catch {
    /* not in CF context */
  }

  const url = new URL(req.url);
  if (!secret || url.searchParams.get("key") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await syncBriefingsFromPitchblende();
  return Response.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
