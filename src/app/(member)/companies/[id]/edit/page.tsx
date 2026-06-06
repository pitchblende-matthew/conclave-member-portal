import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import EditCompanyForm from "./edit-form";
import type { Company } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditCompany({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = Number(id);
  const user = await requireUser();

  const company = await getDb()
    .prepare("SELECT * FROM companies WHERE id = ?")
    .bind(companyId)
    .first<Company>();
  if (!company) notFound();

  // Members of the company, or admins, may edit.
  if (user.is_admin !== 1 && user.company_id !== companyId) redirect(`/companies/${companyId}`);

  return (
    <>
      <p className="meta"><Link href={`/companies/${companyId}`}>← {company.name}</Link></p>
      <div className="tag">Edit company</div>
      <h1 style={{ fontSize: "2.6rem" }}>{company.name}</h1>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <EditCompanyForm
          initial={{
            id: company.id,
            name: company.name,
            website: company.website,
            linkedin: company.linkedin,
            industry: company.industry,
            size: company.size,
            city: company.city,
            state: company.state,
            zip: company.zip,
            description: company.description,
            logoUrl: company.logo_key ? mediaUrl(company.logo_key) : null,
          }}
        />
      </div>
    </>
  );
}
