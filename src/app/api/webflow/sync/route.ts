import { getCloudflareContext } from "@opennextjs/cloudflare";
import { syncEventsToWebflow } from "@/lib/webflow-sync";

export const dynamic = "force-dynamic";

// Push approved, upcoming events into the Webflow "Events" collection so each
// gets its own page on the marketing site. Webflow Cloud doesn't expose cron,
// so this is triggered by the same external scheduler as the weekly digest —
// point it at this URL on whatever cadence you like (every 10-15 min is plenty).
//
// Protected by ?key=<WEBFLOW_SYNC_SECRET>.
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

  const result = await syncEventsToWebflow();
  return Response.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
