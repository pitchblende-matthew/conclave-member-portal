// Bindings + env vars available at runtime via getCloudflareContext().env
interface CloudflareEnv {
  DB: D1Database;
  // Object storage (R2) for member/company photos. Provisioned by Webflow Cloud
  // from the r2_buckets binding in wrangler.json.
  MEDIA: R2Bucket;
  NEXT_PUBLIC_BASE_PATH?: string;
  // Webflow Cloud's mount path for the environment (e.g. "/portal"), available
  // at runtime even when NEXT_PUBLIC_BASE_PATH isn't inlined into the build.
  COSMIC_MOUNT_PATH?: string;
  // Comma-separated extra origins trusted for Server Actions (custom domains).
  SERVER_ACTIONS_ALLOWED_ORIGINS?: string;
}
