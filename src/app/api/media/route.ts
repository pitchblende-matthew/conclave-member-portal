import { getSessionUser } from "@/lib/auth";
import { getMediaBucket } from "@/lib/media";

export const dynamic = "force-dynamic";

// Serves member/company images from R2. The object key is passed as a query
// param (not a path segment) so the URL doesn't end in an image extension —
// Webflow Cloud's edge would otherwise route a `.png`/`.jpg` request to its
// static-asset layer and 404 before reaching this Worker.
//
// Gated to signed-in members; the session cookie is scoped to the mount path
// and sent automatically with same-origin requests.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return new Response("Bad request", { status: 400 });

  const object = await getMediaBucket().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
