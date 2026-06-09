import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listUserFeedback, feedbackStatusLabel } from "@/lib/feedback";
import Eyebrow from "@/components/eyebrow";
import LocalTime from "@/components/local-time";

export const dynamic = "force-dynamic";

export default async function MyFeedback() {
  const user = await requireUser();
  if (user.alpha_tester !== 1) redirect("/dashboard");

  const items = await listUserFeedback(user.id);

  return (
    <>
      <Eyebrow icon="sparkle">Alpha</Eyebrow>
      <h1 style={{ fontSize: "2.6rem" }}>Your reports</h1>
      <p className="meta">The bugs and features you&apos;ve sent, and where they stand.</p>

      <div style={{ marginTop: "1.5rem" }}>
        {items.map((f) => (
          <div key={f.id} className="card">
            <div className="tag">
              {f.kind === "bug" ? "Bug" : "Feature"} · <LocalTime ms={f.created_at} />
              <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{feedbackStatusLabel(f.status)}</span>
            </div>
            <p style={{ margin: "0.4rem 0 0.4rem", whiteSpace: "pre-wrap" }}>{f.body}</p>
            {f.page ? <p className="meta" style={{ margin: 0 }}>{f.page}</p> : null}
          </div>
        ))}
        {items.length === 0 && (
          <p className="meta">You haven&apos;t sent any feedback yet — use the <strong>Feedback</strong> button on any page.</p>
        )}
      </div>
    </>
  );
}
