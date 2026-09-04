import { siteUrl } from "./email";
import { postSlackCategory, dmMember, dmAdmins } from "./slack";

// Compose layer over the Slack primitives in ./slack: turns portal activity into
// Slack messages. Channel announcements go out via the incoming webhook; member
// notifications go out as bot DMs. Both are no-ops when their transport isn't
// configured, so every call site can fire-and-forget.

// Escape mrkdwn control chars so titles can't break link/format syntax.
function mrk(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A Slack link: <url|label>. Label is escaped; url is used as-is (our own URLs).
function link(url: string, label: string): string {
  return `<${url}|${mrk(label)}>`;
}

// A Slack date token that localizes to each viewer, with a plain fallback.
function slackDate(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const fallback = new Date(ms).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return `<!date^${secs}^{date_short_pretty} at {time}|${fallback}>`;
}

// ---- Channel announcements (webhook) ---------------------------------------

export async function slackAnnounceEvent(ev: { id: number; title: string; starts_at: number; is_virtual?: number; location?: string; dma_name?: string }): Promise<void> {
  const where = ev.is_virtual ? "Virtual" : [ev.location, ev.dma_name].filter(Boolean).join(" · ");
  const lines = [
    `:calendar: *New event* — ${link(siteUrl(`/events/${ev.id}`), ev.title)}`,
    `${slackDate(ev.starts_at)}${where ? ` · ${mrk(where)}` : ""}`,
  ];
  await postSlackCategory("events", lines.join("\n"));
}

export async function slackAnnounceBriefing(b: { id: number; title: string; kind?: string; url?: string; summary?: string }): Promise<void> {
  const href = b.kind === "link" && b.url ? b.url : siteUrl(`/briefings/${b.id}`);
  const lines = [`:newspaper: *New briefing* — ${link(href, b.title)}`];
  if (b.summary) lines.push(mrk(b.summary.slice(0, 200)));
  await postSlackCategory("briefings", lines.join("\n"));
}

export async function slackAnnounceTopic(t: { id: number; title: string; dma_name?: string }): Promise<void> {
  const scope = t.dma_name ? ` _(${mrk(t.dma_name)})_` : "";
  await postSlackCategory("discussions", `:speech_balloon: *New discussion* — ${link(siteUrl(`/board/${t.id}`), t.title)}${scope}`);
}

export async function slackAnnounceRequest(r: { id: number; title: string; kind: "ask" | "offer" }): Promise<void> {
  const label = r.kind === "offer" ? "New offer" : "New ask";
  await postSlackCategory("requests", `:handshake: *${label}* — ${link(siteUrl(`/requests/${r.id}`), r.title)}`);
}

// ---- Member DMs (bot) ------------------------------------------------------

export async function slackDmMessage(userId: number, fromName: string): Promise<void> {
  await dmMember(userId, `:envelope: *${mrk(fromName)}* sent you a message on Conclave. ${link(siteUrl("/messages"), "Read it")}`);
}

export async function slackDmConnectionRequest(userId: number, fromName: string): Promise<void> {
  await dmMember(userId, `:wave: *${mrk(fromName)}* wants to connect on Conclave. ${link(siteUrl("/connections"), "View request")}`);
}

export async function slackDmIntro(userId: number, partner: { id: number; name: string; role?: string; company?: string | null }): Promise<void> {
  const sub = [partner.role, partner.company].filter(Boolean).join(" · ");
  const lines = [
    `:tada: *Your Conclave intro this month* — meet *${mrk(partner.name)}*${sub ? ` (${mrk(sub)})` : ""}.`,
    `${link(siteUrl(`/messages/${partner.id}`), "Send a message")}  ·  ${link(siteUrl(`/directory/${partner.id}`), "View profile")}`,
  ];
  await dmMember(userId, lines.join("\n"));
}

export async function slackDmIntroFollowup(userId: number, partner: { id: number; name: string }): Promise<void> {
  await dmMember(userId, `:wave: Did you and *${mrk(partner.name)}* connect? A two-line note still counts. ${link(siteUrl(`/messages/${partner.id}`), "Say hello")}`);
}

export async function slackDmSubmissionDecision(userId: number, kind: "event" | "briefing", title: string, approved: boolean): Promise<void> {
  const where = kind === "event" ? "/events" : "/briefings";
  const text = approved
    ? `:white_check_mark: Your ${kind} *${mrk(title)}* was approved and is live. ${link(siteUrl(where), `View ${kind}s`)}`
    : `:no_entry_sign: Your ${kind} *${mrk(title)}* wasn't approved this time.`;
  await dmMember(userId, text);
}

const REMINDER_WHEN: Record<"month" | "week" | "3day" | "1day", string> = {
  month: "in about a month",
  week: "in a week",
  "3day": "in 3 days",
  "1day": "tomorrow",
};

export async function slackDmEventReminder(userId: number, ev: { id: number; title: string; starts_at: number }, kind: "month" | "week" | "3day" | "1day"): Promise<void> {
  await dmMember(userId, `:calendar: Reminder — *${mrk(ev.title)}* is ${REMINDER_WHEN[kind]} (${slackDate(ev.starts_at)}). ${link(siteUrl(`/events/${ev.id}`), "View event")}`);
}

export async function slackDmFeedbackReply(userId: number, reply: string): Promise<void> {
  await dmMember(userId, `:speech_balloon: An admin replied to your feedback:\n> ${mrk(reply.slice(0, 300))}\n${link(siteUrl("/dashboard"), "Open the portal")}`);
}

// ---- Admin DMs (parity with the admin-notification emails) -----------------

export async function slackAdminNewRequest(name: string): Promise<void> {
  await dmAdmins(`:inbox_tray: *${mrk(name || "Someone")}* requested access to Conclave. ${link(siteUrl("/admin/requests"), "Review")}`);
}

export async function slackAdminNewSubmission(kind: "event" | "briefing", submitter: string, title: string): Promise<void> {
  const where = kind === "event" ? "/admin/events" : "/admin/briefings";
  await dmAdmins(`:tray: *${mrk(submitter)}* submitted a ${kind}: *${mrk(title)}* — awaiting review. ${link(siteUrl(where), "Review")}`);
}

export async function slackAdminNewReport(reporter: string, targetType: string): Promise<void> {
  await dmAdmins(`:triangular_flag_on_post: *${mrk(reporter)}* reported ${mrk(targetType)} content. ${link(siteUrl("/admin/reports"), "Review report")}`);
}

export async function slackAdminFeedback(kind: "bug" | "feature", tester: string, page: string, body: string): Promise<void> {
  await dmAdmins(`:memo: New ${kind} from *${mrk(tester)}* (${mrk(page)}):\n> ${mrk(body.slice(0, 300))}\n${link(siteUrl("/admin/feedback"), "Open feedback")}`);
}
