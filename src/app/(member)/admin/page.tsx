import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function count(sql: string): Promise<number> {
  const row = await getDb().prepare(sql).first<{ n: number }>();
  return row?.n ?? 0;
}

export default async function AdminHome() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const [requests, members, companies, events, categories, briefings, invites] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM users WHERE status = 'approved'"),
    count("SELECT COUNT(*) AS n FROM companies"),
    count("SELECT COUNT(*) AS n FROM events"),
    count("SELECT COUNT(*) AS n FROM categories"),
    count("SELECT COUNT(*) AS n FROM briefings"),
    count("SELECT COUNT(*) AS n FROM invites WHERE used_by IS NULL"),
  ]);

  const sections = [
    { href: "/admin/requests", title: "Requests", value: requests, hint: "Approve or decline access requests" },
    { href: "/admin/events", title: "Events", value: events, hint: "Create, edit, see attendees" },
    { href: "/admin/briefings", title: "Briefings", value: briefings, hint: "Publish articles and links" },
    { href: "/admin/members", title: "Members", value: members, hint: "Promote admins, remove members" },
    { href: "/admin/companies", title: "Companies", value: companies, hint: "Edit or remove companies" },
    { href: "/admin/categories", title: "Categories", value: categories, hint: "Board categories" },
    { href: "/admin/invites", title: "Invitations", value: invites, hint: "Unused invites · generate more" },
  ];

  return (
    <>
      <div className="tag">Admin</div>
      <h1 style={{ fontSize: "2.6rem" }}>Management</h1>
      <p className="meta">Run the portal — events, members, companies, and invitations.</p>

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card member-card">
            <div className="topline">
              <h3 style={{ fontSize: "1.5rem", marginBottom: 0 }}>{s.title}</h3>
              <span className="stat">{s.value}</span>
            </div>
            <p className="meta" style={{ marginTop: "0.5rem" }}>{s.hint}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
