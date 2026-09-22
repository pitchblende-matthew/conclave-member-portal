import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cleanupBriefingSummaries } from "@/lib/briefings-cleanup";

export const dynamic = "force-dynamic";

// One-off maintenance: re-strip HTML from stored briefing summaries so past
// entries (from before the two-pass stripHtml fix) render as clean text.
// Protected by ?key=<DIGEST_SECRET>. Idempotent — only changed rows are written,
// so it's safe to run more than once.
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

  const result = await cleanupBriefingSummaries();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
