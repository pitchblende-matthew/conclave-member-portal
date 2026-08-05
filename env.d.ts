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
  // Webflow CMS sync (marketing-site per-event pages). See src/lib/webflow-sync.ts.
  WEBFLOW_API_TOKEN?: string; // site API token with CMS read/write
  WEBFLOW_EVENTS_COLLECTION_ID?: string; // the "Events" collection id
  WEBFLOW_SYNC_SECRET?: string; // shared secret guarding /api/webflow/sync
}
