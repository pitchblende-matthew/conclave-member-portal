import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import ConfirmSubmit from "@/components/confirm-submit";
import { setPublished, deleteBriefing, approveBriefing, declineBriefing } from "./actions";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBriefings() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const db = getDb();
  const { results } = await db
    .prepare("SELECT * FROM briefings WHERE status = 'approved' ORDER BY updated_at DESC")
    .all<Briefing>();
  const { results: pending } = await db
    .prepare(
      `SELECT b.*, u.name AS submitter
       FROM briefings b LEFT JOIN users u ON u.id = b.submitted_by
       WHERE b.status = 'pending' ORDER BY b.created_at ASC`
    )
    .all<Briefing & { submitter: string | null }>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="topline">
        <div>
          <div className="tag">Admin · Briefings</div>
          <h1 style={{ fontSize: "2.6rem" }}>Manage briefings</h1>
        </div>
        <Link href="/admin/briefings/new" className="btn inline-btn">New briefing</Link>
      </div>

      {pending.length > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Pending submissions <span className="badge">{pending.length}</span></h2>
          {pending.map((b) => (
            <div key={b.id} className="card">
              <div className="tag">{b.kind === "link" ? "Link" : "Article"} · submitted by {b.submitter || "a member"}</div>
              <h3 style={{ fontSize: "1.5rem" }}>{b.title}</h3>
              {b.summary ? <p className="meta">{b.summary}</p> : null}
              {b.kind === "link" && b.url ? <p className="meta"><a href={b.url} target="_blank" rel="noreferrer">{b.url}</a></p> : null}
              <div className="btn-row">
                <form action={approveBriefing}>
                  <input type="hidden" name="briefingId" value={b.id} />
                  <button className="btn inline-btn" type="submit">Approve &amp; publish</button>
                </form>
                <Link href={`/admin/briefings/${b.id}/edit`} className="btn btn-ghost inline-btn">Review / edit</Link>
                <form action={declineBriefing}>
                  <input type="hidden" name="briefingId" value={b.id} />
                  <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Decline "${b.title}"?`}>Decline</ConfirmSubmit>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        {pending.length > 0 && <h2 style={{ fontSize: "1.5rem" }}>Published &amp; drafts</h2>}
        {results.map((b) => (
          <div key={b.id} className="card">
            <div className="tag">
              {b.kind === "link" ? "Link" : "Article"} ·{" "}
              {b.published ? `Published ${b.published_at ? formatDateTime(b.published_at) : ""}` : "Draft"}
            </div>
            <h3 style={{ fontSize: "1.5rem" }}>{b.title}</h3>
            {b.summary ? <p className="meta">{b.summary}</p> : null}
            <div className="btn-row">
              <Link href={`/admin/briefings/${b.id}/edit`} className="btn btn-ghost inline-btn">Edit</Link>
              <form action={setPublished}>
                <input type="hidden" name="briefingId" value={b.id} />
                <input type="hidden" name="published" value={b.published ? "0" : "1"} />
                <button className="btn btn-ghost inline-btn" type="submit">
                  {b.published ? "Unpublish" : "Publish"}
                </button>
              </form>
              <form action={deleteBriefing}>
                <input type="hidden" name="briefingId" value={b.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${b.title}"?`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No briefings yet. Create the first one.</p>}
      </div>
    </>
  );
}
