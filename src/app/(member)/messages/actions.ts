"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { connectionState } from "@/lib/connections";
import { notify } from "@/lib/notifications";
import { emailNewMessage } from "@/lib/email";

export type MessageState = { ok?: boolean; error?: string };

// Send a direct message. Allowed only between accepted connections.
export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const me = await requireUser();
  const other = Number(formData.get("otherId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!other || other === me.id) return { error: "Unknown recipient." };
  if (!body) return { error: "Write a message first." };
  if (body.length > 5000) return { error: "That message is too long." };

  if ((await connectionState(me.id, other)) !== "connected") {
    return { error: "You can only message your connections." };
  }

  const db = getDb();
  await db
    .prepare("INSERT INTO messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)")
    .bind(me.id, other, body, Date.now())
    .run();

  await notify(other, "message", { actorId: me.id });
  const u = await db.prepare("SELECT email, name FROM users WHERE id = ?").bind(other).first<{ email: string; name: string }>();
  if (u?.email) await emailNewMessage(u.email, u.name, me.name);

  revalidatePath(`/messages/${other}`);
  revalidatePath("/messages");
  return { ok: true };
}
