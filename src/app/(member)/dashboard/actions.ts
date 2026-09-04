"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markMet } from "@/lib/intros";

// Member marks their monthly intro as connected, from the dashboard card.
export async function markIntroMet(formData: FormData): Promise<void> {
  const user = await requireUser();
  await markMet(Number(formData.get("pairId")), user.id);
  revalidatePath("/dashboard");
}
