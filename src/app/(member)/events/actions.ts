"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { regionFromForm } from "@/lib/region";
import { notifyAdmins } from "@/lib/notifications";
import { emailAdminsNewSubmission } from "@/lib/email";
import { slackAdminNewSubmission } from "@/lib/slack-bridge";
import { readTagIds, setContentTags } from "@/lib/content-tags";

export type SubmitState = { ok?: boolean; error?: string };

// A member proposes an event. It lands as 'pending' for an admin to approve.
export async function submitEvent(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const user = await requireUser();
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const title = field("title");
  if (!title) return { error: "Give your event a title." };
  const startsAt = field("starts_at") ? Date.parse(`${field("starts_at")}:00Z`) : NaN;
  if (Number.isNaN(startsAt)) return { error: "Choose a valid date and time." };

  const isVirtual = formData.get("is_virtual") === "1";
  const region = isVirtual
    ? { city: "", state: "", zip: "", dma_slug: "", dma_name: "" }
    : await regionFromForm(field("city"), field("state"), field("zip"));

  const res = await getDb()
    .prepare(
      `INSERT INTO events (title, description, location, city, state, zip, dma_slug, dma_name,
         is_virtual, meeting_url, status, submitted_by, starts_at, capacity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(
      title, field("description"), field("location"),
      region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      isVirtual ? 1 : 0, isVirtual ? field("meeting_url") : "",
      user.id, startsAt, Number(formData.get("capacity") ?? 0) || 0, Date.now()
    )
    .run();

  const tags = readTagIds(formData);
  await setContentTags("event", Number(res.meta.last_row_id), tags.industry, tags.function);

  await notifyAdmins("event_submitted", { actorId: user.id });
  await emailAdminsNewSubmission("event", user.name, title);
  await slackAdminNewSubmission("event", user.name, title);
  revalidatePath("/admin/events");
  return { ok: true };
}

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
  revalidatePath(`/events/${eventId}`);
}
