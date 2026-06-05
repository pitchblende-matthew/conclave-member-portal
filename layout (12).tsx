"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function toggleRsvp(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(formData.get("eventId"));
  if (!eventId) return;

  const db = getDb();
  const existing = await db
    .prepare("SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?")
    .bind(eventId, user.id)
    .first();

  if (existing) {
    await db.prepare("DELETE FROM rsvps WHERE event_id = ? AND user_id = ?").bind(eventId, user.id).run();
  } else {
    await db
      .prepare("INSERT INTO rsvps (event_id, user_id, status, created_at) VALUES (?, ?, 'going', ?)")
      .bind(eventId, user.id, Date.now())
      .run();
  }
  revalidatePath("/events");
}
