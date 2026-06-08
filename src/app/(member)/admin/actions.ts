"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteImage } from "@/lib/media";
import { findOrCreateCompany } from "@/lib/companies";
import { regionFromForm, validateRegion, locationLabel } from "@/lib/region";
import { generateToken } from "@/lib/crypto";
import { emailAccessApproved, emailAccessApprovedSetPassword, emailAccessDeclined, emailEnabled, emailTest, siteUrl } from "@/lib/email";
import type { Company } from "@/lib/types";

const SET_PASSWORD_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export type TestEmailState = { ok?: string; error?: string };

// Send the signed-in admin a branded test email to confirm Resend is wired up.
export async function sendTestEmail(_prev: TestEmailState, _formData: FormData): Promise<TestEmailState> {
  const me = await requireAdmin();
  if (!emailEnabled()) {
    return { error: "Email isn’t configured yet — set RESEND_API_KEY and EMAIL_FROM, then redeploy." };
  }
  await emailTest(me.email, me.name);
  return { ok: `Sent a test email to ${me.email}. Check your inbox (and Resend → Logs).` };
}

export type AdminMemberState = { ok?: boolean; error?: string };

// Edit another member's profile details (admin only).
export async function adminUpdateMember(_prev: AdminMemberState, formData: FormData): Promise<AdminMemberState> {
  await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) return { error: "Unknown member." };
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const email = field("email").toLowerCase();
  if (!email) return { error: "Email is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };

  const regionError = validateRegion(field("city"), field("state"), field("zip"));
  if (regionError) return { error: regionError };

  const db = getDb();
  const clash = await db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").bind(email, userId).first();
  if (clash) return { error: "Another member already uses that email." };

  const region = await regionFromForm(field("city"), field("state"), field("zip"));
  const companyId = await findOrCreateCompany(field("company_name"), userId);

  await db
    .prepare(
      `UPDATE users SET
         email = ?, name = ?, role = ?, pronouns = ?,
         location = ?, city = ?, state = ?, zip = ?, dma_slug = ?, dma_name = ?,
         phone = ?, website = ?, linkedin = ?, twitter = ?, bio = ?, company_id = ?
       WHERE id = ?`
    )
    .bind(
      email, field("name"), field("role"), field("pronouns"),
      locationLabel(region.city, region.state), region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      field("phone"), field("website"), field("linkedin"), field("twitter"), field("bio"), companyId, userId
    )
    .run();

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${userId}/edit`);
  revalidatePath("/directory");
  revalidatePath(`/directory/${userId}`);
  return { ok: true };
}

// Approve a pending access request.
export async function approveMember(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) return;
  const db = getDb();
  await db
    .prepare("UPDATE users SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?")
    .bind(Date.now(), me.id, userId)
    .run();
  const u = await db
    .prepare("SELECT email, name, needs_password FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email: string; name: string; needs_password: number }>();
  if (u?.email) {
    if (u.needs_password === 1) {
      // Application created without a password (marketing form): send a link to
      // set one, reusing the password-reset token mechanism.
      const token = generateToken(32);
      const now = Date.now();
      await db
        .prepare("INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
        .bind(token, userId, now + SET_PASSWORD_TTL, now)
        .run();
      await emailAccessApprovedSetPassword(u.email, u.name, siteUrl(`/reset-password?token=${token}`));
    } else {
      await emailAccessApproved(u.email, u.name);
    }
  }
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  revalidatePath("/directory");
}

// Decline a pending request (kept on record; the person can't access the portal).
export async function declineMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) return;
  const db = getDb();
  await db.prepare("UPDATE users SET status = 'declined' WHERE id = ?").bind(userId).run();
  const u = await db.prepare("SELECT email, name FROM users WHERE id = ?").bind(userId).first<{ email: string; name: string }>();
  if (u?.email) await emailAccessDeclined(u.email, u.name);
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

// Mark an invitation request from the marketing site as handled (kept on record).
export async function markInviteHandled(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("requestId"));
  if (!id) return;
  await getDb().prepare("UPDATE invite_requests SET status = 'handled' WHERE id = ?").bind(id).run();
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

// Delete an invitation request outright.
export async function deleteInviteRequest(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("requestId"));
  if (!id) return;
  await getDb().prepare("DELETE FROM invite_requests WHERE id = ?").bind(id).run();
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

// Promote or demote a member. Admins can't demote themselves (avoids lockout).
export async function setAdmin(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const userId = Number(formData.get("userId"));
  const makeAdmin = String(formData.get("makeAdmin")) === "1";
  if (!userId) return;
  if (userId === me.id && !makeAdmin) return; // refuse self-demotion

  await getDb().prepare("UPDATE users SET is_admin = ? WHERE id = ?").bind(makeAdmin ? 1 : 0, userId).run();
  revalidatePath("/admin/members");
}

// Remove a member entirely, along with their sessions and RSVPs.
export async function removeMember(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId || userId === me.id) return; // can't remove yourself

  const db = getDb();
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  await db.prepare("DELETE FROM rsvps WHERE user_id = ?").bind(userId).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  revalidatePath("/admin/members");
  revalidatePath("/directory");
}

// Delete a company: unlink its members, drop its logo, remove the row.
export async function deleteCompany(formData: FormData): Promise<void> {
  await requireAdmin();
  const companyId = Number(formData.get("companyId"));
  if (!companyId) return;

  const db = getDb();
  const company = await db
    .prepare("SELECT logo_key FROM companies WHERE id = ?")
    .bind(companyId)
    .first<Pick<Company, "logo_key">>();
  if (company?.logo_key) await deleteImage(company.logo_key);

  await db.prepare("UPDATE users SET company_id = 0 WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM companies WHERE id = ?").bind(companyId).run();
  revalidatePath("/admin/companies");
  revalidatePath("/companies");
}
