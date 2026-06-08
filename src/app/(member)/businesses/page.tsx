import ListingsView from "@/app/(member)/_listings/list";

export const dynamic = "force-dynamic";

export default function BusinessesPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  return <ListingsView kind="business" searchParams={searchParams} />;
}
