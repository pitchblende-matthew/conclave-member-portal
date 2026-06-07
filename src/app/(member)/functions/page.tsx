import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { requireUser } from "@/lib/auth";
import { functionsWithCounts } from "@/lib/member-taxonomy";
import EmptyState from "@/components/empty-state";
import Icon from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Functions() {
  const user = await requireUser();
  const functions = await functionsWithCounts(user);
  const withMembers = functions.filter((f) => f.n > 0);

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon="members">Network</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>By <span className="em">function</span></h1>
        </div>
        <Link href="/directory" className="meta">All members →</Link>
      </div>
      <p className="meta" style={{ marginTop: "0.4rem" }}>
        How the network breaks down by discipline. Pick one to see who&apos;s in it.
      </p>

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {withMembers.map((f) => (
          <Link key={f.id} href={`/directory?function=${f.slug}`} className="card member-card stat-card">
            <div className="topline">
              <span className="card-ico"><Icon name="members" size={20} /></span>
              <span className="stat">{f.n}</span>
            </div>
            <h3 style={{ fontSize: "1.4rem", margin: "0.6rem 0 0" }}>{f.name}</h3>
            <p className="meta" style={{ marginTop: "0.25rem" }}>{f.n === 1 ? "1 member" : `${f.n} members`}</p>
          </Link>
        ))}
        {withMembers.length === 0 && (
          <EmptyState title="No members categorized yet">
            <Link href="/profile">Set your function →</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
