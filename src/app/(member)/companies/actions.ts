"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { storeImage, deleteImage } from "@/lib/media";
import { regionFromForm, locationLabel } from "@/lib/region";
import type { Company, User } from "@/lib/types";

export type CompanyState = { ok?: boolean; error?: string };

function readFields(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    name: field("name"),
    website: field("website"),
    linkedin: field("linkedin"),
    industry: field("industry"),
    size: field("size"),
    city: field("city"),
    state: field("state"),
    zip: field("zip"),
    description: field("description"),
  };
}

// A user may edit a company if they belong to it, or they're an admin.
function canEdit(user: User, companyId: number): boolean {
  return user.is_admin === 1 || (companyId > 0 && user.company_id === companyId);
}

export async function createCompany(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const user = await requireUser();
  const f = readFields(formData);
  if (!f.name) return { error: "Company name is required." };
  const region = await regionFromForm(f.city, f.state, f.zip);

  const res = await getDb()
    .prepare(
      `INSERT INTO companies (name, website, linkedin, industry, size, location, city, state, zip, dma_slug, dma_name, description, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      f.name, f.website, f.linkedin, f.industry, f.size,
      locationLabel(region.city, region.state), region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      f.description, user.id, Date.now()
    )
    .run();

  const companyId = Number(res.meta.last_row_id);
  // Link the creator to the new company (unless they already belong to one).
  if (user.company_id === 0) {
    await getDb().prepare("UPDATE users SET company_id = ? WHERE id = ?").bind(companyId, user.id).run();
  }

  revalidatePath("/companies");
  redirect(`/companies/${companyId}`);
}

export async function updateCompany(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const user = await requireUser();
  const companyId = Number(formData.get("companyId"));
  if (!canEdit(user, companyId)) return { error: "You don't have permission to edit this company." };

  const f = readFields(formData);
  if (!f.name) return { error: "Company name is required." };
  const region = await regionFromForm(f.city, f.state, f.zip);

  await getDb()
    .prepare(
      `UPDATE companies SET name = ?, website = ?, linkedin = ?, industry = ?, size = ?,
         location = ?, city = ?, state = ?, zip = ?, dma_slug = ?, dma_name = ?, description = ?
       WHERE id = ?`
    )
    .bind(
      f.name, f.website, f.linkedin, f.industry, f.size,
      locationLabel(region.city, region.state), region.city, region.state, region.zip, region.dma_slug, region.dma_name,
      f.description, companyId
    )
    .run();

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { ok: true };
}

export async function uploadCompanyLogo(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const user = await requireUser();
  const companyId = Number(formData.get("companyId"));
  if (!canEdit(user, companyId)) return { error: "You don't have permission to edit this company." };

  const result = await storeImage(`companies/${companyId}`, formData.get("logo"));
  if ("error" in result) return { error: result.error };

  const existing = await getDb()
    .prepare("SELECT logo_key FROM companies WHERE id = ?")
    .bind(companyId)
    .first<Pick<Company, "logo_key">>();

  await getDb().prepare("UPDATE companies SET logo_key = ? WHERE id = ?").bind(result.key, companyId).run();
  if (existing?.logo_key && existing.logo_key !== result.key) await deleteImage(existing.logo_key);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { ok: true };
}

export async function removeCompanyLogo(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const user = await requireUser();
  const companyId = Number(formData.get("companyId"));
  if (!canEdit(user, companyId)) return { error: "You don't have permission to edit this company." };

  const existing = await getDb()
    .prepare("SELECT logo_key FROM companies WHERE id = ?")
    .bind(companyId)
    .first<Pick<Company, "logo_key">>();
  if (existing?.logo_key) await deleteImage(existing.logo_key);

  await getDb().prepare("UPDATE companies SET logo_key = '' WHERE id = ?").bind(companyId).run();
  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}

// Set (or clear, with companyId = 0) the signed-in member's company.
export async function setMyCompany(companyId: number): Promise<void> {
  const user = await requireUser();
  await getDb().prepare("UPDATE users SET company_id = ? WHERE id = ?").bind(companyId, user.id).run();
  revalidatePath("/profile");
  revalidatePath(`/companies/${companyId}`);
}
