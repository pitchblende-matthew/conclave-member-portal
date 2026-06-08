import { getDb } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import { rateLimited } from "@/lib/rate-limit";
import { hashPassword, generateToken } from "@/lib/crypto";
import { emailAccessPending, emailAdminsNewRequest } from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function OPTIONS() {
  return corsPreflight();
}

// Public endpoint for the marketing site's access form. Accepts form-encoded or
// JSON, rate-limited per IP. Creates a pending account application — the same
// queue admins use for sign-ups — rather than a separate invitation request, so
// there's a single intake workflow. The applicant sets a password via a link
// once an admin approves them.
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
  // Email is unique; if an account already exists (applied, invited, or a
  // member) we silently no-op so the form can't probe who's registered.
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (!existing) {
    // No password yet — store an unusable placeholder and flag the account so
    // approval sends a "set your password" link.
    const placeholder = await hashPassword(generateToken(32));
    await db
      .prepare(
        `INSERT INTO users (email, password_hash, name, apply_note, needs_password, status, created_at)
         VALUES (?, ?, ?, ?, 1, 'pending', ?)`
      )
      .bind(email, placeholder, name.trim().slice(0, 200), note.trim().slice(0, 1000), Date.now())
      .run();
    await emailAccessPending(email, name.trim());
    await emailAdminsNewRequest(name.trim());
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
}
