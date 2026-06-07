import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { listIndustries } from "@/lib/industries";
import { listFunctions } from "@/lib/member-taxonomy";
import { getContentTagIds } from "@/lib/content-tags";
import LocalTime from "@/components/local-time";
import BriefingForm from "../../briefing-form";
import BriefingCover from "../../briefing-cover";
import { setPublished } from "../../actions";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditBriefing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const briefingId = Number(id);
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const db = getDb();
  const b = await db.prepare("SELECT * FROM briefings WHERE id = ?").bind(briefingId).first<Briefing>();
  if (!b) notFound();
  const { results: categories } = await db
    .prepare("SELECT id, name FROM briefing_categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string }>();
  const [industries, functions, tagIds] = await Promise.all([
    listIndustries(),
    listFunctions(),
    getContentTagIds("briefing", briefingId),
  ]);

  return (
    <>
      <p className="meta"><Link href="/admin/briefings">← Briefings</Link></p>
      <div className="topline">
        <div>
          <div className="tag">
            Admin · Edit briefing · {b.published ? <>Published {b.published_at ? <LocalTime ms={b.published_at} /> : null}</> : "Draft"}
          </div>
          <h1 style={{ fontSize: "2.4rem" }}>{b.title}</h1>
        </div>
        <div className="btn-row">
          {b.published ? (
            <Link href={`/briefings/${b.kind === "link" ? "" : b.id}`} className="btn btn-ghost inline-btn">View</Link>
          ) : null}
          <form action={setPublished}>
            <input type="hidden" name="briefingId" value={b.id} />
            <input type="hidden" name="published" value={b.published ? "0" : "1"} />
            <button className="btn inline-btn" type="submit">{b.published ? "Unpublish" : "Publish"}</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: "1.5rem" }}>
        <BriefingCover id={b.id} coverUrl={b.cover_key ? mediaUrl(b.cover_key) : (b.cover_url || null)} />
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: "1.5rem" }}>
        <BriefingForm
          categories={categories}
          industries={industries}
          functions={functions}
          initial={{ id: b.id, kind: b.kind, title: b.title, summary: b.summary, body: b.body, url: b.url, categoryId: b.category_id, industryIds: tagIds.industry, functionIds: tagIds.function }}
        />
      </div>
    </>
  );
}
