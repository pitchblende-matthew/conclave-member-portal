"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateToken } from "@/lib/crypto";

export async function createInvite(formData: FormData) {
  const user = await requireUser();
  if (user.is_admin !== 1) throw new Error("FORBIDDEN");

  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const token = generateToken(12);

  await getDb()
    .prepare("INSERT INTO invites (token, email, created_by, created_at) VALUES (?, ?, ?, ?)")
    .bind(token, email, user.id, Date.now())
    .run();

  revalidatePath("/admin/invites");
}
