import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { formatDateTime } from "@/lib/format";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BriefingReader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const b = await getDb().prepare("SELECT * FROM briefings WHERE id = ?").bind(Number(id)).first<Briefing>();
  if (!b) notFound();
  // Drafts are visible to admins only (so they can preview before publishing).
  if (b.published !== 1 && user.is_admin !== 1) notFound();
  // Link briefings live elsewhere — send the reader straight there.
  if (b.kind === "link" && b.url) redirect(b.url);

  const author = b.author_id
    ? await getDb().prepare("SELECT name FROM users WHERE id = ?").bind(b.author_id).first<{ name: string }>()
    : null;

  const paragraphs = b.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <article style={{ maxWidth: 720, margin: "0 auto" }}>
      <p className="meta"><Link href="/briefings">← Briefings</Link></p>
      <div className="tag">Briefing</div>
      <h1 style={{ fontSize: "2.6rem", marginBottom: "0.5rem" }}>{b.title}</h1>
      <p className="meta" style={{ marginTop: 0 }}>
        {author?.name ? `${author.name} · ` : ""}
        {b.published_at ? formatDateTime(b.published_at) : "Draft"}
      </p>

      {b.cover_key ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(b.cover_key)} alt="" className="briefing-hero" />
      ) : null}

      {b.summary ? <p className="briefing-lede">{b.summary}</p> : null}

      <div className="briefing-prose">
        {paragraphs.length > 0
          ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
          : <p className="meta">No content yet.</p>}
      </div>
    </article>
  );
}
