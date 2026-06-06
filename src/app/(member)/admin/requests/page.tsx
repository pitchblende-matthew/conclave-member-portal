import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { approveMember, declineMember } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string;
  email: string;
  company: string;
  role: string;
  linkedin: string;
  status: string;
  created_at: number;
};

export default async function AdminRequests() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT id, name, email, company, role, linkedin, status, created_at
       FROM users
       WHERE status IN ('pending', 'declined')
       ORDER BY (status = 'pending') DESC, created_at DESC`
    )
    .all<Row>();

  const pending = results.filter((r) => r.status === "pending");

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Access requests</div>
      <h1 style={{ fontSize: "2.6rem" }}>Requests</h1>
      <p className="meta">{pending.length} awaiting review</p>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((r) => (
          <div key={r.id} className="card">
            <div className="tag">
              {r.status === "pending" ? <>Requested <LocalTime ms={r.created_at} /></> : "Declined"}
            </div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{r.name || "—"}</h3>
            <p className="meta" style={{ margin: 0 }}>
              {[r.role, r.company].filter(Boolean).join(" · ") || "—"}
            </p>
            <p className="meta" style={{ margin: "0.25rem 0 0" }}>
              <a href={`mailto:${r.email}`}>{r.email}</a>
              {r.linkedin ? <> · <a href={r.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></> : null}
            </p>
            {r.status === "pending" && (
              <div className="btn-row" style={{ marginTop: "1rem" }}>
                <form action={approveMember}>
                  <input type="hidden" name="userId" value={r.id} />
                  <button className="btn inline-btn" type="submit">Approve</button>
                </form>
                <form action={declineMember}>
                  <input type="hidden" name="userId" value={r.id} />
                  <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Decline ${r.name || r.email}?`}>
                    Decline
                  </ConfirmSubmit>
                </form>
              </div>
            )}
            {r.status === "declined" && (
              <div className="btn-row" style={{ marginTop: "1rem" }}>
                <form action={approveMember}>
                  <input type="hidden" name="userId" value={r.id} />
                  <button className="btn btn-ghost inline-btn" type="submit">Approve after all</button>
                </form>
              </div>
            )}
          </div>
        ))}
        {results.length === 0 && <p className="meta">No requests right now.</p>}
      </div>
    </>
  );
}
