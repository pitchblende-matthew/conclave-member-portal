import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { markInviteHandled, deleteInviteRequest } from "./actions";
import type { InviteRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminInviteRequests() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare("SELECT * FROM invite_requests WHERE status != 'dismissed' ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200")
    .all<InviteRequest>();
  const newCount = results.filter((r) => r.status === "new").length;

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Invitation requests</div>
      <h1 style={{ fontSize: "2.6rem" }}>Invitation requests</h1>
      <p className="meta">{newCount} new · from the marketing site</p>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((r) => (
          <div key={r.id} className="card">
            <div className="tag">{r.status === "new" ? "New" : "Handled"} · <LocalTime ms={r.created_at} /></div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>{r.name || "—"}</h3>
            <p className="meta" style={{ margin: 0 }}><a href={`mailto:${r.email}`}>{r.email}</a></p>
            {r.note ? <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{r.note}</p> : null}
            <div className="btn-row" style={{ marginTop: "0.85rem" }}>
              {r.status === "new" && (
                <form action={markInviteHandled}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <button className="btn btn-ghost inline-btn" type="submit">Mark handled</button>
                </form>
              )}
              <form action={deleteInviteRequest}>
                <input type="hidden" name="requestId" value={r.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete the request from ${r.email}?`}>Delete</ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No invitation requests yet.</p>}
      </div>
    </>
  );
}
