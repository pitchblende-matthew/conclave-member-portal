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

  // Wrapped so any DB hiccup renders a friendly message instead of a 500.
  let reports: Row[] = [];
  let loadError = false;
  try {
    const res = await db
      .prepare(
        `SELECT r.*, u.name AS reporter_name
         FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
         WHERE r.status = 'open' ORDER BY r.created_at ASC`
      )
      .all<Row>();
    reports = res.results;
  } catch {
    loadError = true;
  }

  // Resolve each report's target context. Done sequentially (not Promise.all) to
  // avoid firing many concurrent D1 queries, and guarded per row so one bad or
  // deleted target degrades to a placeholder instead of failing the whole page.
  type Ctx = { heading: string; body: string; link: string | null; removable: boolean; memberId: number | null };
  const ctx: Ctx[] = [];
  for (const r of reports) {
    try {
      if (r.target_type === "post") {
        const p = await db.prepare("SELECT body, topic_id, user_id FROM posts WHERE id = ?").bind(r.target_id).first<{ body: string; topic_id: number; user_id: number }>();
        const author = p ? await db.prepare("SELECT name FROM users WHERE id = ?").bind(p.user_id).first<{ name: string }>() : null;
        ctx.push({ heading: `Reply${author?.name ? ` by ${author.name}` : ""}`, body: p?.body ?? "(deleted)", link: p?.topic_id ? `/board/${p.topic_id}` : null, removable: !!p, memberId: null });
      } else if (r.target_type === "topic") {
        const t = await db.prepare("SELECT title FROM topics WHERE id = ?").bind(r.target_id).first<{ title: string }>();
        ctx.push({ heading: `Topic: ${t?.title ?? "(deleted)"}`, body: "", link: t ? `/board/${r.target_id}` : null, removable: !!t, memberId: null });
      } else {
        const u = await db.prepare("SELECT name FROM users WHERE id = ?").bind(r.target_id).first<{ name: string }>();
        ctx.push({ heading: `Member: ${u?.name ?? "(deleted)"}`, body: "", link: u ? `/directory/${r.target_id}` : null, removable: false, memberId: r.target_id });
      }
    } catch {
      ctx.push({ heading: `${r.target_type} #${r.target_id}`, body: "(could not load this item)", link: null, removable: false, memberId: null });
    }
  }

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Moderation</div>
      <h1 style={{ fontSize: "2.6rem" }}>Reports</h1>
      <p className="meta">{loadError ? "Queue unavailable" : `${reports.length} open`}</p>

      {loadError && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <p className="meta" style={{ margin: 0 }}>The moderation queue couldn&apos;t be loaded right now. Refresh to try again — if it keeps happening, check the server logs.</p>
        </div>
      )}

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
