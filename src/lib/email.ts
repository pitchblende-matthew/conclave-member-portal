import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";

// Email is sent through Resend's REST API. Everything is env-gated: with no
// RESEND_API_KEY / EMAIL_FROM configured, sendEmail() logs and no-ops, so the
// app runs fine until you add the secrets in Webflow Cloud.
//
// Required env (set as secrets / vars on Webflow Cloud):
//   RESEND_API_KEY  - Resend API key
//   EMAIL_FROM      - verified sender, e.g. "Conclave <hello@your-domain.com>"
//   EMAIL_BASE_URL  - absolute portal URL for links, e.g. "https://host/portal"

type Env = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_BASE_URL?: string;
  NEXT_PUBLIC_BASE_PATH?: string;
  COSMIC_MOUNT_PATH?: string;
};

function readEnv(): Env {
  try {
    const { env } = getCloudflareContext() as unknown as { env: Env };
    return env ?? {};
  } catch {
    return {};
  }
}

export function emailEnabled(): boolean {
  const env = readEnv();
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM);
}

// Absolute URL into the portal for links inside emails.
export function siteUrl(path = ""): string {
  const env = readEnv();
  const base = (env.EMAIL_BASE_URL || "").replace(/\/$/, "");
  if (base) return `${base}${path}`;
  const mount = env.NEXT_PUBLIC_BASE_PATH || env.COSMIC_MOUNT_PATH || "";
  return `${mount}${path}`;
}

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

type SendArgs = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const env = readEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.log(`[email] disabled — would send "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) console.error(`[email] send failed ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[email] send error", err);
  }
}

// On-brand wrapper (inline styles for email-client compatibility).
function layout(heading: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f1e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fffdf8;border:1px solid #e8e1cf;border-radius:14px;">
        <tr><td style="padding:30px 32px;">
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6e7a5e;">Conclave</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:26px;line-height:1.2;margin:10px 0 16px;color:#14140f;">${heading}</h1>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#33322b;">${bodyHtml}</div>
          ${cta ? `<div style="margin:26px 0 4px;"><a href="${cta.href}" style="display:inline-block;background:#14140f;color:#f5f1e8;text-decoration:none;padding:12px 22px;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">${esc(cta.label)}</a></div>` : ""}
        </td></tr>
      </table>
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#6b695f;margin-top:16px;">Private. By invitation.</div>
    </td></tr>
  </table></body></html>`;
}

const greeting = (name?: string) => (name ? `Hi ${esc(name)},` : "Hello,");

// Admin recipients for alert emails.
export async function adminEmails(): Promise<string[]> {
  const { results } = await getDb()
    .prepare("SELECT email FROM users WHERE is_admin = 1 AND status = 'approved'")
    .all<{ email: string }>();
  return results.map((r) => r.email);
}

// ---- Senders (all best-effort; sendEmail never throws) ----

export async function emailWelcome(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Welcome to Conclave",
    html: layout("You're in", `<p>${greeting(name)}</p><p>Your Conclave account is ready. Add a few details to your profile so the rest of the network knows who you are.</p>`, { label: "Open the portal", href: siteUrl("/dashboard") }),
    text: `Welcome to Conclave. Open the portal: ${siteUrl("/dashboard")}`,
  });
}

export async function emailAccessPending(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: "We received your Conclave request",
    html: layout("Request received", `<p>${greeting(name)}</p><p>Thanks for requesting access to Conclave. Membership is reviewed by hand — we'll email you as soon as a decision is made.</p>`),
    text: "Thanks for requesting access to Conclave. We'll email you once it's reviewed.",
  });
}

export async function emailAccessApproved(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your Conclave membership is approved",
    html: layout("You're approved", `<p>${greeting(name)}</p><p>Welcome to Conclave. Sign in to finish setting up your profile and meet the network.</p>`, { label: "Sign in", href: siteUrl("/login") }),
    text: `Your Conclave membership is approved. Sign in: ${siteUrl("/login")}`,
  });
}

export async function emailAccessDeclined(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: "About your Conclave request",
    html: layout("Your request", `<p>${greeting(name)}</p><p>Thank you for your interest in Conclave. We're not able to offer membership at this time. We appreciate you reaching out.</p>`),
    text: "Thank you for your interest in Conclave. We're not able to offer membership at this time.",
  });
}

export async function emailNewMessage(to: string, name: string, fromName: string): Promise<void> {
  await sendEmail({
    to,
    subject: `${fromName} sent you a message on Conclave`,
    html: layout("New message", `<p>${greeting(name)}</p><p><strong>${esc(fromName)}</strong> sent you a direct message on Conclave.</p>`, { label: "Read message", href: siteUrl("/messages") }),
    text: `${fromName} sent you a message on Conclave. Read it: ${siteUrl("/messages")}`,
  });
}

export async function emailConnectionRequest(to: string, name: string, fromName: string): Promise<void> {
  await sendEmail({
    to,
    subject: `${fromName} wants to connect on Conclave`,
    html: layout("New connection request", `<p>${greeting(name)}</p><p><strong>${esc(fromName)}</strong> sent you a connection request on Conclave.</p>`, { label: "View request", href: siteUrl("/connections") }),
    text: `${fromName} sent you a connection request. View it: ${siteUrl("/connections")}`,
  });
}

export async function emailPasswordReset(to: string, link: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your Conclave password",
    html: layout("Reset your password", `<p>Hello,</p><p>We received a request to reset your Conclave password. This link expires in one hour. If you didn't ask for this, you can ignore this email.</p>`, { label: "Choose a new password", href: link }),
    text: `Reset your Conclave password (expires in 1 hour): ${link}`,
  });
}

export async function emailPasswordChanged(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your Conclave password was changed",
    html: layout("Password changed", `<p>Hello,</p><p>Your Conclave password was just changed. If this was you, no action is needed. If it wasn't, please reset your password immediately and contact an admin.</p>`, { label: "Reset password", href: siteUrl("/forgot-password") }),
    text: "Your Conclave password was changed. If this wasn't you, reset it immediately.",
  });
}

export async function emailSubmissionDecision(to: string, kind: "event" | "briefing", title: string, approved: boolean): Promise<void> {
  const noun = kind === "event" ? "event" : "briefing";
  const where = kind === "event" ? "/events" : "/briefings";
  await sendEmail({
    to,
    subject: approved ? `Your ${noun} was approved` : `About your ${noun} submission`,
    html: approved
      ? layout(`Your ${noun} is live`, `<p>Hello,</p><p>Your ${noun} <strong>“${esc(title)}”</strong> was approved and is now published on Conclave.</p>`, { label: `View ${noun}s`, href: siteUrl(where) })
      : layout(`About your ${noun}`, `<p>Hello,</p><p>Thanks for submitting <strong>“${esc(title)}”</strong>. An admin reviewed it and decided not to publish it this time.</p>`),
    text: approved ? `Your ${noun} "${title}" was approved.` : `Your ${noun} "${title}" was not approved.`,
  });
}

export async function emailAdminsNewRequest(applicantName: string): Promise<void> {
  const tos = await adminEmails();
  for (const to of tos) {
    await sendEmail({
      to,
      subject: "New Conclave access request",
      html: layout("New access request", `<p><strong>${esc(applicantName || "Someone")}</strong> requested access to Conclave and is awaiting review.</p>`, { label: "Review requests", href: siteUrl("/admin/requests") }),
      text: `${applicantName || "Someone"} requested access. Review: ${siteUrl("/admin/requests")}`,
    });
  }
}

export async function emailAdminsInviteRequest(name: string, email: string): Promise<void> {
  const tos = await adminEmails();
  for (const to of tos) {
    await sendEmail({
      to,
      subject: "New invitation request",
      html: layout("New invitation request", `<p><strong>${esc(name || "Someone")}</strong> requested an invitation to Conclave.</p><p>Email: ${esc(email)}</p>`, { label: "View requests", href: siteUrl("/admin/invite-requests") }),
      text: `${name || "Someone"} (${email}) requested an invitation. ${siteUrl("/admin/invite-requests")}`,
    });
  }
}

export async function emailAdminsNewReport(reporterName: string, targetType: string): Promise<void> {
  const tos = await adminEmails();
  for (const to of tos) {
    await sendEmail({
      to,
      subject: "New content report on Conclave",
      html: layout("Content reported", `<p><strong>${esc(reporterName || "A member")}</strong> reported a ${esc(targetType)} for review.</p>`, { label: "Open moderation queue", href: siteUrl("/admin/reports") }),
      text: `${reporterName || "A member"} reported a ${targetType}. Review: ${siteUrl("/admin/reports")}`,
    });
  }
}

export async function emailAdminsNewSubmission(kind: "event" | "briefing", submitterName: string, title: string): Promise<void> {
  const tos = await adminEmails();
  const where = kind === "event" ? "/admin/events" : "/admin/briefings";
  for (const to of tos) {
    await sendEmail({
      to,
      subject: `New ${kind} submission to review`,
      html: layout(`New ${kind} submission`, `<p><strong>${esc(submitterName || "A member")}</strong> submitted a ${kind} for review: <strong>“${esc(title)}”</strong>.</p>`, { label: "Review submissions", href: siteUrl(where) }),
      text: `${submitterName || "A member"} submitted a ${kind}: "${title}". Review: ${siteUrl(where)}`,
    });
  }
}
