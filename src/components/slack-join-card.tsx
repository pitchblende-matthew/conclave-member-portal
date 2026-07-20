import { getSlackConfig } from "@/lib/slack";

// "Join the Conclave Slack" card for the dashboard. Renders nothing until an
// admin sets a Slack invite link (Admin → Slack), so the app is unaffected
// until the integration is turned on.
export default async function SlackJoinCard() {
  const cfg = await getSlackConfig();
  if (!cfg) return null;
  return (
    <a href={cfg.inviteUrl} target="_blank" rel="noreferrer" className="card slack-card" style={{ marginTop: "1.5rem" }}>
      <span className="slack-card-ico" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M10 3v10M14 4v13M4 10h10M7 14h13" />
        </svg>
      </span>
      <span className="slack-card-body">
        <span className="slack-card-title">Join {cfg.workspaceName}</span>
        <span className="meta">The members-only Slack — introduce yourself and keep the conversation going between events.</span>
      </span>
      <span className="slack-card-cta">Open Slack →</span>
    </a>
  );
}
