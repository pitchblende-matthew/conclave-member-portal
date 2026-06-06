import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import EditMemberForm from "./edit-member-form";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEditMember({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");
  const { id } = await params;
  const userId = Number(id);

  const db = getDb();
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<User>();
  if (!user) notFound();

  const { results: companies } = await db
    .prepare("SELECT id, name FROM companies ORDER BY name COLLATE NOCASE")
    .all<{ id: number; name: string }>();
  const companyName = companies.find((c) => c.id === user.company_id)?.name ?? user.company ?? "";

  return (
    <>
      <p className="meta"><Link href="/admin/members">← Members</Link></p>
      <div className="tag">Admin · Edit member</div>
      <h1 style={{ fontSize: "2.6rem" }}>{user.name || user.email}</h1>
      <p className="meta">
        <Link href={`/directory/${user.id}`}>View public profile</Link>
        {user.is_admin === 1 ? " · Admin" : ""} · {user.status}
      </p>
      <div className="card" style={{ maxWidth: 680, marginTop: "1.5rem" }}>
        <EditMemberForm
          companies={companies}
          initial={{
            id: user.id,
            email: user.email,
            name: user.name,
            pronouns: user.pronouns,
            role: user.role,
            companyName,
            city: user.city,
            state: user.state,
            zip: user.zip,
            phone: user.phone,
            website: user.website,
            linkedin: user.linkedin,
            twitter: user.twitter,
            bio: user.bio,
          }}
        />
      </div>
    </>
  );
}
