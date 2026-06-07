import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { createSeniority, renameSeniority, deleteSeniority } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; slug: string; member_count: number };

export default async function AdminSeniorities() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT s.id, s.name, s.slug,
              (SELECT COUNT(*) FROM users u WHERE u.seniority_id = s.id AND u.status = 'approved') AS member_count
       FROM seniorities s ORDER BY s.sort_order, s.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Seniority</div>
      <h1 style={{ fontSize: "2.6rem" }}>Seniority</h1>
      <p className="meta">Levels members can identify with.</p>

      <div className="card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
        <form action={createSeniority} className="inline-form">
          <input name="name" placeholder="New level name" required />
          <button className="btn inline-btn" type="submit">Add</button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((s) => (
          <div key={s.id} className="card admin-row">
            <form action={renameSeniority} className="inline-form" style={{ flex: 1, minWidth: 220 }}>
              <input type="hidden" name="itemId" value={s.id} />
              <input name="name" defaultValue={s.name} aria-label="Seniority name" />
              <button className="btn btn-ghost inline-btn" type="submit">Rename</button>
            </form>
            <div className="btn-row">
              <span className="meta">{s.member_count} {s.member_count === 1 ? "member" : "members"}</span>
              <form action={deleteSeniority}>
                <input type="hidden" name="itemId" value={s.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${s.name}"? Its members move to Other.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No levels yet.</p>}
      </div>
    </>
  );
}
