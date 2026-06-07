import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { requireUser } from "@/lib/auth";
import { suggestedMembers } from "@/lib/suggestions";
import SuggestedMemberCard from "@/components/suggested-member-card";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function Discover() {
  const user = await requireUser();
  const suggestions = await suggestedMembers(user, 24);
  const hasSignals = !!user.dma_slug || user.function_id !== 0 || user.seniority_id !== 0 || user.company_id !== 0;

  return (
    <>
      <Eyebrow icon="connections">Discover</Eyebrow>
      <h1 style={{ fontSize: "2.6rem" }}>Members you should <span className="em">meet</span></h1>
      <p className="meta" style={{ maxWidth: 600 }}>
        People you&apos;re not yet connected to, matched by market, discipline, seniority, and industry.
      </p>

      {suggestions.length > 0 ? (
        <div className="suggest-grid" style={{ marginTop: "1.5rem" }}>
          {suggestions.map((m) => <SuggestedMemberCard key={m.id} m={m} />)}
        </div>
      ) : (
        <div style={{ marginTop: "1.5rem" }}>
          <EmptyState title={hasSignals ? "No suggestions right now" : "Tell us a bit about yourself"}>
            {hasSignals ? (
              <Link href="/directory">Browse the full directory →</Link>
            ) : (
              <>Add your market, function, and seniority in your <Link href="/profile">profile</Link> to get matched.</>
            )}
          </EmptyState>
        </div>
      )}
    </>
  );
}
