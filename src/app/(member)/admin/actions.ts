"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteImage } from "@/lib/media";
import type { Company } from "@/lib/types";

// Approve a pending access request.
export async function approveMember(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) return;
  await getDb()
    .prepare("UPDATE users SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?")
    .bind(Date.now(), me.id, userId)
    .run();
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  revalidatePath("/directory");
}

// Decline a pending request (kept on record; the person can't access the portal).
export async function declineMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) return;
  await getDb().prepare("UPDATE users SET status = 'declined' WHERE id = ?").bind(userId).run();
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
