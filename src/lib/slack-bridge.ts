import { siteUrl } from "./email";
import { postSlackChannel, dmMember } from "./slack";

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
  await postSlackChannel(lines.join("\n"));
}

export async function slackAnnounceBriefing(b: { id: number; title: string; kind?: string; url?: string; summary?: string }): Promise<void> {
  const href = b.kind === "link" && b.url ? b.url : siteUrl(`/briefings/${b.id}`);
  const lines = [`:newspaper: *New briefing* — ${link(href, b.title)}`];
  if (b.summary) lines.push(mrk(b.summary.slice(0, 200)));
  await postSlackChannel(lines.join("\n"));
}

export async function slackAnnounceTopic(t: { id: number; title: string; dma_name?: string }): Promise<void> {
  const scope = t.dma_name ? ` _(${mrk(t.dma_name)})_` : "";
  await postSlackChannel(`:speech_balloon: *New discussion* — ${link(siteUrl(`/board/${t.id}`), t.title)}${scope}`);
}

export async function slackAnnounceRequest(r: { id: number; title: string; kind: "ask" | "offer" }): Promise<void> {
  const label = r.kind === "offer" ? "New offer" : "New ask";
  await postSlackChannel(`:handshake: *${label}* — ${link(siteUrl(`/requests/${r.id}`), r.title)}`);
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
