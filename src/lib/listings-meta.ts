import type { IconName } from "@/components/icons";

// Pure metadata + formatting for listings — no DB imports, so it's safe to use
// from client components (the post form) as well as server code.

export type ListingKind = "job" | "business";

type KindMeta = {
  slug: string;          // URL segment
  icon: IconName;
  section: string;       // eyebrow / breadcrumb label
  heading: string;       // page H1
  companyLabel: string;
  remoteLabel: string;   // checkbox label
  applyLabel: string;    // contact-link field label
  cta: string;           // detail action button ("Apply" / "Inquire")
  postCta: string;       // "Post a job" / "List a business"
  newHeading: string;
  emptyCta: string;
  areaLabel: string;     // AreaFilter noun
  closedLabel: string;   // "Filled" / "Sold"
};

export const KIND_META: Record<ListingKind, KindMeta> = {
  job: {
    slug: "jobs",
    icon: "briefcase",
    section: "Job board",
    heading: "Opportunities",
    companyLabel: "Company",
    remoteLabel: "Remote — open to the whole network",
    applyLabel: "How to apply (link)",
    cta: "Apply",
    postCta: "Post a job",
    newHeading: "Post a job",
    emptyCta: "Post the first job →",
    areaLabel: "jobs",
    closedLabel: "Filled",
  },
  business: {
    slug: "businesses",
    icon: "store",
    section: "Businesses for sale",
    heading: "Businesses for sale",
    companyLabel: "Business name",
    remoteLabel: "Online / location-independent",
    applyLabel: "Inquiry link",
    cta: "Inquire",
    postCta: "List a business",
    newHeading: "List a business for sale",
    emptyCta: "List the first business →",
    areaLabel: "listings",
    closedLabel: "Sold",
  },
};

export const SLUG_TO_KIND: Record<string, ListingKind> = { jobs: "job", businesses: "business" };

export const EMPLOYMENT_TYPES: { value: string; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
];

export function employmentLabel(value: string): string {
  return EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? "";
}

export function formatPrice(n: number): string {
  if (!n) return "Undisclosed";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
