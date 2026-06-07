"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function markInviteHandled(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("requestId"));
  if (!id) return;
  await getDb().prepare("UPDATE invite_requests SET status = 'handled' WHERE id = ?").bind(id).run();
  revalidatePath("/admin/invite-requests");
  revalidatePath("/admin");
}

export async function deleteInviteRequest(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("requestId"));
  if (!id) return;
  await getDb().prepare("DELETE FROM invite_requests WHERE id = ?").bind(id).run();
  revalidatePath("/admin/invite-requests");
  revalidatePath("/admin");
}
