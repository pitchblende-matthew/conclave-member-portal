"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { currentRound, generateDraft, addDraftPair, removeDraftPair, sendRound } from "@/lib/intros";

export async function generateIntros(): Promise<void> {
  await requireAdmin();
  await generateDraft(currentRound());
  revalidatePath("/admin/intros");
}

export async function unpair(formData: FormData): Promise<void> {
  await requireAdmin();
  await removeDraftPair(currentRound(), Number(formData.get("a")), Number(formData.get("b")));
  revalidatePath("/admin/intros");
}

export async function pair(formData: FormData): Promise<void> {
  await requireAdmin();
  await addDraftPair(currentRound(), Number(formData.get("a")), Number(formData.get("b")));
  revalidatePath("/admin/intros");
}

export async function sendIntros(): Promise<void> {
  await requireAdmin();
  await sendRound(currentRound());
  revalidatePath("/admin/intros");
}
