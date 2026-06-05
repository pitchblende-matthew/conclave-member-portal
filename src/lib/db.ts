import { getCloudflareContext } from "@opennextjs/cloudflare";

// Returns the D1 (SQLite) binding declared as "DB" in wrangler.json.
// Webflow Cloud provisions the database and injects the binding at runtime.
export function getDb(): D1Database {
  const { env } = getCloudflareContext() as unknown as { env: CloudflareEnv };
  if (!env || !env.DB) {
    throw new Error(
      "D1 binding 'DB' not found. Check the d1_databases binding in wrangler.json."
    );
  }
  return env.DB;
}
