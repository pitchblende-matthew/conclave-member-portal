import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { emailEnabled, emailEventAdded, emailEventReminder, siteUrl } from "./email";
import { slackDmEventReminder } from "./slack-bridge";

// Scheduled runner for event emails: announces newly-added events to the whole
// network, and reminds RSVP'd attendees ~1 month / 1 week / 3 days / 1 day before.
// Idempotent via event_email_log (one row per event+kind). Env-gated: no-ops
// when email isn't configured.

const DAY = 86400000;

function digestSecret(): string {
  try {
    const { env } = getCloudflareContext() as unknown as { env: { DIGEST_SECRET?: string } };
    return env?.DIGEST_SECRET || "";
  } catch {
    return "";
  }
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stable per-member token for one-click unsubscribe (mirrors the digest scheme).
export async function eventUnsubToken(userId: number): Promise<string> {
  return (await sha256hex(`${userId}.conclave-events.${digestSecret()}`)).slice(0, 24);
}

async function eventUnsubUrl(userId: number): Promise<string> {
  return siteUrl(`/api/events/unsubscribe?u=${userId}&t=${await eventUnsubToken(userId)}`);
}

export async function applyEventUnsubscribe(userId: number, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  if (token !== (await eventUnsubToken(userId))) return false;
  await getDb().prepare("UPDATE users SET event_opt_out=1 WHERE id=?").bind(userId).run();
  return true;
}

type Ev = { id: number; title: string; description: string; location: string; starts_at: number; is_virtual: number };
type Member = { id: number; email: string; name: string };

async function allMembers(): Promise<Member[]> {
  const { results } = await getDb()
    .prepare("SELECT id, email, name FROM users WHERE status='approved' AND onboarded=1 AND event_opt_out=0 AND email != ''")
    .all<Member>();
  return results;
}

async function attendees(eventId: number): Promise<Member[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT u.id, u.email, u.name FROM rsvps r JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ? AND r.status = 'going' AND u.status = 'approved' AND u.event_opt_out = 0 AND u.email != ''`
    )
    .bind(eventId)
    .all<Member>();
  return results;
}

async function alreadySent(eventId: number, kind: string): Promise<boolean> {
  const row = await getDb().prepare("SELECT 1 FROM event_email_log WHERE event_id=? AND kind=?").bind(eventId, kind).first();
  return !!row;
}

async function markSent(eventId: number, kind: string): Promise<void> {
  await getDb()
    .prepare("INSERT OR IGNORE INTO event_email_log (event_id, kind, sent_at) VALUES (?, ?, ?)")
    .bind(eventId, kind, Date.now())
    .run();
}

export type EventEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  announced: number;
  reminders: number;
  errors: string[];
};

export async function runEventEmails(): Promise<EventEmailResult> {
  const result: EventEmailResult = { ok: true, announced: 0, reminders: 0, errors: [] };
  if (!emailEnabled()) return { ...result, ok: false, skipped: true, reason: "Email isn't configured (set RESEND_API_KEY and EMAIL_FROM)." };

  const db = getDb();
  const now = Date.now();
  const { results: events } = await db
    .prepare("SELECT id, title, description, location, starts_at, is_virtual FROM events WHERE status='approved' AND starts_at > ? ORDER BY starts_at ASC")
    .bind(now)
    .all<Ev>();

  for (const ev of events) {
    try {
      // "New event" announcement — to the whole (opted-in) network, once.
      if (!(await alreadySent(ev.id, "added"))) {
        for (const m of await allMembers()) {
          await emailEventAdded(m.email, m.name, ev, await eventUnsubUrl(m.id));
          result.announced += 1;
        }
        await markSent(ev.id, "added");
      }

      // Reminders — to RSVP'd attendees, once per window. Each window is entered
      // exactly once as the event approaches; the log prevents duplicates.
      const days = (ev.starts_at - now) / DAY;
      const bands: ("month" | "week" | "3day" | "1day")[] = [];
      if (days > 21 && days <= 34) bands.push("month");
      if (days > 3 && days <= 7) bands.push("week");
      if (days > 1 && days <= 3) bands.push("3day");
      if (days > 0 && days <= 1) bands.push("1day");

      for (const kind of bands) {
        if (await alreadySent(ev.id, kind)) continue;
        for (const m of await attendees(ev.id)) {
          await emailEventReminder(m.email, m.name, ev, kind, await eventUnsubUrl(m.id));
          await slackDmEventReminder(m.id, ev, kind);
          result.reminders += 1;
        }
        await markSent(ev.id, kind);
      }
    } catch (e) {
      result.errors.push(`event ${ev.id}: ${String(e)}`);
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
