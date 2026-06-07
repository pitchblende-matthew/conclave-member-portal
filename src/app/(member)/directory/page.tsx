import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { marketsIn, resolveArea } from "@/lib/region";
import { functionsWithCounts, senioritiesWithCounts } from "@/lib/member-taxonomy";
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
  searchParams: Promise<{ area?: string; function?: string; seniority?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { area, function: fnParam, seniority: senParam, page: pageParam } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("users");
  const [functions, seniorities] = await Promise.all([functionsWithCounts(), senioritiesWithCounts()]);
  const activeFn = fnParam ? functions.find((f) => f.slug === fnParam) ?? null : null;
  const activeSen = senParam ? seniorities.find((s) => s.slug === senParam) ?? null : null;
  const page = Math.max(1, Number(pageParam) || 1);

  // Compose the market + function + seniority filters.
  const conds: string[] = ["u.status = 'approved'"];
  const binds: (string | number)[] = [];
  if (active) { conds.push("u.dma_slug = ?"); binds.push(active); }
  if (activeFn) { conds.push("u.function_id = ?"); binds.push(activeFn.id); }
  if (activeSen) { conds.push("u.seniority_id = ?"); binds.push(activeSen.id); }

  const { results: rows } = await getDb()
    .prepare(
      `SELECT u.id, u.name, u.role, u.location, u.dma_name, u.bio, u.avatar_key, u.pronouns,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name,
              fn.name AS function_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       LEFT JOIN functions fn ON fn.id = u.function_id
       WHERE ${conds.join(" AND ")}
       ORDER BY u.name COLLATE NOCASE LIMIT ? OFFSET ?`
    )
    .bind(...binds, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<Partial<User> & { company_name: string | null; function_name: string | null }>();
  const hasNext = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);
  const pagerParams: Record<string, string> = {};
  if (area) pagerParams.area = area;
  if (activeFn) pagerParams.function = activeFn.slug;
  if (activeSen) pagerParams.seniority = activeSen.slug;

  // Filter chip links preserve the other active filters.
  const buildHref = (over: { function?: string | null; seniority?: string | null }) => {
    const sp = new URLSearchParams();
    if (area) sp.set("area", area);
    const fn = over.function === undefined ? activeFn?.slug : over.function;
    const sen = over.seniority === undefined ? activeSen?.slug : over.seniority;
    if (fn) sp.set("function", fn);
    if (sen) sp.set("seniority", sen);
    const s = sp.toString();
    return s ? `/directory?${s}` : "/directory";
  };
  const fnChips = functions.filter((f) => f.n > 0);
  const senChips = seniorities.filter((s) => s.n > 0);

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
        hidden={{
          ...(activeFn ? { function: activeFn.slug } : {}),
          ...(activeSen ? { seniority: activeSen.slug } : {}),
        }}
      />

      {fnChips.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by function">
          <Link href={buildHref({ function: null })} className={`chip${!activeFn ? " chip-active" : ""}`}>All functions</Link>
          {fnChips.map((f) => (
            <Link key={f.id} href={buildHref({ function: f.slug })} className={`chip${activeFn?.slug === f.slug ? " chip-active" : ""}`}>{f.name}</Link>
          ))}
        </nav>
      )}
      {senChips.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by seniority">
          <Link href={buildHref({ seniority: null })} className={`chip${!activeSen ? " chip-active" : ""}`}>All seniority</Link>
          {senChips.map((s) => (
            <Link key={s.id} href={buildHref({ seniority: s.slug })} className={`chip${activeSen?.slug === s.slug ? " chip-active" : ""}`}>{s.name}</Link>
          ))}
        </nav>
      )}

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
                  {m.function_name ? <span className="market-tag" style={{ marginLeft: "0.5rem" }}>{m.function_name}</span> : null}
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
          <EmptyState title={activeFn || activeSen ? `No ${activeFn?.name ?? ""}${activeFn && activeSen ? " · " : ""}${activeSen?.name ?? ""} members here yet` : active ? "No members in this market yet" : "No members yet"}>
            {active || activeFn || activeSen ? "Try clearing a filter." : null}
          </EmptyState>
        )}
      </div>
      <Pager page={page} hasNext={hasNext} basePath="/directory" params={pagerParams} />
    </>
  );
}
