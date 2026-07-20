import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";

// Slack integration — Phase 1: a shared invite link surfaced to approved
// members. The link + workspace name live in app_settings (admin-editable),
// with an env fallback. When nothing is set, getSlackConfig() returns null and
// no Slack UI appears anywhere — the integration is invisible until configured,
// mirroring the email integration's env-gating.

export type SlackConfig = { inviteUrl: string; workspaceName: string };

const INVITE_KEY = "slack_invite_url";
const NAME_KEY = "slack_workspace_name";
const DEFAULT_NAME = "the Conclave Slack";

async function getSetting(key: string): Promise<string | null> {
  const row = await getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await getDb()
    .prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

function envVar(key: string): string {
  try {
    const { env } = getCloudflareContext() as unknown as { env: Record<string, string | undefined> };
    return env?.[key] ?? "";
  } catch {
    return "";
  }
}

// A shared Slack invite is an https join.slack.com/t/… or your-workspace.slack.com/… link.
export function isValidSlackInvite(url: string): boolean {
  return /^https:\/\/(join\.slack\.com\/t\/|[a-z0-9.-]+\.slack\.com\/)/i.test(url.trim());
}

// Resolved config for member-facing surfaces, or null when unset.
export async function getSlackConfig(): Promise<SlackConfig | null> {
  const inviteUrl = (await getSetting(INVITE_KEY)) || envVar("SLACK_INVITE_URL");
  if (!inviteUrl) return null;
  const workspaceName = (await getSetting(NAME_KEY)) || envVar("SLACK_WORKSPACE_NAME") || DEFAULT_NAME;
  return { inviteUrl, workspaceName };
}

// Raw stored values for the admin settings form.
export async function getSlackSettings(): Promise<{ inviteUrl: string; workspaceName: string }> {
  return {
    inviteUrl: (await getSetting(INVITE_KEY)) || "",
    workspaceName: (await getSetting(NAME_KEY)) || "",
  };
}

// Persist the invite link + workspace name. An empty invite clears the integration.
export async function saveSlackSettings(inviteUrl: string, workspaceName: string): Promise<void> {
  await setSetting(INVITE_KEY, inviteUrl.trim());
  await setSetting(NAME_KEY, workspaceName.trim());
}
