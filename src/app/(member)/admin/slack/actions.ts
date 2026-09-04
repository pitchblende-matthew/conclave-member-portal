"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isValidSlackInvite, isValidBridgeDestination, saveSlackSettings, saveBridgeRouting, BRIDGE_CATEGORIES, type BridgeRouting } from "@/lib/slack";

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
  if (webhookUrl && !isValidBridgeDestination(webhookUrl)) {
    return { error: "That should be a channel (#general or a channel id like C0123ABCD) or an incoming webhook (https://hooks.slack.com/services/…)." };
  }
  await saveSlackSettings(inviteUrl, workspaceName, teamId, webhookUrl);
  revalidatePath("/admin/slack");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Per-category announcement routing: which activity types announce, and to which
// channel (an optional webhook override, else the default webhook).
export async function updateBridgeRouting(
  _prev: SlackSettingsState,
  formData: FormData
): Promise<SlackSettingsState> {
  await requireAdmin();
  const routing = {} as BridgeRouting;
  for (const { key, label } of BRIDGE_CATEGORIES) {
    const url = String(formData.get(`${key}_url`) || "").trim();
    if (url && !isValidBridgeDestination(url)) {
      return { error: `The ${label} destination should be a channel (#name or channel id) or an incoming webhook.` };
    }
    routing[key] = { on: formData.get(`${key}_on`) === "1", url };
  }
  await saveBridgeRouting(routing);
  revalidatePath("/admin/slack");
  return { ok: true };
}
