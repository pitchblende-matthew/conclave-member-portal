import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { addExpertise, editExpertise, removeExpertise } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; slug: string; member_count: number };

export default async function AdminExpertise() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT e.id, e.name, e.slug,
              (SELECT COUNT(*) FROM user_expertise ue JOIN users u ON u.id = ue.user_id
                WHERE ue.expertise_id = e.id AND u.status = 'approved') AS member_count
       FROM expertise e ORDER BY e.sort_order, e.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Expertise</div>
      <h1 style={{ fontSize: "2.6rem" }}>Areas of expertise</h1>
      <p className="meta">The specialisms members can tag on their profiles.</p>

      <div className="card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
        <form action={addExpertise} className="inline-form">
          <input name="name" placeholder="New area of expertise" required />
          <button className="btn inline-btn" type="submit">Add</button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((e) => (
          <div key={e.id} className="card admin-row">
            <form action={editExpertise} className="inline-form" style={{ flex: 1, minWidth: 220 }}>
              <input type="hidden" name="itemId" value={e.id} />
              <input name="name" defaultValue={e.name} aria-label="Expertise name" />
              <button className="btn btn-ghost inline-btn" type="submit">Rename</button>
            </form>
            <div className="btn-row">
              <span className="meta">{e.member_count} {e.member_count === 1 ? "member" : "members"}</span>
              <form action={removeExpertise}>
                <input type="hidden" name="itemId" value={e.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${e.name}"? It's removed from members' profiles.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No expertise areas yet.</p>}
      </div>
    </>
  );
}
