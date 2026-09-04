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
const WEBHOOK_KEY = "slack_webhook_url";
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
export async function getSlackSettings(): Promise<{ inviteUrl: string; workspaceName: string; teamId: string; webhookUrl: string }> {
  return {
    inviteUrl: (await getSetting(INVITE_KEY)) || "",
    workspaceName: (await getSetting(NAME_KEY)) || "",
    teamId: (await getSetting(TEAM_KEY)) || "",
    webhookUrl: (await getSetting(WEBHOOK_KEY)) || "",
  };
}

// Persist the invite link + workspace name (+ optional workspace team id +
// optional incoming-webhook URL). An empty invite clears the member-facing
// integration; an empty webhook turns off channel announcements.
export async function saveSlackSettings(inviteUrl: string, workspaceName: string, teamId = "", webhookUrl = ""): Promise<void> {
  await setSetting(INVITE_KEY, inviteUrl.trim());
  await setSetting(NAME_KEY, workspaceName.trim());
  await setSetting(TEAM_KEY, teamId.trim());
  await setSetting(WEBHOOK_KEY, webhookUrl.trim());
}

// ---- Phase 3: the bridge — portal activity flows into Slack -----------------
// Two independent, separately-gated channels:
//   • Channel announcements via an incoming webhook (admin-set or env).
//   • Member DMs via a bot token (env secret only) to members who've linked.
// Both fail closed and never throw into the caller, mirroring email gating.

// A channel announcement's "destination" is either an incoming-webhook URL or a
// Slack channel the bot posts to (a #name or a channel id). This lets a
// workspace bridge with just a bot token — no webhook plumbing — or with a
// webhook, or a mix, all through one field.

// A Slack incoming webhook is https://hooks.slack.com/services/…
export function isValidSlackWebhook(url: string): boolean {
  return /^https:\/\/hooks\.slack\.com\/(services|triggers)\//i.test(url.trim());
}

// A channel reference: #general, or a channel/group/DM id like C0123ABCD.
export function isSlackChannelRef(s: string): boolean {
  const t = s.trim();
  return /^#[^\s#]+$/.test(t) || /^[CGD][A-Z0-9]{6,}$/.test(t);
}

// A destination is valid if it's a webhook URL or a channel reference.
export function isValidBridgeDestination(s: string): boolean {
  const t = s.trim();
  return isValidSlackWebhook(t) || isSlackChannelRef(t);
}

// The default destination for announcements: admin-set (slack_webhook_url — the
// key predates channel support) or env. Accepts a webhook URL or a channel.
export async function getDefaultDestination(): Promise<string> {
  return (await getSetting(WEBHOOK_KEY)) || envVar("SLACK_WEBHOOK_URL") || envVar("SLACK_CHANNEL");
}

// POST an mrkdwn message to a specific webhook URL. Best-effort; never throws.
async function postToWebhook(url: string, text: string): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    /* best-effort — never break the caller on a Slack outage */
  }
}

// Send an mrkdwn message to a destination — webhook or bot channel — picking the
// transport by shape. No-op when empty (or when a channel is set but the bot
// isn't configured). The bot must be a member of the channel it posts to.
async function postDestination(dest: string, text: string): Promise<void> {
  const d = (dest || "").trim();
  if (!d) return;
  if (isValidSlackWebhook(d)) {
    await postToWebhook(d, text);
    return;
  }
  await botPostChannel(d, text);
}

// Post to the default destination. No-op when unset.
export async function postSlackChannel(text: string): Promise<void> {
  await postDestination(await getDefaultDestination(), text);
}

// ---- Announcement routing: per-category on/off + optional destination override
// Each activity type can be switched off, or pointed at its own destination (a
// channel or webhook). With no override it falls back to the default
// destination, so a single-destination setup announces everything (categories
// default to on).

export type BridgeCategory = "events" | "briefings" | "discussions" | "requests";
export const BRIDGE_CATEGORIES: readonly { key: BridgeCategory; label: string; hint: string }[] = [
  { key: "events", label: "Events", hint: "New events on the calendar" },
  { key: "briefings", label: "Briefings", hint: "Newly published briefings" },
  { key: "discussions", label: "Discussions", hint: "New board topics" },
  { key: "requests", label: "Asks & offers", hint: "New asks and offers" },
];
export type BridgeRoute = { on: boolean; url: string };
export type BridgeRouting = Record<BridgeCategory, BridgeRoute>;
const ROUTING_KEY = "slack_bridge_routing";

// Read the stored routing, defaulting every category to on with no override.
export async function getBridgeRouting(): Promise<BridgeRouting> {
  let parsed: Partial<Record<BridgeCategory, Partial<BridgeRoute>>> = {};
  const raw = await getSetting(ROUTING_KEY);
  if (raw) {
    try {
      parsed = JSON.parse(raw) as Partial<Record<BridgeCategory, Partial<BridgeRoute>>>;
    } catch {
      parsed = {};
    }
  }
  const out = {} as BridgeRouting;
  for (const { key } of BRIDGE_CATEGORIES) {
    const r = parsed[key];
    out[key] = {
      on: typeof r?.on === "boolean" ? r.on : true,
      url: typeof r?.url === "string" ? r.url : "",
    };
  }
  return out;
}

export async function saveBridgeRouting(routing: BridgeRouting): Promise<void> {
  const clean = {} as BridgeRouting;
  for (const { key } of BRIDGE_CATEGORIES) {
    const r = routing[key];
    clean[key] = { on: !!r?.on, url: (r?.url || "").trim() };
  }
  await setSetting(ROUTING_KEY, JSON.stringify(clean));
}

// The destination a category should post to (its override, else the default),
// or "" if the category is switched off or nothing is configured.
export async function destinationForCategory(cat: BridgeCategory): Promise<string> {
  const routing = await getBridgeRouting();
  if (!routing[cat].on) return "";
  return routing[cat].url || (await getDefaultDestination());
}

// Post a category's announcement to its resolved destination. No-op when off/unset.
export async function postSlackCategory(cat: BridgeCategory, text: string): Promise<void> {
  await postDestination(await destinationForCategory(cat), text);
}

// Whether channel announcements can go anywhere: a default destination is set,
// or at least one category has its own override.
export async function channelBridgeEnabled(): Promise<boolean> {
  if (await getDefaultDestination()) return true;
  const routing = await getBridgeRouting();
  return BRIDGE_CATEGORIES.some((c) => routing[c.key].on && routing[c.key].url);
}

// Bot token is an env secret (never stored in the DB), like the OAuth secret.
function slackBotToken(): string {
  return envVar("SLACK_BOT_TOKEN");
}

export function slackBotEnabled(): boolean {
  return !!slackBotToken();
}

async function slackApi(method: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const token = slackBotToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// DM a member by their Slack user id: open (or reuse) the IM channel, then post.
// No-op when the bot isn't configured. Best-effort — swallows failures.
export async function dmSlackUser(slackUserId: string, text: string): Promise<boolean> {
  if (!slackBotEnabled() || !slackUserId) return false;
  const opened = await slackApi("conversations.open", { users: slackUserId });
  const channel = opened && opened.ok ? ((opened.channel as { id?: string })?.id ?? "") : "";
  if (!channel) return false;
  const posted = await slackApi("chat.postMessage", { channel, text, unfurl_links: false });
  return !!(posted && posted.ok);
}

// Post an mrkdwn message to a channel (name or id) via the bot. No-op when the
// bot isn't configured. The bot must be a member of the channel (invite it with
// /invite in Slack); posting to a channel it isn't in fails silently.
export async function botPostChannel(channel: string, text: string): Promise<boolean> {
  if (!slackBotEnabled() || !channel) return false;
  const posted = await slackApi("chat.postMessage", { channel: channel.trim(), text, unfurl_links: false, unfurl_media: false });
  return !!(posted && posted.ok);
}

// The linked Slack user id for a member, or null if they haven't linked.
export async function slackUserIdFor(userId: number): Promise<string | null> {
  const row = await getDb().prepare("SELECT slack_user_id FROM users WHERE id = ?").bind(userId).first<{ slack_user_id: string | null }>();
  return row?.slack_user_id ?? null;
}

// DM a member if the bot is on and they've linked Slack. Returns whether sent.
export async function dmMember(userId: number, text: string): Promise<boolean> {
  if (!slackBotEnabled()) return false;
  const slackUserId = await slackUserIdFor(userId);
  if (!slackUserId) return false;
  return dmSlackUser(slackUserId, text);
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
