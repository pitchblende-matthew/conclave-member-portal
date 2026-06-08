import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import LocalTime from "@/components/local-time";
import Avatar from "@/components/avatar";
import ConfirmSubmit from "@/components/confirm-submit";
import { getListing } from "@/lib/listings";
import { KIND_META, employmentLabel, formatPrice, type ListingKind } from "@/lib/listings-meta";
import { toggleListingStatus, deleteListing } from "./actions";

export default async function ListingDetail({
  kind,
  params,
}: {
  kind: ListingKind;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const l = await getListing(Number(id));
  if (!l || l.kind !== kind) notFound();

  const meta = KIND_META[kind];
  const canManage = l.user_id === user.id || user.is_admin === 1;
  const closed = l.status !== "open";

  return (
    <article style={{ maxWidth: 720, margin: "0 auto" }}>
      <p className="meta"><Link href={`/${meta.slug}`}>← {meta.section}</Link></p>

      <div className="tag">
        {l.is_remote ? <span className="market-tag">Remote</span> : l.dma_name ? <span className="market-tag">{l.dma_name}</span> : null}
        {kind === "job" && l.employment_type ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{employmentLabel(l.employment_type)}</span> : null}
        {closed ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{meta.closedLabel}</span> : null}
      </div>

      <h1 style={{ fontSize: "2.6rem", margin: "0.4rem 0 0.3rem" }}>{l.title}</h1>
      {l.company ? <p className="meta" style={{ marginTop: 0, fontSize: "1.05rem" }}>{l.company}</p> : null}

      {(kind === "job" && l.compensation) || kind === "business" ? (
        <dl className="detail-list" style={{ marginTop: "1rem" }}>
          {kind === "job" && l.compensation ? (<><dt>Compensation</dt><dd>{l.compensation}</dd></>) : null}
          {kind === "business" ? (<><dt>Asking price</dt><dd>{formatPrice(l.asking_price)}</dd></>) : null}
          {kind === "business" && l.annual_revenue ? (<><dt>Annual revenue</dt><dd>{formatPrice(l.annual_revenue)}</dd></>) : null}
        </dl>
      ) : null}

      {l.description ? <p style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>{l.description}</p> : null}

      {(l.apply_url || l.contact_email) && !closed ? (
        <div className="btn-row" style={{ marginTop: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          {l.apply_url ? <a className="btn inline-btn" href={l.apply_url} target="_blank" rel="noreferrer">{meta.cta} ↗</a> : null}
          {l.contact_email ? <a className="btn btn-ghost inline-btn" href={`mailto:${l.contact_email}`}>Email</a> : null}
        </div>
      ) : null}

      <p className="card-detail" style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link href={`/directory/${l.user_id}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "inherit" }}>
          <Avatar src={l.avatar_key ? mediaUrl(l.avatar_key) : null} name={l.author ?? ""} size={28} />
          <span>{l.author || "A member"}</span>
        </Link>
        <span>· <LocalTime ms={l.created_at} mode="date" /></span>
      </p>

      {canManage && (
        <div className="btn-row" style={{ marginTop: "1.25rem" }}>
          <form action={toggleListingStatus}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="status" value={closed ? "open" : "closed"} />
            <button className="btn btn-ghost inline-btn" type="submit">
              {closed ? "Reopen" : `Mark ${meta.closedLabel.toLowerCase()}`}
            </button>
          </form>
          <form action={deleteListing}>
            <input type="hidden" name="id" value={l.id} />
            <ConfirmSubmit className="btn btn-ghost inline-btn" message="Delete this listing?">Delete</ConfirmSubmit>
          </form>
        </div>
      )}
    </article>
  );
}
