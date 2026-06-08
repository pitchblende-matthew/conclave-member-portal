"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setFeedbackStatus, deleteFeedback } from "@/lib/feedback";

export async function resolveFeedback(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || (status !== "open" && status !== "closed")) return;
  await setFeedbackStatus(id, status);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}

export async function removeFeedback(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await deleteFeedback(id);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}
