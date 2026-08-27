import { applyIntroUnsubscribe } from "@/lib/intros";

export const dynamic = "force-dynamic";

// One-click unsubscribe from the monthly warm intros (token-authed, no login).
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ok = await applyIntroUnsubscribe(Number(url.searchParams.get("u")), url.searchParams.get("t") || "");
  const heading = ok ? "Unsubscribed" : "Link invalid";
  const message = ok
    ? "You won&rsquo;t receive monthly intros anymore. You can turn them back on anytime in your profile."
    : "This unsubscribe link is invalid or has expired.";
  const body = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading} — Conclave</title></head>
  <body style="margin:0;background:#f2ede4;color:#2c3a31;font-family:Georgia,'Times New Roman',serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div style="max-width:440px;text-align:center;background:#fbf8f1;border:1px solid #e7ded0;border-radius:14px;padding:2.5rem 2rem;">
      <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7c7a52;">Conclave</div>
      <h1 style="font-weight:500;font-size:2rem;margin:0.6rem 0 0.5rem;">${heading}</h1>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#33322b;margin:0;">${message}</p>
    </div>
  </body></html>`;
  return new Response(body, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
