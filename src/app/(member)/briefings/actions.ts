"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { emailAdminsNewSubmission } from "@/lib/email";
import { fetchOgImage } from "@/lib/opengraph";

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
  const res = await getDb()
    .prepare(
      `INSERT INTO briefings (kind, title, summary, body, url, author_id, published, status, submitted_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?)`
    )
    .bind(kind, title, field("summary"), field("body"), url, user.id, user.id, now, now)
    .run();

  // Pull the link's OpenGraph image so admins see a cover during review.
  if (kind === "link") {
    const og = await fetchOgImage(url);
    if (og) await getDb().prepare("UPDATE briefings SET cover_url = ? WHERE id = ?").bind(og, Number(res.meta.last_row_id)).run();
  }

  await notifyAdmins("briefing_submitted", { actorId: user.id });
  await emailAdminsNewSubmission("briefing", user.name, title);
  revalidatePath("/admin/briefings");
  return { ok: true };
}
