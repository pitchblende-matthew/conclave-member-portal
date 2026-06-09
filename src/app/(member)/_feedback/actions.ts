"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { createFeedback, type FeedbackKind } from "@/lib/feedback";
import { storeImage } from "@/lib/media";
import { notifyAdmins } from "@/lib/notifications";
import { emailAdminsFeedback } from "@/lib/email";

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

  // Optional screenshot — only attempt an upload when a file was actually chosen.
  let screenshotKey = "";
  const shot = formData.get("screenshot");
  if (shot instanceof File && shot.size > 0) {
    const result = await storeImage(`feedback/${user.id}`, shot);
    if ("error" in result) return { error: result.error };
    screenshotKey = result.key;
  }

  // Browser/OS, captured server-side from the request header.
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 400);

  await createFeedback(user.id, kind, page, body.slice(0, 4000), screenshotKey, userAgent);
  await notifyAdmins("feedback", { actorId: user.id });
  await emailAdminsFeedback(kind, user.name, page, body.slice(0, 4000));
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  revalidatePath("/feedback");
  return { ok: true };
}
