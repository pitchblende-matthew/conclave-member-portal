import { destroySession } from "@/lib/auth";
import { mountPath } from "@/lib/base-path";

export const dynamic = "force-dynamic";

// Clear the session, then land on the signed-out confirmation page.
// A *relative* Location is used deliberately: behind the Webflow Cloud proxy the
// request's host is internal, so building an absolute URL from `request.url`
// would redirect the browser to an unreachable host (and look like "no page").
// A relative target resolves against the public domain the visitor is on.
export async function GET() {
  await destroySession();
  const base = mountPath();
  return new Response(null, {
    status: 303,
    headers: { Location: `${base}/signed-out` },
  });
}
