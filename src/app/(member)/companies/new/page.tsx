import Link from "next/link";
import { requireUser } from "@/lib/auth";
import CreateCompanyForm from "./create-form";

export const dynamic = "force-dynamic";

export default async function NewCompany() {
  await requireUser();
  return (
    <>
      <p className="meta"><Link href="/companies">← Companies</Link></p>
      <div className="tag">New company</div>
      <h1 style={{ fontSize: "2.6rem" }}>Add a company</h1>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <CreateCompanyForm />
      </div>
    </>
  );
}
