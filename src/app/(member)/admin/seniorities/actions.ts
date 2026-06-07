"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createTaxon, renameTaxon, deleteTaxon } from "@/lib/admin-taxonomy";

function revalidate() {
  revalidatePath("/admin/seniorities");
  revalidatePath("/directory");
}

export async function createSeniority(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createTaxon("seniorities", name);
  revalidate();
}

export async function renameSeniority(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("itemId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await renameTaxon("seniorities", id, name);
  revalidate();
}

export async function deleteSeniority(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("itemId"));
  if (!id) return;
  await deleteTaxon("seniorities", "seniority_id", id);
  revalidate();
}
