"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function updateProfile(_prev: { ok?: boolean; error?: string }, formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  await getDb()
    .prepare("UPDATE users SET name = ?, company = ?, role = ?, location = ?, bio = ? WHERE id = ?")
    .bind(name, company, role, location, bio, user.id)
    .run();

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true };
}
