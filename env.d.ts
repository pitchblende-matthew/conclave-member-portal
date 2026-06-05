// Bindings + env vars available at runtime via getCloudflareContext().env
interface CloudflareEnv {
  DB: D1Database;
  NEXT_PUBLIC_BASE_PATH?: string;
}
