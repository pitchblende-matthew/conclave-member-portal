"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createExpertise, renameExpertise, deleteExpertise } from "@/lib/expertise";

function revalidate() {
  revalidatePath("/admin/expertise");
  revalidatePath("/directory");
  revalidatePath("/profile");
}

export async function addExpertise(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createExpertise(name);
  revalidate();
}

export async function editExpertise(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("itemId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await renameExpertise(id, name);
  revalidate();
}

export async function removeExpertise(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("itemId"));
  if (!id) return;
  await deleteExpertise(id);
  revalidate();
}
