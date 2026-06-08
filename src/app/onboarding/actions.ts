"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findOrCreateCompany } from "@/lib/companies";
import { setUserExpertise } from "@/lib/expertise";
import { regionFromForm, validateRegion, locationLabel } from "@/lib/region";
import type { ProfileState } from "@/app/(member)/profile/actions";

// Step 2 — finish onboarding. Saves the full profile and marks the member
// onboarded, then drops them into the portal.
export async function completeOnboarding(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (user.status !== "approved") return { error: "Your account isn't approved yet." };

  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const regionError = validateRegion(field("city"), field("state"), field("zip"));
  if (regionError) return { error: regionError };
  const region = await regionFromForm(field("city"), field("state"), field("zip"));
  const companyId = await findOrCreateCompany(field("company_name"), user.id);

  await getDb()
    .prepare(
      `UPDATE users SET
         name = ?, role = ?, function_id = ?, seniority_id = ?, pronouns = ?,
         location = ?, city = ?, state = ?, zip = ?, dma_slug = ?, dma_name = ?,
         phone = ?, website = ?, linkedin = ?, twitter = ?, bio = ?, company_id = ?,
         discover_region_only = ?, discover_peers_only = ?,
         onboarded = 1
       WHERE id = ?`
    )
    .bind(
      field("name"), field("role"), Number(formData.get("function_id")) || 0, Number(formData.get("seniority_id")) || 0, field("pronouns"),
      locationLabel(region.city, region.state), region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      field("phone"), field("website"), field("linkedin"), field("twitter"),
      field("bio"), companyId,
      formData.get("discover_region_only") ? 1 : 0, formData.get("discover_peers_only") ? 1 : 0, user.id
    )
    .run();

  const expertiseIds = formData.getAll("expertise").map((v) => Number(v)).filter(Boolean);
  await setUserExpertise(user.id, expertiseIds);

  redirect("/dashboard");
}
