import { getSessionUser } from "@/lib/auth";
import { getMediaBucket } from "@/lib/media";

export const dynamic = "force-dynamic";

// Serves member/company images from R2. Gated to signed-in members so portal
// media stays private. The session cookie is scoped to the mount path, so it is
// sent with these same-origin requests automatically.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { key: segments } = await params;
  const key = segments.join("/");
  const object = await getMediaBucket().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
