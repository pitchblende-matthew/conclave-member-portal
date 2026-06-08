import ListingsView from "@/app/(member)/_listings/list";

export const dynamic = "force-dynamic";

export default function JobsPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  return <ListingsView kind="job" searchParams={searchParams} />;
}
