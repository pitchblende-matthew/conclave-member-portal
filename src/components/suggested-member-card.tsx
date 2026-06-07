import Link from "next/link";
import Avatar from "@/components/avatar";
import ConnectControls from "@/components/connect-controls";
import { mediaUrl } from "@/lib/media";
import type { Suggestion } from "@/lib/suggestions";

// One "member you should meet" — avatar, name, role/company, why they match,
// and a Connect button. The candidate is never already connected/pending.
export default function SuggestedMemberCard({ m }: { m: Suggestion }) {
  return (
    <div className="card suggest-card">
      <Link href={`/directory/${m.id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit" }}>
        <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={48} />
        <div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>{m.name || "Member"}</h3>
          <p className="meta" style={{ margin: 0 }}>{[m.role, m.company_name].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      </Link>
      {m.reasons.length ? (
        <div className="content-tags">
          {m.reasons.map((r, k) => <span key={k} className="market-tag">{r}</span>)}
        </div>
      ) : null}
      <div style={{ marginTop: "0.85rem" }}>
        <ConnectControls otherId={m.id} state="none" />
      </div>
    </div>
  );
}
