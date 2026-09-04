"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { rateLimited } from "@/lib/rate-limit";
import { REQUEST_CATEGORIES, insertRequest, insertResponse, setRequestStatus, removeRequest } from "@/lib/requests";
import { slackAnnounceRequest } from "@/lib/slack-bridge";
import type { RequestKind } from "@/lib/requests";

export type RequestState = { ok?: boolean; error?: string };

const CATEGORY_SLUGS = REQUEST_CATEGORIES.map((c) => c.slug) as readonly string[];

export async function createRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const user = await requireUser();
  const kind: RequestKind = formData.get("kind") === "offer" ? "offer" : "ask";
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "other");
  const category = CATEGORY_SLUGS.includes(categoryRaw) ? categoryRaw : "other";

  if (!title) return { error: kind === "ask" ? "What do you need? Give it a title." : "What are you offering? Give it a title." };
  if (await rateLimited(`request:${user.id}`, 8, 60_000)) return { error: "You're posting too fast — please wait a moment." };

  const id = await insertRequest({ kind, userId: user.id, title, body, category });
  await slackAnnounceRequest({ id, title, kind });
  revalidatePath("/requests");
  redirect(`/requests/${id}`);
}

export async function respondToRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const user = await requireUser();
  const requestId = Number(formData.get("requestId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!requestId) return { error: "Unknown post." };
  if (!body) return { error: "Write a response first." };
  if (await rateLimited(`request:${user.id}`, 12, 60_000)) return { error: "You're responding too fast — please wait a moment." };

  await insertResponse(requestId, user.id, body);
  // Notify the poster (topic_id carries the request id — see layout.tsx).
  const owner = await getDb().prepare("SELECT user_id FROM requests WHERE id = ?").bind(requestId).first<{ user_id: number }>();
  await notify(owner?.user_id, "request_response", { actorId: user.id, topicId: requestId });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { ok: true };
}

// Toggle a post between open and resolved. Poster or admin only.
export async function toggleResolved(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = Number(formData.get("requestId"));
  if (!requestId) return;
  const r = await getDb().prepare("SELECT user_id, status FROM requests WHERE id = ?").bind(requestId).first<{ user_id: number; status: string }>();
  if (!r) return;
  if (user.is_admin !== 1 && r.user_id !== user.id) return;
  await setRequestStatus(requestId, r.status === "open" ? "resolved" : "open");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
}

// Delete a post and its responses. Poster or admin only.
export async function deleteRequest(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = Number(formData.get("requestId"));
  if (!requestId) return;
  const r = await getDb().prepare("SELECT user_id FROM requests WHERE id = ?").bind(requestId).first<{ user_id: number }>();
  if (!r) return;
  if (user.is_admin !== 1 && r.user_id !== user.id) return;
  await removeRequest(requestId);
  await getDb().prepare("DELETE FROM notifications WHERE type = 'request_response' AND topic_id = ?").bind(requestId).run();
  revalidatePath("/requests");
  redirect("/requests");
}

// Delete a single response. Response author or admin only.
export async function deleteResponse(formData: FormData): Promise<void> {
  const user = await requireUser();
  const responseId = Number(formData.get("responseId"));
  if (!responseId) return;
  const db = getDb();
  const resp = await db.prepare("SELECT request_id, user_id FROM request_responses WHERE id = ?").bind(responseId).first<{ request_id: number; user_id: number }>();
  if (!resp) return;
  if (user.is_admin !== 1 && resp.user_id !== user.id) return;
  await db.prepare("DELETE FROM request_responses WHERE id = ?").bind(responseId).run();
  revalidatePath(`/requests/${resp.request_id}`);
}
