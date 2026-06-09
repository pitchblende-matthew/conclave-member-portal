"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setFeedbackStatus, deleteFeedback, FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/feedback";

const VALID = new Set(FEEDBACK_STATUSES.map((s) => s.value));

export async function updateFeedbackStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !VALID.has(status as FeedbackStatus)) return;
  await setFeedbackStatus(id, status as FeedbackStatus);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  revalidatePath("/feedback");
}

export async function removeFeedback(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await deleteFeedback(id);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}
