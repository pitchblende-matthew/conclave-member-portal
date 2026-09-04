import type { User } from "@/lib/types";
import { getSlackConfig, slackOAuthEnabled } from "@/lib/slack";
import { mountPath } from "@/lib/base-path";
import { disconnectSlack } from "./slack-actions";

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Your Slack account is connected." },
  denied: { ok: false, text: "Slack connection was cancelled." },
  wrongteam: { ok: false, text: "That Slack account isn't in the Conclave workspace — join it first, then connect." },
  error: { ok: false, text: "Something went wrong connecting Slack. Please try again." },
};

// Slack section on the profile page: connect ("Sign in with Slack"), show the
// linked state, or disconnect. Renders nothing until Slack is configured.
export default async function SlackCard({ user, status }: { user: User; status?: string }) {
  const [config, oauth] = [await getSlackConfig(), slackOAuthEnabled()];
  if (!config && !oauth) return null;

  const base = mountPath();
  const linked = !!user.slack_user_id;
  const msg = status ? STATUS[status] : undefined;
  const workspace = config?.workspaceName || "the Conclave Slack";

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: "1rem" }}>
      <h2 className="sec-head" style={{ fontSize: "1.4rem" }}>Slack</h2>
      {msg && (
        <p className={msg.ok ? "note" : "error"} role={msg.ok ? "status" : "alert"} style={{ marginTop: "0.5rem" }}>
          {msg.text}
        </p>
      )}
      {linked ? (
        <>
          <p className="meta" style={{ margin: "0.5rem 0 0.9rem" }}>
            Connected to {workspace}. You&apos;re counted as an active member of the Slack.
          </p>
          <form action={disconnectSlack}>
            <button className="btn btn-ghost inline-btn" type="submit">Disconnect</button>
          </form>
        </>
      ) : oauth ? (
        <>
          <p className="meta" style={{ margin: "0.5rem 0 0.9rem" }}>
            Connect your Slack account to confirm you&apos;re in {workspace}
            {config ? <> — you can join the workspace from your <a href={config.inviteUrl} target="_blank" rel="noreferrer">invite link</a> first.</> : "."}
          </p>
          <a className="btn inline-btn" href={`${base}/slack/connect`} style={{ textDecoration: "none" }}>
            Connect Slack
          </a>
        </>
      ) : (
        <p className="meta" style={{ margin: "0.5rem 0 0" }}>
          <a href={config!.inviteUrl} target="_blank" rel="noreferrer">Join {workspace}</a> — the members-only Slack.
        </p>
      )}
    </div>
  );
}
