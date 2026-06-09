import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sendWeeklyDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

// Trigger the weekly digest from an external scheduler (Webflow Cloud doesn't
// expose cron). Protected by ?key=<DIGEST_SECRET>. Add &force=1 to bypass the
// "already sent recently / nothing new" guards.
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

  const result = await sendWeeklyDigest({ force: url.searchParams.get("force") === "1" });
  return Response.json(result);
}
