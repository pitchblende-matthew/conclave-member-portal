import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import ConfirmSubmit from "@/components/confirm-submit";
import { deleteCompany } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string;
  logo_key: string;
  industry: string;
  member_count: number;
};

export default async function AdminCompanies() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT c.id, c.name, c.logo_key, c.industry,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS member_count
       FROM companies c ORDER BY c.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Companies</div>
      <h1 style={{ fontSize: "2.6rem" }}>Manage companies</h1>
      <p className="meta">{results.length} {results.length === 1 ? "company" : "companies"}</p>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((c) => (
          <div key={c.id} className="card admin-row">
            <Link href={`/companies/${c.id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit" }}>
              <Avatar src={c.logo_key ? mediaUrl(c.logo_key) : null} name={c.name} size={44} />
              <div>
                <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>{c.name}</h3>
                <p className="meta" style={{ margin: 0 }}>
                  {[c.industry, `${c.member_count} ${c.member_count === 1 ? "member" : "members"}`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
            <div className="btn-row">
              <Link href={`/companies/${c.id}/edit`} className="btn btn-ghost inline-btn">Edit</Link>
              <form action={deleteCompany}>
                <input type="hidden" name="companyId" value={c.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete ${c.name}? Members will be unlinked.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No companies yet.</p>}
      </div>
    </>
  );
}
