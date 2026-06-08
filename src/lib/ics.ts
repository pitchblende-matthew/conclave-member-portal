import type { EventRow } from "./types";

// Events store only a start time, so calendar exports assume a one-hour block.
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

type CalEvent = Pick<EventRow, "id" | "title" | "description" | "location" | "city" | "state" | "is_virtual" | "meeting_url" | "starts_at">;

// → "YYYYMMDDTHHMMSSZ" (UTC basic format used by both ICS and Google Calendar).
function toUtcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// Escape per RFC 5545 text rules (backslash, comma, semicolon, newline).
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function locationText(ev: CalEvent): string {
  if (ev.is_virtual === 1) return ev.meeting_url || "Online";
  return [ev.location, ev.city, ev.state].filter(Boolean).join(", ");
}

function details(ev: CalEvent): string {
  const parts = [ev.description];
  if (ev.is_virtual === 1 && ev.meeting_url) parts.push(`Join: ${ev.meeting_url}`);
  return parts.filter(Boolean).join("\n\n");
}

function times(ev: CalEvent): { start: string; end: string } {
  return { start: toUtcStamp(ev.starts_at), end: toUtcStamp(ev.starts_at + DEFAULT_DURATION_MS) };
}

// A self-contained .ics document for Apple Calendar, Outlook, etc.
export function buildEventIcs(ev: CalEvent): string {
  const { start, end } = times(ev);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Conclave//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${ev.id}@theconclave`,
    `DTSTAMP:${toUtcStamp(Date.now())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(ev.title)}`,
    `DESCRIPTION:${escapeText(details(ev))}`,
    `LOCATION:${escapeText(locationText(ev))}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

// A pre-filled Google Calendar "add event" link.
export function googleCalendarUrl(ev: CalEvent): string {
  const { start, end } = times(ev);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${start}/${end}`,
    details: details(ev),
    location: locationText(ev),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
