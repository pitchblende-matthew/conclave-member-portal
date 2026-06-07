import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import LocalTime from "@/components/local-time";
import { dismissReport, resolveReport, removeReportedContent } from "./actions";
import type { Report } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = Report & { reporter_name: string | null };

export default async function AdminReports() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");
  const db = getDb();

  const { results: reports } = await db
    .prepare(
      `SELECT r.*, u.name AS reporter_name
       FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
       WHERE r.status = 'open' ORDER BY r.created_at ASC`
    )
    .all<Row>();

  // Resolve each report's target context.
  const ctx = await Promise.all(
    reports.map(async (r) => {
      if (r.target_type === "post") {
        const p = await db.prepare("SELECT body, topic_id, user_id FROM posts WHERE id = ?").bind(r.target_id).first<{ body: string; topic_id: number; user_id: number }>();
        const author = p ? await db.prepare("SELECT name FROM users WHERE id = ?").bind(p.user_id).first<{ name: string }>() : null;
        return { heading: `Reply${author?.name ? ` by ${author.name}` : ""}`, body: p?.body ?? "(deleted)", link: p?.topic_id ? `/board/${p.topic_id}` : null, removable: !!p, memberId: null as number | null };
      }
      if (r.target_type === "topic") {
        const t = await db.prepare("SELECT title FROM topics WHERE id = ?").bind(r.target_id).first<{ title: string }>();
        return { heading: `Topic: ${t?.title ?? "(deleted)"}`, body: "", link: t ? `/board/${r.target_id}` : null, removable: !!t, memberId: null as number | null };
      }
      const u = await db.prepare("SELECT name FROM users WHERE id = ?").bind(r.target_id).first<{ name: string }>();
      return { heading: `Member: ${u?.name ?? "(deleted)"}`, body: "", link: u ? `/directory/${r.target_id}` : null, removable: false, memberId: r.target_id };
    })
  );

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Moderation</div>
      <h1 style={{ fontSize: "2.6rem" }}>Reports</h1>
      <p className="meta">{reports.length} open</p>

      <div style={{ marginTop: "1.5rem" }}>
        {reports.map((r, i) => {
          const c = ctx[i];
          return (
            <div key={r.id} className="card">
              <div className="tag">{r.target_type} · reported by {r.reporter_name || "a member"} · <LocalTime ms={r.created_at} /></div>
              <h3 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>{c.heading}</h3>
              {c.body ? <p className="meta" style={{ whiteSpace: "pre-wrap" }}>{c.body.slice(0, 280)}</p> : null}
              {r.reason ? <p style={{ margin: "0.4rem 0 0" }}><strong>Reason:</strong> {r.reason}</p> : null}
              <div className="btn-row" style={{ marginTop: "0.85rem" }}>
                {c.link ? <Link href={c.link} className="btn btn-ghost inline-btn">View</Link> : null}
                {c.memberId ? <Link href={`/admin/members/${c.memberId}/edit`} className="btn btn-ghost inline-btn">Manage member</Link> : null}
                {c.removable && (
                  <form action={removeReportedContent}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <button className="btn btn-ghost inline-btn" type="submit">Delete content</button>
                  </form>
                )}
                <form action={resolveReport}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <button className="btn btn-ghost inline-btn" type="submit">Resolve</button>
                </form>
                <form action={dismissReport}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <button className="btn btn-ghost inline-btn" type="submit">Dismiss</button>
                </form>
              </div>
            </div>
          );
        })}
        {reports.length === 0 && <p className="meta">No open reports. All clear.</p>}
      </div>
    </>
  );
}
