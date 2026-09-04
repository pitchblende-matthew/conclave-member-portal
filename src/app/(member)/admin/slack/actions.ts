"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isValidSlackInvite, isValidSlackWebhook, saveSlackSettings } from "@/lib/slack";

export type SlackSettingsState = { ok?: boolean; error?: string };

export async function updateSlackSettings(
  _prev: SlackSettingsState,
  formData: FormData
): Promise<SlackSettingsState> {
  await requireAdmin();
  const inviteUrl = String(formData.get("inviteUrl") || "").trim();
  const workspaceName = String(formData.get("workspaceName") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const webhookUrl = String(formData.get("webhookUrl") || "").trim();
  if (inviteUrl && !isValidSlackInvite(inviteUrl)) {
    return {
      error:
        "That doesn't look like a Slack invite link. Expected https://join.slack.com/… or https://your-workspace.slack.com/…",
    };
  }
  if (teamId && !/^T[A-Z0-9]{6,}$/.test(teamId)) {
    return { error: "Workspace team id should look like T0123ABCD (find it in Slack under About this workspace)." };
  }
  if (webhookUrl && !isValidSlackWebhook(webhookUrl)) {
    return { error: "That doesn't look like a Slack incoming webhook. Expected https://hooks.slack.com/services/…" };
  }
  await saveSlackSettings(inviteUrl, workspaceName, teamId, webhookUrl);
  revalidatePath("/admin/slack");
  revalidatePath("/dashboard");
  return { ok: true };
}
