import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import type { DigestData } from "./digest";

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

// Absolute URL into the portal for links inside emails. Paths passed in are
// app-relative (e.g. "/login"); the portal's mount path (e.g. "/portal") is
// always included exactly once, whether or not EMAIL_BASE_URL already has it —
// so a root-domain EMAIL_BASE_URL still produces "…/portal/login".
export function siteUrl(path = ""): string {
  const env = readEnv();
  const mount = (env.NEXT_PUBLIC_BASE_PATH || env.COSMIC_MOUNT_PATH || "").replace(/\/$/, "");
  const base = (env.EMAIL_BASE_URL || "").replace(/\/$/, "");
  if (base) {
    const withMount = mount && !base.endsWith(mount) ? `${base}${mount}` : base;
    return `${withMount}${path}`;
  }
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

// On-brand wrapper (inline styles for email-client compatibility). Colours track
// the "Hearth" v2 palette; the header carries the bracketed Conclave logo (same
// asset the portal header uses, so email and app read as one brand).
const LOGO_URL =
  "https://cdn.prod.website-files.com/6a1629364bb647e65a025817/6a256014a18d5d024dbc45bc_conclave-bracketed-1600.png";

function layout(heading: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2ede4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede4;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fbf8f1;border:1px solid #e7ded0;border-radius:14px;">
        <tr><td style="padding:30px 32px;">
          <img src="${LOGO_URL}" alt="Conclave" width="158" style="width:158px;max-width:62%;height:auto;display:block;border:0;margin-bottom:20px;" />
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:26px;line-height:1.2;margin:0 0 16px;color:#2c3a31;">${heading}</h1>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#33322b;">${bodyHtml}</div>
          ${cta ? `<div style="margin:26px 0 4px;"><a href="${cta.href}" style="display:inline-block;background:#2c3a31;color:#f2ede4;text-decoration:none;padding:12px 22px;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">${esc(cta.label)}</a></div>` : ""}
        </td></tr>
      </table>
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#7c7a52;margin-top:16px;">Private. By invitation.</div>
    </td></tr>
  </table></body></html>`;
}

const greeting = (name?: string) => (name ? `Hi ${esc(name)},` : "Hello,");

// ---- Weekly digest -----------------------------------------------------------

// One section = an accent-ruled header (with a live item count) over a list of
// rows. The top rule + warm-grey count give the digest an editorial rhythm
// instead of reading as one flat list.
function digestSection(title: string, items: { href: string; main: string; sub?: string; external?: boolean }[]): string {
  if (!items.length) return "";
  const rows = items
    .map(
      (it, i) => `<tr><td style="padding:9px 0;${i ? "border-top:1px solid #efe8db;" : ""}">
        <a href="${it.href}" style="color:#2c3a31;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.35;">${esc(it.main)}${it.external ? ' <span style="color:#b26a4c;">↗</span>' : ""}</a>
        ${it.sub ? `<div style="color:#6f6e60;font-size:12px;font-family:Helvetica,Arial,sans-serif;margin-top:2px;">${esc(it.sub)}</div>` : ""}
      </td></tr>`
    )
    .join("");
  return `<div style="margin:24px 0 0;padding-top:22px;border-top:1px solid #e7ded0;">
    <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#7c7a52;margin-bottom:6px;">
      <span style="display:inline-block;width:20px;height:2px;background:#9aae9d;vertical-align:middle;margin:0 9px 3px 0;"></span>${esc(title)} <span style="color:#b6b09c;">· ${items.length}</span>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </div>`;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

// A dated masthead line, e.g. "Weekly digest · Friday, June 12".
function fmtIssueDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
}

// A little warmth up top — rotates weekly so the digest doesn't read the same
// way every Thursday.
function weeklyIntro(ms: number): string {
  const lines = [
    "A few new faces, a couple of conversations worth your time, and what's coming up — here's the week in brief.",
    "The short version of everything moving across the network this week. Skim it, then come find the good parts.",
    "Who joined, what's being discussed, and where to be next. Your week in The Conclave, in one scroll.",
    "A quick pass through the week — fresh members to meet, threads worth a reply, and dates for the calendar.",
    "Your weekly cup of what's new around here. Pull up a chair.",
  ];
  return lines[Math.floor(ms / (7 * 86400000)) % lines.length];
}

function digestLayout(bodyHtml: string, ctaHref: string, unsubUrl: string, dateLabel: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2ede4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede4;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fbf8f1;border:1px solid #e7ded0;border-radius:14px;">
        <tr><td style="padding:32px 34px;">
          <img src="${LOGO_URL}" alt="Conclave" width="158" style="width:158px;max-width:62%;height:auto;display:block;border:0;margin-bottom:22px;" />
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7c7a52;margin-bottom:8px;">Weekly digest · ${esc(dateLabel)}</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:25px;line-height:1.2;margin:0 0 14px;color:#2c3a31;">This week in The Conclave</h1>
          ${bodyHtml}
          <div style="margin:30px 0 4px;"><a href="${ctaHref}" style="display:inline-block;background:#2c3a31;color:#f2ede4;text-decoration:none;padding:13px 24px;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Open the portal</a></div>
        </td></tr>
      </table>
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#7c7a52;margin-top:16px;">Private. By invitation. · <a href="${unsubUrl}" style="color:#7c7a52;">Unsubscribe</a></div>
    </td></tr>
  </table></body></html>`;
}

export async function emailWeeklyDigest(to: string, name: string, data: DigestData, unsubUrl: string): Promise<void> {
  const now = Date.now();
  const sections =
    digestSection("New members", data.members.map((m) => ({ href: siteUrl(`/directory/${m.id}`), main: m.name, sub: m.role || undefined }))) +
    digestSection("Upcoming events", data.events.map((e) => ({ href: siteUrl(`/events/${e.id}`), main: e.title, sub: fmtDate(e.starts_at) }))) +
    digestSection("Active discussions", data.topics.map((t) => ({ href: siteUrl(`/board/${t.id}`), main: t.title, sub: `${Math.max(0, t.replies)} repl${t.replies === 1 ? "y" : "ies"}` }))) +
    digestSection("Fresh briefings", data.briefings.map((b) => ({ href: b.kind === "link" ? b.url : siteUrl(`/briefings/${b.id}`), main: b.title, external: b.kind === "link" }))) +
    digestSection("Jobs & businesses", data.listings.map((l) => ({ href: siteUrl(`/${l.kind === "job" ? "jobs" : "businesses"}/${l.id}`), main: l.title, sub: l.kind === "job" ? "Job" : "For sale" })));

  const para = (text: string, margin: string) => `<p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#33322b;margin:${margin};">${text}</p>`;
  const intro = para(greeting(name), "0") + para(weeklyIntro(now), "8px 0 0");
  const signoff =
    `<div style="margin:30px 0 0;padding-top:22px;border-top:1px solid #e7ded0;">` +
    para("That's the week in brief. A network is only as good as who shows up — so glad you're here.", "0") +
    `<p style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:16px;color:#5c7165;margin:8px 0 0;">— The Conclave</p></div>`;
  const html = digestLayout(intro + sections + signoff, siteUrl("/dashboard"), unsubUrl, fmtIssueDate(now));

  const lines: string[] = [`This week in The Conclave — ${fmtIssueDate(now)}`, "", weeklyIntro(now), ""];
  const block = (title: string, arr: string[]) => { if (arr.length) { lines.push(`${title.toUpperCase()} (${arr.length})`, ...arr, ""); } };
  block("New members", data.members.map((m) => `- ${m.name}${m.role ? ` (${m.role})` : ""}`));
  block("Upcoming events", data.events.map((e) => `- ${e.title} — ${fmtDate(e.starts_at)}`));
  block("Active discussions", data.topics.map((t) => `- ${t.title}`));
  block("Fresh briefings", data.briefings.map((b) => `- ${b.title}`));
  block("Jobs & businesses", data.listings.map((l) => `- ${l.title}`));
  lines.push("That's the week in brief. Glad you're here. — The Conclave", "", `Open the portal: ${siteUrl("/dashboard")}`, `Unsubscribe: ${unsubUrl}`);

  await sendEmail({ to, subject: "This week in The Conclave", html, text: lines.join("\n") });
}

// Admin recipients for alert emails.
export async function adminEmails(): Promise<string[]> {
  const { results } = await getDb()
    .prepare("SELECT email FROM users WHERE is_admin = 1 AND status = 'approved'")
    .all<{ email: string }>();
  return results.map((r) => r.email);
}

// ---- Senders (all best-effort; sendEmail never throws) ----

// A simple branded test, sent from the admin panel to verify the Resend wiring.
export async function emailTest(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Conclave test email",
    html: layout("Test email", `<p>${greeting(name)}</p><p>This is a test of Conclave&rsquo;s transactional email. If it reached your inbox, Resend is configured correctly.</p>`, { label: "Open the portal", href: siteUrl("/dashboard") }),
    text: "This is a test of Conclave's transactional email. If you received it, Resend is configured correctly.",
  });
}

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

// Approval for an application created without a password (e.g. via the
// marketing form): the member sets a password through the link, then signs in.
export async function emailAccessApprovedSetPassword(to: string, name: string, link: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your Conclave membership is approved",
    html: layout("You're approved", `<p>${greeting(name)}</p><p>Welcome to Conclave. Set a password to sign in and finish setting up your profile.</p>`, { label: "Set your password", href: link }),
    text: `Your Conclave membership is approved. Set your password to sign in: ${link}`,
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

// Reply from the team on a tester's report — closes the loop by email too.
export async function emailFeedbackReply(to: string, name: string, reply: string): Promise<void> {
  await sendEmail({
    to,
    subject: "A reply to your Conclave feedback",
    html: layout("Reply to your feedback", `<p>${greeting(name)}</p><p>Thanks for the report. The team replied:</p><p style="white-space:pre-wrap;border-left:3px solid #9aae9d;padding-left:12px;color:#45564b;">${esc(reply)}</p>`, { label: "View your reports", href: siteUrl("/feedback") }),
    text: `The team replied to your Conclave feedback:\n\n${reply}\n\nView your reports: ${siteUrl("/feedback")}`,
  });
}

export async function emailAdminsFeedback(kind: "bug" | "feature", testerName: string, page: string, body: string): Promise<void> {
  const tos = await adminEmails();
  const noun = kind === "bug" ? "bug report" : "feature request";
  const where = page ? ` on <code>${esc(page)}</code>` : "";
  for (const to of tos) {
    await sendEmail({
      to,
      subject: `New alpha ${noun} on Conclave`,
      html: layout("Alpha feedback", `<p><strong>${esc(testerName || "An alpha tester")}</strong> filed a ${noun}${where}.</p><p style="white-space:pre-wrap;">${esc(body)}</p>`, { label: "Review feedback", href: siteUrl("/admin/feedback") }),
      text: `${testerName || "An alpha tester"} filed a ${noun}${page ? ` on ${page}` : ""}:\n\n${body}\n\nReview: ${siteUrl("/admin/feedback")}`,
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
