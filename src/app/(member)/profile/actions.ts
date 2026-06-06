"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { storeImage, deleteImage } from "@/lib/media";
import { findOrCreateCompany } from "@/lib/companies";
import { regionFromForm, validateRegion, locationLabel } from "@/lib/region";

export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const name = field("name");
  const role = field("role");
  const pronouns = field("pronouns");
  const phone = field("phone");
  const website = field("website");
  const linkedin = field("linkedin");
  const twitter = field("twitter");
  const bio = field("bio");

  const regionError = validateRegion(field("city"), field("state"), field("zip"));
  if (regionError) return { error: regionError };
  const region = await regionFromForm(field("city"), field("state"), field("zip"));
  const companyId = await findOrCreateCompany(field("company_name"), user.id);

  await getDb()
    .prepare(
      `UPDATE users SET
         name = ?, role = ?, pronouns = ?,
         location = ?, city = ?, state = ?, zip = ?, dma_slug = ?, dma_name = ?,
         phone = ?, website = ?, linkedin = ?, twitter = ?, bio = ?, company_id = ?
       WHERE id = ?`
    )
    .bind(
      name, role, pronouns,
      locationLabel(region.city, region.state), region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      phone, website, linkedin, twitter, bio, companyId, user.id
    )
    .run();

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true };
}

export async function uploadAvatar(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const result = await storeImage(`avatars/${user.id}`, formData.get("avatar"));
  if ("error" in result) return { error: result.error };

  await getDb().prepare("UPDATE users SET avatar_key = ? WHERE id = ?").bind(result.key, user.id).run();
  // Remove the previous image (best effort) now that the new one is saved.
  if (user.avatar_key && user.avatar_key !== result.key) await deleteImage(user.avatar_key);

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true };
}

export async function removeAvatar(_prev: ProfileState, _formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (user.avatar_key) await deleteImage(user.avatar_key);
  await getDb().prepare("UPDATE users SET avatar_key = '' WHERE id = ?").bind(user.id).run();

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true };
}
