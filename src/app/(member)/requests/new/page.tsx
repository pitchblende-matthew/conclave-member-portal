import Link from "next/link";
import { requireUser } from "@/lib/auth";
import NewRequestForm from "./new-request-form";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireUser();
  const { kind } = await searchParams;
  const defaultKind = kind === "offer" ? "offer" : "ask";
  return (
    <>
      <p className="meta"><Link href="/requests">← Asks &amp; Offers</Link></p>
      <h1 style={{ fontSize: "2.4rem", marginBottom: "0.25rem" }}>Post an ask or offer</h1>
      <p className="meta" style={{ marginTop: 0 }}>Kept inside the network. Members respond in the open, or reach you directly.</p>
      <NewRequestForm defaultKind={defaultKind} />
    </>
  );
}
