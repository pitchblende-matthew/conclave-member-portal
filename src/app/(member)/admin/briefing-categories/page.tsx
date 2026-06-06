import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ConfirmSubmit from "@/components/confirm-submit";
import { createBriefingCategory, renameBriefingCategory, deleteBriefingCategory } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; slug: string; briefing_count: number };

export default async function AdminBriefingCategories() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT c.id, c.name, c.slug,
              (SELECT COUNT(*) FROM briefings b WHERE b.category_id = c.id) AS briefing_count
       FROM briefing_categories c ORDER BY c.sort_order, c.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Briefing categories</div>
      <h1 style={{ fontSize: "2.6rem" }}>Briefing categories</h1>

      <div className="card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
        <form action={createBriefingCategory} className="inline-form">
          <input name="name" placeholder="New category name" required />
          <button className="btn inline-btn" type="submit">Add</button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((c) => (
          <div key={c.id} className="card admin-row">
            <form action={renameBriefingCategory} className="inline-form" style={{ flex: 1, minWidth: 220 }}>
              <input type="hidden" name="categoryId" value={c.id} />
              <input name="name" defaultValue={c.name} aria-label="Category name" />
              <button className="btn btn-ghost inline-btn" type="submit">Rename</button>
            </form>
            <div className="btn-row">
              <span className="meta">{c.briefing_count} {c.briefing_count === 1 ? "briefing" : "briefings"}</span>
              <form action={deleteBriefingCategory}>
                <input type="hidden" name="categoryId" value={c.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Delete "${c.name}"? Its briefings become uncategorized.`}>
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
