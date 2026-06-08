"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import type { User } from "@/lib/types";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<User>();

  // Approved members who applied via the website have no password yet — point
  // them to the set-password link rather than a confusing "incorrect" error.
  if (user?.needs_password === 1) {
    return {
      error:
        "Your membership is approved, but you haven’t set a password yet. Check your email for the link to set one, or use “Forgot your password?” below.",
    };
  }

  // Kept deliberately generic (same message whether the email is unknown or the
  // password is wrong) so the form can't be used to discover who has an account.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "That email or password isn’t right. Please try again." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}
