import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { marketsIn, resolveArea } from "@/lib/region";
import Avatar from "@/components/avatar";
import AreaFilter from "@/components/area-filter";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ area?: string }>;
}) {
  const user = await requireUser();
  const { area } = await searchParams;
  const active = resolveArea(area, user.dma_slug);
  const markets = await marketsIn("companies");

  const { results } = await getDb()
    .prepare(
      `SELECT c.id, c.name, c.logo_key, c.industry, c.location, c.dma_name,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS member_count
       FROM companies c
       ${active ? "WHERE c.dma_slug = ?" : ""}
       ORDER BY c.name COLLATE NOCASE`
    )
    .bind(...(active ? [active] : []))
    .all<CompanyRow>();

  return (
    <>
      <div className="topline">
        <div>
          <div className="tag">Companies</div>
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
      />

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
          <p className="meta">
            {active ? "No companies in this market yet — switch to All areas, or add one." : "No companies yet. Add the first one."}
          </p>
        )}
      </div>
    </>
  );
}
