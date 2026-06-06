"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// Mark all of the signed-in member's notifications as read (called when they
// open the bell).
export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .bind(Date.now(), user.id)
    .run();
  revalidatePath("/dashboard");
}
