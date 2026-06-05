import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import JoinCompanyButton from "./join-button";
import type { Company, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompanyProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = Number(id);
  const user = await requireUser();

  const company = await getDb()
    .prepare("SELECT * FROM companies WHERE id = ?")
    .bind(companyId)
    .first<Company>();
  if (!company) notFound();

  const { results: members } = await getDb()
    .prepare(
      "SELECT id, name, role, avatar_key FROM users WHERE company_id = ? ORDER BY name COLLATE NOCASE"
    )
    .bind(companyId)
    .all<Partial<User>>();

  const canEdit = user.is_admin === 1 || user.company_id === companyId;
  const isMember = user.company_id === companyId;

  return (
    <>
      <p className="meta"><Link href="/companies">← Companies</Link></p>
      <div className="card" style={{ maxWidth: 720, marginTop: "0.5rem" }}>
        <div className="profile-head">
          <Avatar src={company.logo_key ? mediaUrl(company.logo_key) : null} name={company.name} size={96} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "2.2rem", marginBottom: "0.15rem" }}>{company.name}</h1>
            <p className="meta" style={{ margin: 0 }}>
              {[company.industry, company.size, company.location].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {canEdit && (
            <Link href={`/companies/${companyId}/edit`} className="btn btn-ghost inline-btn">Edit</Link>
          )}
        </div>

        {company.description ? <p style={{ marginTop: "1.25rem" }}>{company.description}</p> : null}

        {company.website ? (
          <div className="links-row">
            <a className="btn btn-ghost inline-btn" href={company.website} target="_blank" rel="noreferrer">Website</a>
          </div>
        ) : null}

        <div style={{ marginTop: "1.5rem" }}>
          <JoinCompanyButton companyId={companyId} isMember={isMember} />
        </div>
      </div>

      <h2 style={{ fontSize: "1.6rem", marginTop: "2rem" }}>
        People {members.length > 0 ? `· ${members.length}` : ""}
      </h2>
      <div className="grid" style={{ marginTop: "0.75rem" }}>
        {members.map((m) => (
          <Link key={m.id} href={`/directory/${m.id}`} className="card member-card">
            <div className="member-card-head">
              <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={48} />
              <div>
                <h3 style={{ fontSize: "1.25rem", marginBottom: 0 }}>{m.name || "Member"}</h3>
                <p className="meta" style={{ margin: 0 }}>{m.role || "—"}</p>
              </div>
            </div>
          </Link>
        ))}
        {members.length === 0 && <p className="meta">No members linked yet.</p>}
      </div>
    </>
  );
}
