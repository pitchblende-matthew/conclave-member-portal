"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createFeedback, type FeedbackKind } from "@/lib/feedback";
import { notifyAdmins } from "@/lib/notifications";

export type FeedbackState = { ok?: boolean; error?: string };

export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const user = await requireUser();
  if (user.alpha_tester !== 1) return { error: "This isn’t available on your account." };

  const kind = String(formData.get("kind") ?? "") as FeedbackKind;
  if (kind !== "bug" && kind !== "feature") return { error: "Pick bug or feature." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Add a short description." };

  // Keep only same-origin app paths; never store an arbitrary URL.
  const rawPage = String(formData.get("page") ?? "");
  const page = rawPage.startsWith("/") && !rawPage.startsWith("//") ? rawPage.slice(0, 300) : "";

  await createFeedback(user.id, kind, page, body.slice(0, 4000));
  await notifyAdmins("feedback", { actorId: user.id });
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  return { ok: true };
}
