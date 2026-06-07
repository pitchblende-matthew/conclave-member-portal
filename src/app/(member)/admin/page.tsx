import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Icon, { type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

async function count(sql: string): Promise<number> {
  const row = await getDb().prepare(sql).first<{ n: number }>();
  return row?.n ?? 0;
}

export default async function AdminHome() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const [requests, members, companies, events, pendingEvents, categories, briefingCategories, briefings, pendingBriefings, invites, openReports, inviteRequests, industries] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM users WHERE status = 'approved'"),
    count("SELECT COUNT(*) AS n FROM companies"),
    count("SELECT COUNT(*) AS n FROM events WHERE status = 'approved'"),
    count("SELECT COUNT(*) AS n FROM events WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM categories"),
    count("SELECT COUNT(*) AS n FROM briefing_categories"),
    count("SELECT COUNT(*) AS n FROM briefings WHERE status = 'approved'"),
    count("SELECT COUNT(*) AS n FROM briefings WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM invites WHERE used_by IS NULL"),
    count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
    count("SELECT COUNT(*) AS n FROM invite_requests WHERE status = 'new'"),
    count("SELECT COUNT(*) AS n FROM industries"),
  ]);

  const sections: { href: string; title: string; value: number; hint: string; icon: IconName }[] = [
    { href: "/admin/requests", title: "Requests", value: requests + inviteRequests, hint: inviteRequests > 0 ? `Applications + ${inviteRequests} invitation request${inviteRequests === 1 ? "" : "s"}` : "Applications & invitation requests", icon: "requests" },
    { href: "/admin/reports", title: "Reports", value: openReports, hint: openReports > 0 ? `${openReports} open to review` : "Member content reports", icon: "requests" },
    { href: "/admin/events", title: "Events", value: events, hint: pendingEvents > 0 ? `${pendingEvents} submission${pendingEvents === 1 ? "" : "s"} to review` : "Create, edit, see attendees", icon: "events" },
    { href: "/admin/briefings", title: "Briefings", value: briefings, hint: pendingBriefings > 0 ? `${pendingBriefings} submission${pendingBriefings === 1 ? "" : "s"} to review` : "Publish articles and links", icon: "briefings" },
    { href: "/admin/members", title: "Members", value: members, hint: "Promote admins, remove members", icon: "members" },
    { href: "/admin/companies", title: "Companies", value: companies, hint: "Edit or remove companies", icon: "companies" },
    { href: "/admin/industries", title: "Industries", value: industries, hint: "Organize companies by sector", icon: "categories" },
    { href: "/admin/categories", title: "Categories", value: categories, hint: "Board categories", icon: "categories" },
    { href: "/admin/briefing-categories", title: "Briefing topics", value: briefingCategories, hint: "Briefing categories", icon: "briefings" },
    { href: "/admin/invites", title: "Invitations", value: invites, hint: "Unused invites · generate more", icon: "invites" },
  ];

  return (
    <>
      <div className="tag">Admin</div>
      <h1 style={{ fontSize: "2.6rem" }}>Management</h1>
      <p className="meta">Run the portal — events, members, companies, and invitations.</p>

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card member-card admin-card">
            <div className="topline">
              <span className="card-ico"><Icon name={s.icon} size={20} /></span>
              <span className="stat">{s.value}</span>
            </div>
            <h3 style={{ fontSize: "1.5rem", margin: "0.6rem 0 0" }}>{s.title}</h3>
            <p className="meta" style={{ marginTop: "0.25rem" }}>{s.hint}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
