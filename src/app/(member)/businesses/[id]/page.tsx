import ListingDetail from "@/app/(member)/_listings/detail";

export const dynamic = "force-dynamic";

export default function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  return <ListingDetail kind="business" params={params} />;
}
