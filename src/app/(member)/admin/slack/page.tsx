import { requireAdmin } from "@/lib/auth";
import {
  getSlackSettings,
  getSlackConfig,
  slackOAuthEnabled,
  slackRedirectUri,
  slackLinkedCounts,
  slackWebhookEnabled,
  slackBotEnabled,
} from "@/lib/slack";
import SlackForm from "./slack-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Slack — Admin — Conclave" };

export default async function AdminSlackPage() {
  await requireAdmin();
  const [settings, config, counts, webhookOn] = await Promise.all([
    getSlackSettings(),
    getSlackConfig(),
    slackLinkedCounts(),
    slackWebhookEnabled(),
  ]);
  const oauth = slackOAuthEnabled();
  const botOn = slackBotEnabled();
  const redirectUri = slackRedirectUri();

  return (
    <>
      <div className="tag">Admin</div>
      <h1 style={{ fontSize: "2.6rem" }}>Slack</h1>
      <p className="meta">
        Give approved members a way into the members-only Slack, and let them link their Slack
        identity so you can see who&apos;s actually joined.
      </p>

      <div className="card" style={{ marginTop: "1.5rem", maxWidth: 560 }}>
        <h3 style={{ fontSize: "1.3rem", margin: 0 }}>Invite link</h3>
        <p className="meta" style={{ margin: "0.25rem 0 0.5rem" }}>
          Status: {config ? "live — members can join" : "off — no link set yet"}
        </p>
        <SlackForm initial={settings} />
        <p className="note" style={{ marginTop: "1.1rem" }}>Leave the link blank to turn the integration off.</p>
      </div>

      <div className="card" style={{ marginTop: "1rem", maxWidth: 560 }}>
        <h3 style={{ fontSize: "1.3rem", margin: 0 }}>Sign in with Slack (identity linking)</h3>
        <p className="meta" style={{ margin: "0.25rem 0 0.5rem" }}>
          Status: {oauth ? "configured" : "off — add the app credentials below"}
        </p>
        {oauth && (
          <p className="meta" style={{ margin: "0 0 0.5rem" }}>
            <strong>{counts.linked}</strong> of <strong>{counts.approved}</strong> approved members have linked Slack.
          </p>
        )}
        <p className="meta" style={{ margin: "0.5rem 0 0.2rem" }}>Redirect URL to register in the Slack app:</p>
        <p className="fab-page" style={{ margin: 0 }}>
          <code>{redirectUri}</code>
        </p>
        <ol className="meta" style={{ margin: "0.75rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.7 }}>
          <li>Create a Slack app → enable <strong>Sign in with Slack</strong> (scopes: openid, profile, email).</li>
          <li>Add the redirect URL above under OAuth &amp; Permissions.</li>
          <li>Set <code>SLACK_CLIENT_ID</code> and <code>SLACK_CLIENT_SECRET</code> as secrets in Webflow Cloud (and ensure <code>EMAIL_BASE_URL</code> is set for the redirect to resolve).</li>
          <li>Optionally set the workspace team id above to restrict linking to your workspace.</li>
        </ol>
      </div>

      <div className="card" style={{ marginTop: "1rem", maxWidth: 560 }}>
        <h3 style={{ fontSize: "1.3rem", margin: 0 }}>The bridge (portal → Slack)</h3>
        <p className="meta" style={{ margin: "0.25rem 0 0.5rem" }}>Two independent channels, each on only when configured:</p>
        <ul className="meta" style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.8 }}>
          <li>
            <strong>Channel announcements</strong>: {webhookOn ? "on" : "off"} — posts new events, briefings,
            discussions, and asks &amp; offers to a channel. Set the <strong>channel webhook</strong> in the
            invite form above (or <code>SLACK_WEBHOOK_URL</code>).
          </li>
          <li>
            <strong>Member DMs</strong>: {botOn ? "on" : "off"} — DMs linked members about new messages,
            connection requests, and their monthly intro. Requires a bot token
            (<code>SLACK_BOT_TOKEN</code>, scope <code>chat:write</code>) set as a secret in Webflow Cloud.
            Members must have linked Slack above to receive DMs.
          </li>
        </ul>
        <p className="note" style={{ marginTop: "0.75rem" }}>
          A webhook can only post to a channel — DMs need the bot token. Create an incoming webhook under your
          Slack app → <em>Incoming Webhooks</em>; add a bot token under <em>OAuth &amp; Permissions</em>.
        </p>
      </div>

      <div className="card" style={{ marginTop: "1rem", maxWidth: 560 }}>
        <h3 style={{ fontSize: "1.3rem", margin: 0 }}>How to get the invite link</h3>
        <ol className="meta" style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.7 }}>
          <li>In Slack, open the workspace menu → <strong>Invite people</strong>.</li>
          <li>Choose <strong>Create a shareable invite link</strong> (or a channel-specific link).</li>
          <li>Copy the link and paste it above. On Free/Pro, this is how members join.</li>
        </ol>
      </div>
    </>
  );
}
