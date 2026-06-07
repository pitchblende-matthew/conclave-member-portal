import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { createFunction, renameFunction, deleteFunction } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; slug: string; member_count: number };

export default async function AdminFunctions() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT f.id, f.name, f.slug,
              (SELECT COUNT(*) FROM users u WHERE u.function_id = f.id AND u.status = 'approved') AS member_count
       FROM functions f ORDER BY f.sort_order, f.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Functions</div>
      <h1 style={{ fontSize: "2.6rem" }}>Functions</h1>
      <p className="meta">How members are organized by discipline.</p>

      <div className="card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
        <form action={createFunction} className="inline-form">
          <input name="name" placeholder="New function name" required />
          <button className="btn inline-btn" type="submit">Add</button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((f) => (
          <div key={f.id} className="card admin-row">
            <form action={renameFunction} className="inline-form" style={{ flex: 1, minWidth: 220 }}>
              <input type="hidden" name="itemId" value={f.id} />
              <input name="name" defaultValue={f.name} aria-label="Function name" />
              <button className="btn btn-ghost inline-btn" type="submit">Rename</button>
            </form>
            <div className="btn-row">
              <span className="meta">{f.member_count} {f.member_count === 1 ? "member" : "members"}</span>
              <form action={deleteFunction}>
                <input type="hidden" name="itemId" value={f.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${f.name}"? Its members move to Other.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No functions yet.</p>}
      </div>
    </>
  );
}
