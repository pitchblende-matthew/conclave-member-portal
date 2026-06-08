"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { regionFromForm, validateRegion } from "@/lib/region";
import { insertListing, getListing, setListingStatus, removeListing } from "@/lib/listings";
import { KIND_META, type ListingKind } from "@/lib/listings-meta";

export type ListingState = { error?: string };

function priceField(formData: FormData, name: string): number {
  return Math.max(0, Math.round(Number(formData.get(name)) || 0));
}

export async function createListing(_prev: ListingState, formData: FormData): Promise<ListingState> {
  const user = await requireUser();
  const kind = String(formData.get("kind")) as ListingKind;
  if (kind !== "job" && kind !== "business") return { error: "Unknown listing type." };

  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const title = field("title");
  if (!title) return { error: "Give your listing a title." };

  const isRemote = formData.get("is_remote") === "1" ? 1 : 0;
  let region = { city: "", state: "", zip: "", dma_slug: "", dma_name: "" };
  if (!isRemote) {
    const err = validateRegion(field("city"), field("state"), field("zip"));
    if (err) return { error: err };
    region = await regionFromForm(field("city"), field("state"), field("zip"));
  }

  const id = await insertListing({
    kind,
    userId: user.id,
    title,
    company: field("company"),
    description: field("description"),
    isRemote,
    city: region.city,
    state: region.state,
    zip: region.zip,
    dmaSlug: region.dma_slug,
    dmaName: region.dma_name,
    employmentType: kind === "job" ? field("employment_type") : "",
    compensation: kind === "job" ? field("compensation") : "",
    askingPrice: kind === "business" ? priceField(formData, "asking_price") : 0,
    annualRevenue: kind === "business" ? priceField(formData, "annual_revenue") : 0,
    applyUrl: field("apply_url"),
    contactEmail: field("contact_email"),
  });

  revalidatePath(`/${KIND_META[kind].slug}`);
  redirect(`/${KIND_META[kind].slug}/${id}`);
}

// Toggle filled/sold. Only the poster or an admin may change it.
export async function toggleListingStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || (status !== "open" && status !== "closed")) return;
  const listing = await getListing(id);
  if (!listing || (listing.user_id !== user.id && user.is_admin !== 1)) return;
  await setListingStatus(id, status);
  const slug = KIND_META[listing.kind as ListingKind]?.slug ?? "jobs";
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/${id}`);
}

export async function deleteListing(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!id) return;
  const listing = await getListing(id);
  if (!listing || (listing.user_id !== user.id && user.is_admin !== 1)) return;
  await removeListing(id);
  const slug = KIND_META[listing.kind as ListingKind]?.slug ?? "jobs";
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}
