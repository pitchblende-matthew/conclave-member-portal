import { getCloudflareContext } from "@opennextjs/cloudflare";

// The app's mount base path (e.g. "/portal"). Webflow Cloud applies the mount to
// routing, but does NOT inline NEXT_PUBLIC_BASE_PATH into the build — so
// `process.env.NEXT_PUBLIC_BASE_PATH` reads empty at runtime. Hand-built links
// and redirects (raw <a href>, Response Location headers) therefore have to read
// the mount from the Cloudflare env binding, or they drop the mount and resolve
// against the site root (a Webflow 404). next/link handles basePath on its own,
// so this is only for URLs we assemble by hand.
export function mountPath(): string {
  try {
    const { env } = getCloudflareContext() as unknown as {
      env: { NEXT_PUBLIC_BASE_PATH?: string; COSMIC_MOUNT_PATH?: string };
    };
    return (env?.NEXT_PUBLIC_BASE_PATH || env?.COSMIC_MOUNT_PATH || "").replace(/\/$/, "");
  } catch {
    return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  }
}
