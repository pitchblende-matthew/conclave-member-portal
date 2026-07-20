import { requireAdmin } from "@/lib/auth";
import { getSlackSettings, getSlackConfig } from "@/lib/slack";
import SlackForm from "./slack-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Slack — Admin — Conclave" };

export default async function AdminSlackPage() {
  await requireAdmin();
  const [settings, config] = await Promise.all([getSlackSettings(), getSlackConfig()]);

  return (
    <>
      <div className="tag">Admin</div>
      <h1 style={{ fontSize: "2.6rem" }}>Slack</h1>
      <p className="meta">
        Give approved members a way into the members-only Slack. When a link is set, a
        &ldquo;Join the Slack&rdquo; card appears on the dashboard and the invite is included in the
        approval email.
      </p>

      <div className="card" style={{ marginTop: "1.5rem", maxWidth: 560 }}>
        <h3 style={{ fontSize: "1.3rem", margin: 0 }}>Invite link</h3>
        <p className="meta" style={{ margin: "0.25rem 0 0.5rem" }}>
          Status: {config ? "live — members can join" : "off — no link set yet"}
        </p>
        <SlackForm initial={settings} />
        <p className="note" style={{ marginTop: "1.1rem" }}>
          Leave the link blank to turn the integration off.
        </p>
      </div>

      <div className="card" style={{ marginTop: "1rem", maxWidth: 560 }}>
        <h3 style={{ fontSize: "1.3rem", margin: 0 }}>How to get the link</h3>
        <ol className="meta" style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.7 }}>
          <li>In Slack, open the workspace menu → <strong>Invite people</strong>.</li>
          <li>Choose <strong>Create a shareable invite link</strong> (or a channel-specific link).</li>
          <li>Copy the link and paste it above. On Free/Pro, this is how members join.</li>
        </ol>
      </div>
    </>
  );
}
