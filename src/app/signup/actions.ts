"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { regionFromForm, validateRegion, locationLabel } from "@/lib/region";

export type SignupState = { error?: string };

// Step 1 — Request access.
// Anyone may request access; the account starts as `pending` until an admin
// approves it. A valid invite code from a member auto-approves on the spot.
// Bootstrap: the very first account needs no invite and becomes an approved admin.
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const email = field("email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = field("name");
  const company = field("company");
  const role = field("role");
  const linkedin = field("linkedin");
  const invite = field("invite");
  const city = field("city");
  const state = field("state");
  const zip = field("zip");

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  const regionError = validateRegion(city, state, zip);
  if (regionError) return { error: regionError };

  const db = getDb();
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return { error: "An account with that email already exists." };

  const countRow = await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
  const isFirstUser = (countRow?.n ?? 0) === 0;

  // Validate an invite if one was supplied.
  let inviteValid = false;
  if (invite && !isFirstUser) {
    const inv = await db
      .prepare("SELECT token FROM invites WHERE token = ? AND used_by IS NULL")
      .bind(invite)
      .first();
    if (!inv) return { error: "That invitation is invalid or has already been used." };
    inviteValid = true;
  }

  const approved = isFirstUser || inviteValid;
  const now = Date.now();
  const hash = await hashPassword(password);
  const region = await regionFromForm(city, state, zip);

  const res = await db
    .prepare(
      `INSERT INTO users (email, password_hash, name, company, role, linkedin,
         location, city, state, zip, dma_slug, dma_name,
         is_admin, status, approved_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      email, hash, name, company, role, linkedin,
      locationLabel(region.city, region.state), region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      isFirstUser ? 1 : 0,
      approved ? "approved" : "pending",
      approved ? now : null,
      now
    )
    .run();

  const userId = Number(res.meta.last_row_id);
  if (inviteValid) {
    await db
      .prepare("UPDATE invites SET used_by = ?, used_at = ? WHERE token = ?")
      .bind(userId, now, invite)
      .run();
  }

  await createSession(userId);
  // Approved members go straight to onboarding; everyone else waits for approval.
  redirect(approved ? "/onboarding" : "/pending");
}
