import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { siteUrl } from "./email";

// Slack integration — Phase 1: a shared invite link surfaced to approved
// members. The link + workspace name live in app_settings (admin-editable),
// with an env fallback. When nothing is set, getSlackConfig() returns null and
// no Slack UI appears anywhere — the integration is invisible until configured,
// mirroring the email integration's env-gating.

export type SlackConfig = { inviteUrl: string; workspaceName: string };

const INVITE_KEY = "slack_invite_url";
const NAME_KEY = "slack_workspace_name";
const TEAM_KEY = "slack_team_id";
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
export async function getSlackSettings(): Promise<{ inviteUrl: string; workspaceName: string; teamId: string }> {
  return {
    inviteUrl: (await getSetting(INVITE_KEY)) || "",
    workspaceName: (await getSetting(NAME_KEY)) || "",
    teamId: (await getSetting(TEAM_KEY)) || "",
  };
}

// Persist the invite link + workspace name (+ optional workspace team id). An
// empty invite clears the member-facing integration.
export async function saveSlackSettings(inviteUrl: string, workspaceName: string, teamId = ""): Promise<void> {
  await setSetting(INVITE_KEY, inviteUrl.trim());
  await setSetting(NAME_KEY, workspaceName.trim());
  await setSetting(TEAM_KEY, teamId.trim());
}

// ---- Phase 2: identity linking via "Sign in with Slack" (OpenID Connect) ----
// Client id/secret are env secrets (never stored in the DB). The workspace team
// id (optional, for verifying the linked account belongs to the Conclave
// workspace) is admin-editable in app_settings.

export function slackOAuthEnabled(): boolean {
  return !!(envVar("SLACK_CLIENT_ID") && envVar("SLACK_CLIENT_SECRET"));
}

// Absolute callback URL to register in the Slack app (uses EMAIL_BASE_URL + mount).
export function slackRedirectUri(): string {
  return siteUrl("/slack/callback");
}

export async function getConfiguredTeamId(): Promise<string> {
  return (await getSetting(TEAM_KEY)) || envVar("SLACK_TEAM_ID") || "";
}

export function slackAuthorizeUrl(state: string, team?: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    scope: "openid profile email",
    client_id: envVar("SLACK_CLIENT_ID"),
    state,
    redirect_uri: slackRedirectUri(),
  });
  if (team) params.set("team", team);
  return `https://slack.com/openid/connect/authorize?${params.toString()}`;
}

export type SlackIdentity = { userId: string; teamId: string; name: string; email: string };

// Exchange the OAuth code for the member's Slack identity via OIDC. Returns null
// on any failure, so callers can fail closed without throwing.
export async function exchangeSlackCode(code: string): Promise<SlackIdentity | null> {
  const clientId = envVar("SLACK_CLIENT_ID");
  const clientSecret = envVar("SLACK_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  try {
    const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: slackRedirectUri(),
      }).toString(),
    });
    const token = (await tokenRes.json()) as { ok?: boolean; access_token?: string };
    if (!token.ok || !token.access_token) return null;
    const infoRes = await fetch("https://slack.com/api/openid.connect.userInfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const info = (await infoRes.json()) as Record<string, unknown> & { ok?: boolean };
    if (!info.ok) return null;
    const userId = String(info["https://slack.com/user_id"] ?? info["sub"] ?? "");
    const teamId = String(info["https://slack.com/team_id"] ?? "");
    if (!userId) return null;
    return { userId, teamId, name: String(info["name"] ?? ""), email: String(info["email"] ?? "") };
  } catch {
    return null;
  }
}

export async function linkSlack(userId: number, slackUserId: string, teamId: string): Promise<void> {
  await getDb()
    .prepare("UPDATE users SET slack_user_id = ?, slack_team_id = ?, slack_linked_at = ? WHERE id = ?")
    .bind(slackUserId, teamId || null, Date.now(), userId)
    .run();
}

export async function unlinkSlack(userId: number): Promise<void> {
  await getDb()
    .prepare("UPDATE users SET slack_user_id = NULL, slack_team_id = NULL, slack_linked_at = NULL WHERE id = ?")
    .bind(userId)
    .run();
}

// Admin coverage: how many approved members have linked Slack.
export async function slackLinkedCounts(): Promise<{ linked: number; approved: number }> {
  const linked = await getDb()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE slack_user_id IS NOT NULL AND status = 'approved'")
    .first<{ n: number }>();
  const approved = await getDb()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'approved'")
    .first<{ n: number }>();
  return { linked: linked?.n ?? 0, approved: approved?.n ?? 0 };
}
