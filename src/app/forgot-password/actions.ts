"use server";

import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/crypto";
import { emailPasswordReset, siteUrl } from "@/lib/email";

export type ForgotState = { ok?: boolean; error?: string };

const ONE_HOUR = 60 * 60 * 1000;

// Always reports success, whether or not the email exists, to avoid leaking
// which addresses are registered.
export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };

  const db = getDb();
  const user = await db.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first<{ id: number; email: string }>();
  if (user) {
    const token = generateToken(32);
    const now = Date.now();
    await db
      .prepare("INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(token, user.id, now + ONE_HOUR, now)
      .run();
    await emailPasswordReset(user.email, siteUrl(`/reset-password?token=${token}`));
  }
  return { ok: true };
}
