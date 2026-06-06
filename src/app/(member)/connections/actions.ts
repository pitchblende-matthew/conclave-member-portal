"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
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
  revalidatePath("/directory");
  revalidatePath(`/directory/${otherId}`);
}

// Send a connection request. If the other member already requested me, this
// accepts their request instead (so two crossing requests just connect).
export async function sendConnect(formData: FormData): Promise<void> {
  const me = await requireUser();
  const other = Number(formData.get("otherId"));
  if (!other || other === me.id) return;

  const db = getDb();
  const now = Date.now();
  const row = await pairRow(me.id, other);
  if (!row) {
    await db
      .prepare("INSERT INTO connections (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)")
      .bind(me.id, other, now)
      .run();
  } else if (row.status === "pending" && row.addressee_id === me.id) {
    await db.prepare("UPDATE connections SET status = 'accepted', responded_at = ? WHERE id = ?").bind(now, row.id).run();
  }
  refresh(other);
}

// Accept a pending request that was addressed to me.
export async function acceptConnect(formData: FormData): Promise<void> {
  const me = await requireUser();
  const other = Number(formData.get("otherId"));
  if (!other) return;
  await getDb()
    .prepare("UPDATE connections SET status = 'accepted', responded_at = ? WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'")
    .bind(Date.now(), other, me.id)
    .run();
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
