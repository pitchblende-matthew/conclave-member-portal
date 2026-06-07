import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { marketsIn, resolveArea } from "@/lib/region";
import { industriesWithCounts } from "@/lib/industries";
import Avatar from "@/components/avatar";
import AreaFilter from "@/components/area-filter";
import EmptyState from "@/components/empty-state";
import Pager from "@/components/pager";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

type CompanyRow = {
  id: number;
  name: string;
  logo_key: string;
  industry: string;
  location: string;
  dma_name: string;
  member_count: number;
};

export default async function Companies({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; industry?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { area, industry, page: pageParam } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("companies");
  const industries = await industriesWithCounts();
  const activeIndustry = industry ? industries.find((i) => i.slug === industry) ?? null : null;
  const page = Math.max(1, Number(pageParam) || 1);

  // Compose the market + industry filters.
  const conds: string[] = [];
  const binds: (string | number)[] = [];
  if (active) { conds.push("c.dma_slug = ?"); binds.push(active); }
  if (activeIndustry) { conds.push("c.industry_id = ?"); binds.push(activeIndustry.id); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const { results: rows } = await getDb()
    .prepare(
      `SELECT c.id, c.name, c.logo_key, c.industry, c.location, c.dma_name,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS member_count
       FROM companies c
       ${where}
       ORDER BY c.name COLLATE NOCASE LIMIT ? OFFSET ?`
    )
    .bind(...binds, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all<CompanyRow>();
  const hasNext = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);
  const pagerParams: Record<string, string> = {};
  if (area) pagerParams.area = area;
  if (activeIndustry) pagerParams.industry = activeIndustry.slug;

  // Industry chip links preserve the active market.
  const industryHref = (slug: string | null) => {
    const sp = new URLSearchParams();
    if (area) sp.set("area", area);
    if (slug) sp.set("industry", slug);
    const s = sp.toString();
    return s ? `/companies?${s}` : "/companies";
  };
  const industryChips = industries.filter((i) => i.n > 0);

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon="companies">Companies</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>The network&apos;s companies</h1>
        </div>
        <Link href="/companies/new" className="btn inline-btn">Add a company</Link>
      </div>

      <AreaFilter
        basePath="/companies"
        active={active}
        myDma={user.dma_slug ? { slug: user.dma_slug, name: user.dma_name } : null}
        markets={markets}
        label="companies"
        hidden={activeIndustry ? { industry: activeIndustry.slug } : {}}
      />

      {industryChips.length > 0 && (
        <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by industry">
          <Link href={industryHref(null)} className={`chip${!activeIndustry ? " chip-active" : ""}`}>All industries</Link>
          {industryChips.map((i) => (
            <Link key={i.id} href={industryHref(i.slug)} className={`chip${activeIndustry?.slug === i.slug ? " chip-active" : ""}`}>
              {i.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {results.map((c) => (
          <Link key={c.id} href={`/companies/${c.id}`} className="card member-card">
            <div className="member-card-head">
              <Avatar src={c.logo_key ? mediaUrl(c.logo_key) : null} name={c.name} size={56} />
              <div>
                <h3 style={{ fontSize: "1.4rem", marginBottom: 0 }}>{c.name}</h3>
                <p className="meta" style={{ margin: 0 }}>
                  {[c.industry, c.location].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <p className="meta" style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{c.member_count} {c.member_count === 1 ? "member" : "members"}</span>
              {c.dma_name ? <span className="market-tag">{c.dma_name}</span> : null}
            </p>
          </Link>
        ))}
        {results.length === 0 && (
          <EmptyState title={activeIndustry ? `No ${activeIndustry.name} companies here yet` : active ? "No companies in this market yet" : "No companies yet"}>
            <Link href="/companies/new">Add the first one →</Link>
          </EmptyState>
        )}
      </div>
      <Pager page={page} hasNext={hasNext} basePath="/companies" params={pagerParams} />
    </>
  );
}
