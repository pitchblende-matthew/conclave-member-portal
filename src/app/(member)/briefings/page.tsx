import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { formatDateTime } from "@/lib/format";
import EmptyState from "@/components/empty-state";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Briefings() {
  await requireUser();
  const { results } = await getDb()
    .prepare("SELECT * FROM briefings WHERE published = 1 ORDER BY published_at DESC, id DESC")
    .all<Briefing>();

  return (
    <>
      <div className="topline">
        <div>
          <div className="tag">Briefings</div>
          <h1 style={{ fontSize: "2.6rem" }}>What we&apos;re <span className="em">reading</span></h1>
        </div>
        <Link href="/briefings/submit" className="btn inline-btn">Submit a briefing</Link>
      </div>
      <p className="meta">Notes, essays, and links worth your time — curated for the network.</p>

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {results.map((b) => {
          const isLink = b.kind === "link";
          const cover = b.cover_key ? mediaUrl(b.cover_key) : null;
          const inner = (
            <>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="briefing-cover" />
              ) : null}
              <div className="briefing-body">
                <span className="market-tag">{isLink ? "Link ↗" : "Article"}</span>
                <h3 style={{ fontSize: "1.4rem", margin: "0.5rem 0 0.25rem" }}>{b.title}</h3>
                {b.summary ? <p className="meta" style={{ margin: 0 }}>{b.summary}</p> : null}
                <p className="meta" style={{ marginTop: "0.6rem", fontSize: "0.78rem" }}>
                  {b.published_at ? formatDateTime(b.published_at) : ""}
                </p>
              </div>
            </>
          );
          return isLink ? (
            <a key={b.id} href={b.url} target="_blank" rel="noreferrer" className="card briefing-card">
              {inner}
            </a>
          ) : (
            <Link key={b.id} href={`/briefings/${b.id}`} className="card briefing-card">
              {inner}
            </Link>
          );
        })}
        {results.length === 0 && (
          <EmptyState title="No briefings yet">
            <Link href="/briefings/submit">Submit one for review →</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
