import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listFeedback } from "@/lib/feedback";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { resolveFeedback, removeFeedback } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminFeedback() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const items = await listFeedback();
  const openCount = items.filter((i) => i.status === "open").length;

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Feedback</div>
      <h1 style={{ fontSize: "2.6rem" }}>Alpha feedback</h1>
      <p className="meta">{openCount} open · bug reports and feature requests from alpha testers.</p>

      <div style={{ marginTop: "1.5rem" }}>
        {items.map((f) => {
          const closed = f.status !== "open";
          return (
            <div key={f.id} className="card" style={closed ? { opacity: 0.6 } : undefined}>
              <div className="tag">
                {f.kind === "bug" ? "Bug" : "Feature"} · <LocalTime ms={f.created_at} />
                {closed ? <span className="market-tag" style={{ marginLeft: "0.6rem" }}>Resolved</span> : null}
              </div>
              <p style={{ margin: "0.4rem 0 0.5rem", whiteSpace: "pre-wrap" }}>{f.body}</p>
              <p className="meta" style={{ margin: 0 }}>
                {f.author || "A member"}
                {f.page ? <> · <Link href={f.page}>{f.page}</Link></> : null}
              </p>
              <div className="btn-row" style={{ marginTop: "0.85rem" }}>
                <form action={resolveFeedback}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="status" value={closed ? "open" : "closed"} />
                  <button className="btn btn-ghost inline-btn" type="submit">{closed ? "Reopen" : "Mark resolved"}</button>
                </form>
                <form action={removeFeedback}>
                  <input type="hidden" name="id" value={f.id} />
                  <ConfirmSubmit className="btn btn-ghost inline-btn" message="Delete this feedback?">Delete</ConfirmSubmit>
                </form>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="meta">No feedback yet.</p>}
      </div>
    </>
  );
}
