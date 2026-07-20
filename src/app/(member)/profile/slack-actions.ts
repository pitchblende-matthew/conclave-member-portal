"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { unlinkSlack } from "@/lib/slack";

export async function disconnectSlack(): Promise<void> {
  const user = await requireUser();
  await unlinkSlack(user.id);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
