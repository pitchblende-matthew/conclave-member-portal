"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
    startsAt: parseStartsAt(field("starts_at")),
    capacity: Number(formData.get("capacity") ?? 0) || 0,
  };
}

export async function createEvent(_prev: EventState, formData: FormData): Promise<EventState> {
  await requireAdmin();
  const e = readEvent(formData);
  if (!e.title) return { error: "Title is required." };
  if (e.startsAt === null) return { error: "A valid date and time is required." };

  await getDb()
    .prepare(
      `INSERT INTO events (title, description, location, starts_at, capacity, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(e.title, e.description, e.location, e.startsAt, e.capacity, Date.now())
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

  await getDb()
    .prepare(
      `UPDATE events SET title = ?, description = ?, location = ?, starts_at = ?, capacity = ?
       WHERE id = ?`
    )
    .bind(e.title, e.description, e.location, e.startsAt, e.capacity, id)
    .run();

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  return { ok: true };
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
