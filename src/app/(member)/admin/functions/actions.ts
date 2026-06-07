"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createTaxon, renameTaxon, deleteTaxon } from "@/lib/admin-taxonomy";

function revalidate() {
  revalidatePath("/admin/functions");
  revalidatePath("/functions");
  revalidatePath("/directory");
}

export async function createFunction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createTaxon("functions", name);
  revalidate();
}

export async function renameFunction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("itemId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await renameTaxon("functions", id, name);
  revalidate();
}

export async function deleteFunction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("itemId"));
  if (!id) return;
  await deleteTaxon("functions", "function_id", id);
  revalidate();
}
