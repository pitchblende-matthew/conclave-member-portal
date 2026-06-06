import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { marketsIn, resolveArea } from "@/lib/region";
import Avatar from "@/components/avatar";
import AreaFilter from "@/components/area-filter";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const user = await requireUser();
  const { area } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("users");

  const { results } = await getDb()
    .prepare(
      `SELECT u.id, u.name, u.role, u.location, u.dma_name, u.bio, u.avatar_key, u.pronouns,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status = 'approved'${active ? " AND u.dma_slug = ?" : ""}
       ORDER BY u.name COLLATE NOCASE`
    )
    .bind(...(active ? [active] : []))
    .all<Partial<User> & { company_name: string | null }>();

  return (
    <>
      <div className="tag">Member directory</div>
      <h1 style={{ fontSize: "2.6rem" }}>Who&apos;s <span className="em">inside</span></h1>

      <AreaFilter
        basePath="/directory"
        active={active}
        myDma={user.dma_slug ? { slug: user.dma_slug, name: user.dma_name } : null}
        markets={markets}
        label="members"
      />

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {results.map((m) => (
          <Link key={m.id} href={`/directory/${m.id}`} className="card member-card">
            <div className="member-card-head">
              <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={56} />
              <div>
                <h3 style={{ fontSize: "1.4rem", marginBottom: 0 }}>
                  {m.name || "Member"}
                  {m.pronouns ? <span className="pronouns"> · {m.pronouns}</span> : null}
                </h3>
                <p className="meta" style={{ margin: 0 }}>
                  {[m.role, m.company_name].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            {m.location || m.dma_name ? (
              <p className="meta" style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{m.location}</span>
                {m.dma_name ? <span className="market-tag">{m.dma_name}</span> : null}
              </p>
            ) : null}
            {m.bio ? <p className="member-card-bio">{m.bio}</p> : null}
          </Link>
        ))}
        {results.length === 0 && (
          <p className="meta">{active ? "No members in this market yet — try All areas." : "No members yet."}</p>
        )}
      </div>
    </>
  );
}
