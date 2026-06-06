"use server";

import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { emailPasswordChanged } from "@/lib/email";

export type ResetState = { ok?: boolean; error?: string };

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token) return { error: "This reset link is invalid." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const db = getDb();
  const row = await db
    .prepare("SELECT token, user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ?")
    .bind(token)
    .first<{ token: string; user_id: number; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at !== null || row.expires_at < Date.now()) {
    return { error: "This reset link has expired or already been used. Request a new one." };
  }

  const hash = await hashPassword(password);
  const now = Date.now();
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, row.user_id).run();
  await db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token = ?").bind(now, token).run();
  // Invalidate any other outstanding tokens and existing sessions for safety.
  await db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, row.user_id).run();
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id).run();

  const user = await db.prepare("SELECT email FROM users WHERE id = ?").bind(row.user_id).first<{ email: string }>();
  if (user?.email) await emailPasswordChanged(user.email);

  return { ok: true };
}
