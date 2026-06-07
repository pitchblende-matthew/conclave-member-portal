import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { createIndustry, renameIndustry, deleteIndustry } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; slug: string; company_count: number };

export default async function AdminIndustries() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT i.id, i.name, i.slug,
              (SELECT COUNT(*) FROM companies c WHERE c.industry_id = i.id) AS company_count
       FROM industries i ORDER BY i.sort_order, i.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Industries</div>
      <h1 style={{ fontSize: "2.6rem" }}>Industries</h1>
      <p className="meta">How companies are organized across the network.</p>

      <div className="card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
        <form action={createIndustry} className="inline-form">
          <input name="name" placeholder="New industry name" required />
          <button className="btn inline-btn" type="submit">Add</button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((i) => (
          <div key={i.id} className="card admin-row">
            <form action={renameIndustry} className="inline-form" style={{ flex: 1, minWidth: 220 }}>
              <input type="hidden" name="industryId" value={i.id} />
              <input name="name" defaultValue={i.name} aria-label="Industry name" />
              <button className="btn btn-ghost inline-btn" type="submit">Rename</button>
            </form>
            <div className="btn-row">
              <span className="meta">{i.company_count} {i.company_count === 1 ? "company" : "companies"}</span>
              <form action={deleteIndustry}>
                <input type="hidden" name="industryId" value={i.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${i.name}"? Its companies move to Other.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No industries yet.</p>}
      </div>
    </>
  );
}
