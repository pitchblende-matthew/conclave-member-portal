import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runIntros } from "@/lib/intros";

export const dynamic = "force-dynamic";

// Drive the monthly warm-intro flow: draft this month's pairings + notify admins,
// or auto-send a draft that's sat past the grace window. Webflow Cloud has no
// cron, so an external scheduler pings this daily (see .github/workflows/intros.yml)
// and the runner decides what to do. Protected by ?key=<DIGEST_SECRET>. Idempotent
// per month; admins review and send from /admin/intros.
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

  const result = await runIntros();
  return Response.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
