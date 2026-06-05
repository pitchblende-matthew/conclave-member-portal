"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findOrCreateCompany } from "@/lib/companies";
import type { ProfileState } from "@/app/(member)/profile/actions";

// Step 2 — finish onboarding. Saves the full profile and marks the member
// onboarded, then drops them into the portal.
export async function completeOnboarding(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (user.status !== "approved") return { error: "Your account isn't approved yet." };

  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const companyId = await findOrCreateCompany(field("company_name"), user.id);

  await getDb()
    .prepare(
      `UPDATE users SET
         name = ?, role = ?, location = ?, pronouns = ?,
         phone = ?, website = ?, linkedin = ?, twitter = ?, bio = ?, company_id = ?,
         onboarded = 1
       WHERE id = ?`
    )
    .bind(
      field("name"), field("role"), field("location"), field("pronouns"),
      field("phone"), field("website"), field("linkedin"), field("twitter"),
      field("bio"), companyId, user.id
    )
    .run();

  redirect("/dashboard");
}
