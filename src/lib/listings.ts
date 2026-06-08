import { getDb } from "./db";
import type { ListingKind } from "./listings-meta";

export type Listing = {
  id: number;
  kind: string;
  user_id: number;
  title: string;
  company: string;
  description: string;
  is_remote: number;
  city: string;
  state: string;
  zip: string;
  dma_slug: string;
  dma_name: string;
  employment_type: string;
  compensation: string;
  asking_price: number;
  annual_revenue: number;
  apply_url: string;
  contact_email: string;
  status: string;
  created_at: number;
  updated_at: number;
};

export type ListingWithAuthor = Listing & { author: string | null; avatar_key: string | null };

// Open listings of one kind, newest first, optionally limited to a market
// (remote listings always show, since they're network-wide).
export async function listListings(kind: ListingKind, opts: { area?: string | null } = {}): Promise<ListingWithAuthor[]> {
  const conds = ["l.kind = ?", "l.status = 'open'"];
  const binds: (string | number)[] = [kind];
  if (opts.area) {
    conds.push("(l.dma_slug = ? OR l.is_remote = 1)");
    binds.push(opts.area);
  }
  const { results } = await getDb()
    .prepare(
      `SELECT l.*, u.name AS author, u.avatar_key
       FROM listings l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${conds.join(" AND ")}
       ORDER BY l.created_at DESC`
    )
    .bind(...binds)
    .all<ListingWithAuthor>();
  return results;
}

export async function getListing(id: number): Promise<ListingWithAuthor | null> {
  return await getDb()
    .prepare(
      `SELECT l.*, u.name AS author, u.avatar_key
       FROM listings l LEFT JOIN users u ON u.id = l.user_id
       WHERE l.id = ?`
    )
    .bind(id)
    .first<ListingWithAuthor>();
}

export type NewListing = {
  kind: ListingKind;
  userId: number;
  title: string;
  company: string;
  description: string;
  isRemote: number;
  city: string;
  state: string;
  zip: string;
  dmaSlug: string;
  dmaName: string;
  employmentType: string;
  compensation: string;
  askingPrice: number;
  annualRevenue: number;
  applyUrl: string;
  contactEmail: string;
};

export async function insertListing(d: NewListing): Promise<number> {
  const now = Date.now();
  const res = await getDb()
    .prepare(
      `INSERT INTO listings
         (kind, user_id, title, company, description, is_remote, city, state, zip, dma_slug, dma_name,
          employment_type, compensation, asking_price, annual_revenue, apply_url, contact_email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
    )
    .bind(
      d.kind, d.userId, d.title, d.company, d.description, d.isRemote, d.city, d.state, d.zip, d.dmaSlug, d.dmaName,
      d.employmentType, d.compensation, d.askingPrice, d.annualRevenue, d.applyUrl, d.contactEmail, now, now
    )
    .run();
  return Number(res.meta.last_row_id);
}

export async function setListingStatus(id: number, status: "open" | "closed"): Promise<void> {
  await getDb().prepare("UPDATE listings SET status = ?, updated_at = ? WHERE id = ?").bind(status, Date.now(), id).run();
}

export async function removeListing(id: number): Promise<void> {
  await getDb().prepare("DELETE FROM listings WHERE id = ?").bind(id).run();
}
