import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { requireUser } from "@/lib/auth";
import { savedItems } from "@/lib/engagement";
import BookmarkButton from "@/components/bookmark-button";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { briefing: "Briefing", topic: "Discussion", event: "Event" };

export default async function Saved() {
  const user = await requireUser();
  const items = await savedItems(user.id);

  return (
    <>
      <Eyebrow icon="pin">Saved</Eyebrow>
      <h1 style={{ fontSize: "2.6rem" }}>Your <span className="em">saved</span> list</h1>
      <p className="meta">Briefings, discussions, and events you&apos;ve bookmarked.</p>

      <div style={{ marginTop: "1.5rem" }}>
        {items.map((it) => (
          <div key={`${it.type}-${it.id}`} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div className="tag">{LABEL[it.type] ?? "Saved"}</div>
              <h3 style={{ fontSize: "1.3rem", margin: "0.1rem 0 0.15rem" }}>
                {it.external ? (
                  <a href={it.href} target="_blank" rel="noreferrer">{it.title} ↗</a>
                ) : (
                  <Link href={it.href}>{it.title}</Link>
                )}
              </h3>
              <p className="meta" style={{ margin: 0 }}>{it.meta}</p>
            </div>
            <BookmarkButton contentType={it.type as "briefing" | "topic" | "event"} contentId={it.id} saved path="/saved" />
          </div>
        ))}
        {items.length === 0 && (
          <EmptyState title="Nothing saved yet">
            Use the <strong>Save</strong> button on a briefing, discussion, or event to keep it here.
          </EmptyState>
        )}
      </div>
    </>
  );
}
