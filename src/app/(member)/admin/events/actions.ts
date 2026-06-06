"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { regionFromForm } from "@/lib/region";
import { notify } from "@/lib/notifications";
import { emailSubmissionDecision } from "@/lib/email";

export type EventState = { ok?: boolean; error?: string };

// datetime-local gives "YYYY-MM-DDTHH:mm" with no zone; we treat it as UTC so
// the round-trip (prefill <-> save) is deterministic on the edge.
function parseStartsAt(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(`${value}:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

function readEvent(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    title: field("title"),
    description: field("description"),
    location: field("location"),
    city: field("city"),
    state: field("state"),
    zip: field("zip"),
    isVirtual: formData.get("is_virtual") === "1",
    meetingUrl: field("meeting_url"),
    startsAt: parseStartsAt(field("starts_at")),
    capacity: Number(formData.get("capacity") ?? 0) || 0,
  };
}

export async function createEvent(_prev: EventState, formData: FormData): Promise<EventState> {
  await requireAdmin();
  const e = readEvent(formData);
  if (!e.title) return { error: "Title is required." };
  if (e.startsAt === null) return { error: "A valid date and time is required." };
  // Virtual events are network-wide, so they carry no media market.
  const region = e.isVirtual
    ? { city: "", state: "", zip: "", dma_slug: "", dma_name: "" }
    : await regionFromForm(e.city, e.state, e.zip);

  await getDb()
    .prepare(
      `INSERT INTO events (title, description, location, city, state, zip, dma_slug, dma_name, is_virtual, meeting_url, starts_at, capacity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      e.title, e.description, e.location,
      region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      e.isVirtual ? 1 : 0, e.isVirtual ? e.meetingUrl : "",
      e.startsAt, e.capacity, Date.now()
    )
    .run();

  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function updateEvent(_prev: EventState, formData: FormData): Promise<EventState> {
  await requireAdmin();
  const id = Number(formData.get("eventId"));
  const e = readEvent(formData);
  if (!e.title) return { error: "Title is required." };
  if (e.startsAt === null) return { error: "A valid date and time is required." };
  const region = e.isVirtual
    ? { city: "", state: "", zip: "", dma_slug: "", dma_name: "" }
    : await regionFromForm(e.city, e.state, e.zip);

  await getDb()
    .prepare(
      `UPDATE events SET title = ?, description = ?, location = ?,
         city = ?, state = ?, zip = ?, dma_slug = ?, dma_name = ?, is_virtual = ?, meeting_url = ?, starts_at = ?, capacity = ?
       WHERE id = ?`
    )
    .bind(
      e.title, e.description, e.location,
      region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      e.isVirtual ? 1 : 0, e.isVirtual ? e.meetingUrl : "",
      e.startsAt, e.capacity, id
    )
    .run();

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  return { ok: true };
}

// Approve a member-submitted event so it appears on the calendar.
export async function approveEvent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("eventId"));
  if (!id) return;
  const ev = await getDb().prepare("SELECT submitted_by, title FROM events WHERE id = ?").bind(id).first<{ submitted_by: number | null; title: string }>();
  await getDb().prepare("UPDATE events SET status = 'approved' WHERE id = ?").bind(id).run();
  if (ev?.submitted_by) {
    await notify(ev.submitted_by, "event_approved", { actorId: admin.id });
    const u = await getDb().prepare("SELECT email FROM users WHERE id = ?").bind(ev.submitted_by).first<{ email: string }>();
    if (u?.email) await emailSubmissionDecision(u.email, "event", ev.title, true);
  }
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

// Decline a member-submitted event (kept out of every list).
export async function declineEvent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("eventId"));
  if (!id) return;
  const ev = await getDb().prepare("SELECT submitted_by, title FROM events WHERE id = ?").bind(id).first<{ submitted_by: number | null; title: string }>();
  await getDb().prepare("UPDATE events SET status = 'declined' WHERE id = ?").bind(id).run();
  if (ev?.submitted_by) {
    await notify(ev.submitted_by, "event_declined", { actorId: admin.id });
    const u = await getDb().prepare("SELECT email FROM users WHERE id = ?").bind(ev.submitted_by).first<{ email: string }>();
    if (u?.email) await emailSubmissionDecision(u.email, "event", ev.title, false);
  }
  revalidatePath("/admin/events");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("eventId"));
  if (!id) return;
  const db = getDb();
  await db.prepare("DELETE FROM rsvps WHERE event_id = ?").bind(id).run();
  await db.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}
