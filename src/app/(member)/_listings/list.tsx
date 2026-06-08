import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import AreaFilter from "@/components/area-filter";
import EmptyState from "@/components/empty-state";
import LocalTime from "@/components/local-time";
import { requireUser } from "@/lib/auth";
import { marketsIn, resolveArea } from "@/lib/region";
import { listListings } from "@/lib/listings";
import { KIND_META, employmentLabel, formatPrice, type ListingKind } from "@/lib/listings-meta";

export default async function ListingsView({
  kind,
  searchParams,
}: {
  kind: ListingKind;
  searchParams: Promise<{ area?: string }>;
}) {
  const user = await requireUser();
  const meta = KIND_META[kind];
  const { area } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("listings");
  const listings = await listListings(kind, { area: active });

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon={meta.icon}>{meta.section}</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>{meta.heading}</h1>
        </div>
        <Link href={`/${meta.slug}/new`} className="btn inline-btn">{meta.postCta}</Link>
      </div>

      <AreaFilter
        basePath={`/${meta.slug}`}
        active={active}
        myDma={user.dma_slug ? { slug: user.dma_slug, name: user.dma_name } : null}
        markets={markets}
        label={meta.areaLabel}
      />

      <div style={{ marginTop: "1.5rem" }}>
        {listings.map((l) => (
          <div key={l.id} className="card">
            <div className="tag">
              {l.is_remote ? <span className="market-tag">Remote</span> : l.dma_name ? <span className="market-tag">{l.dma_name}</span> : null}
              {kind === "job" && l.employment_type ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{employmentLabel(l.employment_type)}</span> : null}
              {kind === "business" ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{formatPrice(l.asking_price)}</span> : null}
            </div>
            <h3 style={{ fontSize: "1.6rem", margin: "0.4rem 0 0.3rem" }}>
              <Link href={`/${meta.slug}/${l.id}`} style={{ textDecoration: "none", color: "inherit" }}>{l.title}</Link>
            </h3>
            {l.company ? <p className="meta" style={{ marginTop: 0 }}>{l.company}</p> : null}
            {l.description ? <p className="member-card-bio">{l.description}</p> : null}
            <p className="card-detail">
              {kind === "job" && l.compensation ? `${l.compensation} · ` : ""}
              Posted by {l.author || "a member"} · <LocalTime ms={l.created_at} mode="date" />
            </p>
          </div>
        ))}
        {listings.length === 0 && (
          <EmptyState title={active ? "Nothing here in this market yet" : `No ${kind === "job" ? "openings" : "listings"} yet`}>
            <Link href={`/${meta.slug}/new`}>{meta.emptyCta}</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
