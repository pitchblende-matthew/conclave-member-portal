"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { emailAdminsNewReport } from "@/lib/email";
import { rateLimited } from "@/lib/rate-limit";

export type ReportState = { ok?: boolean; error?: string };

const TARGET_TYPES = new Set(["topic", "post", "member"]);

export async function createReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const me = await requireUser();
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = Number(formData.get("targetId"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!TARGET_TYPES.has(targetType) || !targetId) return { error: "Couldn't file that report." };
  if (await rateLimited(`report:${me.id}`, 20, 60 * 60 * 1000)) {
    return { error: "You've filed a lot of reports recently. Please try again later." };
  }

  const db = getDb();
  // One open report per member per target.
  const dup = await db
    .prepare("SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'")
    .bind(me.id, targetType, targetId)
    .first();
  if (!dup) {
    await db
      .prepare("INSERT INTO reports (reporter_id, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(me.id, targetType, targetId, reason, Date.now())
      .run();
    await notifyAdmins("content_reported", { actorId: me.id });
    await emailAdminsNewReport(me.name, targetType);
  }
  revalidatePath("/admin/reports");
  return { ok: true };
}
