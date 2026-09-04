"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setFeedbackStatus, deleteFeedback, replyToFeedback, FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/feedback";
import { notify } from "@/lib/notifications";
import { emailFeedbackReply } from "@/lib/email";
import { slackDmFeedbackReply } from "@/lib/slack-bridge";

const VALID = new Set(FEEDBACK_STATUSES.map((s) => s.value));

// Reply to a report; the tester is notified (bell + email) so the loop closes.
export async function replyFeedback(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 4000);
  if (!id || !reply) return;
  const rec = await replyToFeedback(id, reply);
  if (rec) {
    await notify(rec.user_id, "feedback_reply", { actorId: me.id });
    await emailFeedbackReply(rec.email, rec.name, reply);
    await slackDmFeedbackReply(rec.user_id, reply);
  }
  revalidatePath("/admin/feedback");
  revalidatePath("/feedback");
}

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
