"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";

export type SignupState = { error?: string };

// Invite-only signup.
// Bootstrap rule: if there are zero users yet, the first signup is allowed
// without an invite and is made an admin (so you can issue invites afterward).
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const invite = String(formData.get("invite") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  const db = getDb();

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return { error: "An account with that email already exists." };

  const countRow = await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
  const isFirstUser = (countRow?.n ?? 0) === 0;

  let inviteValid = false;
  if (!isFirstUser) {
    if (!invite) return { error: "An invitation code is required to join." };
    const inv = await db
      .prepare("SELECT token FROM invites WHERE token = ? AND used_by IS NULL")
      .bind(invite)
      .first();
    if (!inv) return { error: "That invitation is invalid or has already been used." };
    inviteValid = true;
  }

  const now = Date.now();
  const hash = await hashPassword(password);
  const res = await db
    .prepare(
      "INSERT INTO users (email, password_hash, name, is_admin, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(email, hash, name, isFirstUser ? 1 : 0, now)
    .run();

  const userId = Number(res.meta.last_row_id);

  if (inviteValid) {
    await db
      .prepare("UPDATE invites SET used_by = ?, used_at = ? WHERE token = ?")
      .bind(userId, now, invite)
      .run();
  }

  await createSession(userId);
  redirect("/profile");
}
