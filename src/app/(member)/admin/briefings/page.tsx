import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import ConfirmSubmit from "@/components/confirm-submit";
import { setPublished, deleteBriefing } from "./actions";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBriefings() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare("SELECT * FROM briefings ORDER BY updated_at DESC")
    .all<Briefing>();

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

      <div style={{ marginTop: "1.5rem" }}>
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
