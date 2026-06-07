"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { toggleUserContent, type CType } from "@/lib/engagement";

const TYPES = new Set<CType>(["briefing", "post", "topic", "event"]);

// Only revalidate same-origin app paths submitted from the page the control is on.
function safePath(p: string): string {
  return p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard";
}

export async function toggleReaction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const type = String(formData.get("content_type") ?? "") as CType;
  const id = Number(formData.get("content_id"));
  if (!TYPES.has(type) || !id) return;
  await toggleUserContent(user.id, "react", type, id);
  revalidatePath(safePath(String(formData.get("path") ?? "")));
}

export async function toggleBookmark(formData: FormData): Promise<void> {
  const user = await requireUser();
  const type = String(formData.get("content_type") ?? "") as CType;
  const id = Number(formData.get("content_id"));
  if (!TYPES.has(type) || !id) return;
  await toggleUserContent(user.id, "save", type, id);
  revalidatePath(safePath(String(formData.get("path") ?? "")));
  revalidatePath("/saved");
}
