import ListingDetail from "@/app/(member)/_listings/detail";

export const dynamic = "force-dynamic";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  return <ListingDetail kind="job" params={params} />;
}
