"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isValidSlackInvite, saveSlackSettings } from "@/lib/slack";

export type SlackSettingsState = { ok?: boolean; error?: string };

export async function updateSlackSettings(
  _prev: SlackSettingsState,
  formData: FormData
): Promise<SlackSettingsState> {
  await requireAdmin();
  const inviteUrl = String(formData.get("inviteUrl") || "").trim();
  const workspaceName = String(formData.get("workspaceName") || "").trim();
  if (inviteUrl && !isValidSlackInvite(inviteUrl)) {
    return {
      error:
        "That doesn't look like a Slack invite link. Expected https://join.slack.com/… or https://your-workspace.slack.com/…",
    };
  }
  await saveSlackSettings(inviteUrl, workspaceName);
  revalidatePath("/admin/slack");
  revalidatePath("/dashboard");
  return { ok: true };
}
