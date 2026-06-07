// Public marketing-site endpoints are read by the Webflow site (a different
// origin), so they need permissive CORS. Data exposed is non-sensitive and the
// write endpoint is rate-limited.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}
