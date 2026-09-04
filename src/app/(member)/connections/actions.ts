"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { emailConnectionRequest } from "@/lib/email";
import { slackDmConnectionRequest } from "@/lib/slack-bridge";
import { rateLimited } from "@/lib/rate-limit";
import type { Connection } from "@/lib/types";

async function pairRow(a: number, b: number) {
  return getDb()
    .prepare(
      `SELECT * FROM connections
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .bind(a, b, b, a)
    .first<Connection>();
}

function refresh(otherId: number) {
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/directory");
  revalidatePath(`/directory/${otherId}`);
}

// Send a connection request. If the other member already requested me, this
// accepts their request instead (so two crossing requests just connect).
export async function sendConnect(formData: FormData): Promise<void> {
  const me = await requireUser();
  const other = Number(formData.get("otherId"));
  if (!other || other === me.id) return;
  // Silently drop if they're firing off requests too fast.
  if (await rateLimited(`conn:${me.id}`, 30, 60 * 60 * 1000)) return;

  const db = getDb();
  const now = Date.now();
  const row = await pairRow(me.id, other);
  if (!row) {
    await db
      .prepare("INSERT INTO connections (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)")
      .bind(me.id, other, now)
      .run();
    await notify(other, "connection_request", { actorId: me.id });
    const target = await db.prepare("SELECT email, name FROM users WHERE id = ?").bind(other).first<{ email: string; name: string }>();
    if (target?.email) await emailConnectionRequest(target.email, target.name, me.name);
    await slackDmConnectionRequest(other, me.name);
  } else if (row.status === "pending" && row.addressee_id === me.id) {
    await db.prepare("UPDATE connections SET status = 'accepted', responded_at = ? WHERE id = ?").bind(now, row.id).run();
    // They asked first, so accepting it connects us — let them know.
    await notify(other, "connection_accepted", { actorId: me.id });
  }
  refresh(other);
}

// Accept a pending request that was addressed to me.
export async function acceptConnect(formData: FormData): Promise<void> {
  const me = await requireUser();
  const other = Number(formData.get("otherId"));
  if (!other) return;
  const res = await getDb()
    .prepare("UPDATE connections SET status = 'accepted', responded_at = ? WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'")
    .bind(Date.now(), other, me.id)
    .run();
  // Notify the requester that I accepted (only if a pending row was actually updated).
  if (res.meta.changes) await notify(other, "connection_accepted", { actorId: me.id });
  refresh(other);
}

// Remove the relationship in any state: decline an incoming request, cancel an
// outgoing one, or disconnect an accepted connection.
export async function removeConnect(formData: FormData): Promise<void> {
  const me = await requireUser();
  const other = Number(formData.get("otherId"));
  if (!other) return;
  await getDb()
    .prepare("DELETE FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)")
    .bind(me.id, other, other, me.id)
    .run();
  refresh(other);
}
