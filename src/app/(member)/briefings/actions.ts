"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { emailAdminsNewSubmission } from "@/lib/email";

export type SubmitBriefingState = { ok?: boolean; error?: string };

// A member proposes a briefing. It lands as 'pending' (unpublished) for an
// admin to review and publish.
export async function submitBriefing(_prev: SubmitBriefingState, formData: FormData): Promise<SubmitBriefingState> {
  const user = await requireUser();
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const kind = field("kind") === "link" ? "link" : "article";
  const title = field("title");
  const url = field("url");
  if (!title) return { error: "Give the briefing a title." };
  if (kind === "link" && !/^https?:\/\//i.test(url)) return { error: "A link briefing needs a URL starting with http:// or https://." };
  if (kind === "article" && !field("body")) return { error: "Write the briefing body, or switch it to a link." };

  const now = Date.now();
  await getDb()
    .prepare(
      `INSERT INTO briefings (kind, title, summary, body, url, author_id, published, status, submitted_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?)`
    )
    .bind(kind, title, field("summary"), field("body"), url, user.id, user.id, now, now)
    .run();

  await notifyAdmins("briefing_submitted", { actorId: user.id });
  await emailAdminsNewSubmission("briefing", user.name, title);
  revalidatePath("/admin/briefings");
  return { ok: true };
}
