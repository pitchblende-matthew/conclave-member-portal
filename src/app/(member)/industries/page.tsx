import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { requireUser } from "@/lib/auth";
import { industriesWithCounts } from "@/lib/industries";
import EmptyState from "@/components/empty-state";
import Icon from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Industries() {
  await requireUser();
  const industries = await industriesWithCounts();
  const withCompanies = industries.filter((i) => i.n > 0);

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon="categories">Network</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>By <span className="em">industry</span></h1>
        </div>
        <Link href="/companies" className="meta">All companies →</Link>
      </div>
      <p className="meta" style={{ marginTop: "0.4rem" }}>
        How the network&apos;s companies break down. Pick an industry to see who&apos;s in it.
      </p>

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {withCompanies.map((i) => (
          <Link key={i.id} href={`/companies?industry=${i.slug}`} className="card member-card stat-card">
            <div className="topline">
              <span className="card-ico"><Icon name="companies" size={20} /></span>
              <span className="stat">{i.n}</span>
            </div>
            <h3 style={{ fontSize: "1.4rem", margin: "0.6rem 0 0" }}>{i.name}</h3>
            <p className="meta" style={{ marginTop: "0.25rem" }}>{i.n === 1 ? "1 company" : `${i.n} companies`}</p>
          </Link>
        ))}
        {withCompanies.length === 0 && (
          <EmptyState title="No companies categorized yet">
            <Link href="/companies/new">Add a company →</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
