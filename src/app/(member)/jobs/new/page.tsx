import ListingForm from "@/app/(member)/_listings/listing-form";
import { KIND_META } from "@/lib/listings-meta";

export const dynamic = "force-dynamic";

export default function NewJob() {
  return (
    <>
      <div className="tag">{KIND_META.job.section}</div>
      <h1 style={{ fontSize: "2.6rem" }}>{KIND_META.job.newHeading}</h1>
      <p className="meta">Posted to the network straight away. You can mark it filled or remove it anytime.</p>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <ListingForm kind="job" />
      </div>
    </>
  );
}
