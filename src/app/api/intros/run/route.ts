import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runIntros } from "@/lib/intros";

export const dynamic = "force-dynamic";

// Run the monthly warm-intro pairing + emails. Webflow Cloud has no cron, so an
// external scheduler pings this monthly (see .github/workflows/intros.yml).
// Protected by ?key=<DIGEST_SECRET>. Idempotent per month; &force=1 clears the
// current round and re-pairs (admin/testing — it re-sends).
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

  const result = await runIntros({ force: url.searchParams.get("force") === "1" });
  return Response.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
