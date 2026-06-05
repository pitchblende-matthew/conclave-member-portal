import { getCloudflareContext } from "@opennextjs/cloudflare";

// Accepted image types -> file extension.
const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Returns the R2 (object storage) binding declared as "MEDIA" in wrangler.json.
// Webflow Cloud provisions the bucket and injects the binding at runtime.
export function getMediaBucket(): R2Bucket {
  const { env } = getCloudflareContext() as unknown as { env: CloudflareEnv };
  if (!env || !env.MEDIA) {
    throw new Error(
      "Object storage binding 'MEDIA' not found. Check the r2_buckets binding in wrangler.json."
    );
  }
  return env.MEDIA;
}

// Builds the in-app URL that serves a stored object (basePath-aware).
export function mediaUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}/api/media/${key}`;
}

export type StoreResult = { key: string } | { error: string };

// Validates and stores an uploaded image under `<prefix>/<unique>.<ext>`.
export async function storeImage(prefix: string, file: unknown): Promise<StoreResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) return { error: "Use a JPG, PNG, or WebP image." };
  if (file.size > MAX_BYTES) return { error: "Image must be 5 MB or smaller." };

  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const data = await file.arrayBuffer();
  await getMediaBucket().put(key, data, { httpMetadata: { contentType: file.type } });
  return { key };
}

// Best-effort delete; never throws (used when replacing or removing media).
export async function deleteImage(key: string): Promise<void> {
  if (!key) return;
  try {
    await getMediaBucket().delete(key);
  } catch {
    // ignore — a stale object is harmless
  }
}
