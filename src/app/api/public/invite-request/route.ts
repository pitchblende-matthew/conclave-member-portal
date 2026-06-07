import { getDb } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import { rateLimited } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/notifications";
import { emailAdminsInviteRequest } from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function OPTIONS() {
  return corsPreflight();
}

// Public endpoint for the marketing site's "request an invitation" form.
// Accepts form-encoded or JSON. Rate-limited per IP. Records a lead for admins.
export async function POST(req: Request) {
  let name = "";
  let email = "";
  let note = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = (await req.json().catch(() => ({}))) as Record<string, string>;
      name = b.name ?? b.Name ?? "";
      email = b.email ?? b.Email ?? "";
      note = b.note ?? b.message ?? b.Message ?? "";
    } else {
      const fd = await req.formData();
      const pick = (...keys: string[]) => keys.map((k) => fd.get(k)).find((v) => v != null) ?? "";
      name = String(pick("name", "Name", "full-name", "Full-Name"));
      email = String(pick("email", "Email", "email-address", "Email-Address"));
      note = String(pick("note", "message", "Message", "notes"));
    }
  } catch {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400, headers: corsHeaders });
  }

  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Please enter a valid email." }, { status: 400, headers: corsHeaders });
  }

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  if (await rateLimited(`invitereq:${ip}`, 5, 60 * 60 * 1000)) {
    return Response.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429, headers: corsHeaders });
  }

  const db = getDb();
  // Skip obvious duplicates still awaiting review.
  const dup = await db.prepare("SELECT id FROM invite_requests WHERE email = ? AND status = 'new'").bind(email).first();
  if (!dup) {
    await db
      .prepare("INSERT INTO invite_requests (name, email, note, status, created_at) VALUES (?, ?, ?, 'new', ?)")
      .bind(name.trim().slice(0, 200), email, note.trim().slice(0, 1000), Date.now())
      .run();
    await notifyAdmins("invite_request");
    await emailAdminsInviteRequest(name.trim(), email);
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
}
