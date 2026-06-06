import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { marketsIn, resolveArea } from "@/lib/region";
import Avatar from "@/components/avatar";
import AreaFilter from "@/components/area-filter";
import EmptyState from "@/components/empty-state";
import Pager from "@/components/pager";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { area, page: pageParam } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("users");
  const page = Math.max(1, Number(pageParam) || 1);

  const { results: rows } = await getDb()
    .prepare(
      `SELECT u.id, u.name, u.role, u.location, u.dma_name, u.bio, u.avatar_key, u.pronouns,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status = 'approved'${active ? " AND u.dma_slug = ?" : ""}
       ORDER BY u.name COLLATE NOCASE LIMIT ? OFFSET ?`
    )
    .bind(...(active ? [active] : []), PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<Partial<User> & { company_name: string | null }>();
  const hasNext = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);
  const pagerParams: Record<string, string> = {};
  if (area) pagerParams.area = area;

  return (
    <>
      <Eyebrow icon="members">Member directory</Eyebrow>
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
          <EmptyState title={active ? "No members in this market yet" : "No members yet"}>
            {active ? "Try switching to All areas." : null}
          </EmptyState>
        )}
      </div>
      <Pager page={page} hasNext={hasNext} basePath="/directory" params={pagerParams} />
    </>
  );
}
