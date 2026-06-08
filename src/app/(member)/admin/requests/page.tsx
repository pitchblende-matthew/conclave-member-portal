import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { approveMember, declineMember, markInviteHandled, deleteInviteRequest } from "../actions";

export const dynamic = "force-dynamic";

type UserRow = {
  id: number;
  name: string;
  email: string;
  company: string;
  role: string;
  linkedin: string;
  apply_note: string;
  status: string;
  created_at: number;
};

type InviteRow = {
  id: number;
  name: string;
  email: string;
  note: string;
  status: string;
  created_at: number;
};

type Item =
  | ({ kind: "application"; active: boolean } & UserRow)
  | ({ kind: "invite"; active: boolean } & InviteRow);

export default async function AdminRequests() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const db = getDb();
  const [{ results: users }, { results: invites }] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, email, company, role, linkedin, apply_note, status, created_at
         FROM users
         WHERE status IN ('pending', 'declined')`
      )
      .all<UserRow>(),
    db
      .prepare(
        `SELECT id, name, email, note, status, created_at
         FROM invite_requests
         WHERE status != 'dismissed'`
      )
      .all<InviteRow>(),
  ]);

  // Two different sources, one queue: account applications awaiting approval and
  // invitation requests from the marketing site. Active (unhandled) items float up,
  // then newest first.
  const items: Item[] = [
    ...users.map((u) => ({ ...u, kind: "application" as const, active: u.status === "pending" })),
    ...invites.map((i) => ({ ...i, kind: "invite" as const, active: i.status === "new" })),
  ].sort((a, b) => Number(b.active) - Number(a.active) || b.created_at - a.created_at);

  const pendingCount = items.filter((i) => i.active).length;

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Requests</div>
      <h1 style={{ fontSize: "2.6rem" }}>Requests</h1>
      <p className="meta">{pendingCount} awaiting review · applications &amp; invitation requests</p>

      <div style={{ marginTop: "1.5rem" }}>
        {items.map((item) =>
          item.kind === "application" ? (
            <div key={`u${item.id}`} className="card">
              <div className="tag">
                {item.status === "pending" ? (
                  <>Application · Requested <LocalTime ms={item.created_at} /></>
                ) : (
                  "Application · Declined"
                )}
              </div>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{item.name || "—"}</h3>
              <p className="meta" style={{ margin: 0 }}>
                {[item.role, item.company].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="meta" style={{ margin: "0.25rem 0 0" }}>
                <a href={`mailto:${item.email}`}>{item.email}</a>
                {item.linkedin ? <> · <a href={item.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></> : null}
              </p>
              {item.apply_note ? <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{item.apply_note}</p> : null}
              {item.status === "pending" && (
                <div className="btn-row" style={{ marginTop: "1rem" }}>
                  <form action={approveMember}>
                    <input type="hidden" name="userId" value={item.id} />
                    <button className="btn inline-btn" type="submit">Approve</button>
                  </form>
                  <form action={declineMember}>
                    <input type="hidden" name="userId" value={item.id} />
                    <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Decline ${item.name || item.email}?`}>
                      Decline
                    </ConfirmSubmit>
                  </form>
                </div>
              )}
              {item.status === "declined" && (
                <div className="btn-row" style={{ marginTop: "1rem" }}>
                  <form action={approveMember}>
                    <input type="hidden" name="userId" value={item.id} />
                    <button className="btn btn-ghost inline-btn" type="submit">Approve after all</button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div key={`i${item.id}`} className="card">
              <div className="tag">
                {item.status === "new" ? (
                  <>Invitation request · <LocalTime ms={item.created_at} /></>
                ) : (
                  "Invitation request · Handled"
                )}
              </div>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>{item.name || "—"}</h3>
              <p className="meta" style={{ margin: 0 }}><a href={`mailto:${item.email}`}>{item.email}</a></p>
              {item.note ? <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{item.note}</p> : null}
              <div className="btn-row" style={{ marginTop: "0.85rem" }}>
                {item.status === "new" && (
                  <form action={markInviteHandled}>
                    <input type="hidden" name="requestId" value={item.id} />
                    <button className="btn btn-ghost inline-btn" type="submit">Mark handled</button>
                  </form>
                )}
                <form action={deleteInviteRequest}>
                  <input type="hidden" name="requestId" value={item.id} />
                  <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete the request from ${item.email}?`}>
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          )
        )}
        {items.length === 0 && <p className="meta">No requests right now.</p>}
      </div>
    </>
  );
}
