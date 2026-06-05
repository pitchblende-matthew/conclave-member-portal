import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { createCategory, renameCategory, deleteCategory } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; slug: string; topic_count: number };

export default async function AdminCategories() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT c.id, c.name, c.slug,
              (SELECT COUNT(*) FROM topics t WHERE t.category_id = c.id) AS topic_count
       FROM categories c ORDER BY c.sort_order, c.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Board categories</div>
      <h1 style={{ fontSize: "2.6rem" }}>Categories</h1>

      <div className="card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
        <form action={createCategory} className="inline-form">
          <input name="name" placeholder="New category name" required />
          <button className="btn inline-btn" type="submit">Add</button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((c) => (
          <div key={c.id} className="card admin-row">
            <form action={renameCategory} className="inline-form" style={{ flex: 1, minWidth: 220 }}>
              <input type="hidden" name="categoryId" value={c.id} />
              <input name="name" defaultValue={c.name} aria-label="Category name" />
              <button className="btn btn-ghost inline-btn" type="submit">Rename</button>
            </form>
            <div className="btn-row">
              <span className="meta">{c.topic_count} {c.topic_count === 1 ? "topic" : "topics"}</span>
              <form action={deleteCategory}>
                <input type="hidden" name="categoryId" value={c.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${c.name}"? Its topics move to General.`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No categories yet.</p>}
      </div>
    </>
  );
}
