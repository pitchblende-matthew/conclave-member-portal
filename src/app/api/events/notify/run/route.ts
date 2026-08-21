import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runEventEmails } from "@/lib/event-emails";

export const dynamic = "force-dynamic";

// Send due event emails (new-event announcements + 1-week/3-day/1-day reminders).
// Webflow Cloud has no cron, so an external scheduler pings this on a cadence
// (see .github/workflows/event-emails.yml). Protected by ?key=<DIGEST_SECRET>,
// the same secret used by the weekly digest. All sends are idempotent, so extra
// runs are harmless.
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

  const result = await runEventEmails();
  return Response.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
