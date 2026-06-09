import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub ? <div className="metric-sub">{sub}</div> : null}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { name: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="card">
      <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.75rem" }}>{title}</h3>
      {rows.map((r) => (
        <div key={r.name} className="bd-row">
          <span className="bd-label" title={r.name}>{r.name}</span>
          <span className="bd-track"><span className="bd-fill" style={{ width: `${(r.n / max) * 100}%` }} /></span>
          <span className="bd-n">{r.n}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="meta" style={{ margin: 0 }}>No data yet.</p>}
    </div>
  );
}

export default async function AdminAnalytics() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const a = await getAnalytics();
  const weekMax = Math.max(1, ...a.weekly.map((w) => w.n));

  const tiles: { label: string; value: string | number; sub?: string }[] = [
    { label: "Members", value: a.members.approved, sub: `+${a.members.new30} in 30d` },
    { label: "Active · 30d", value: a.active30, sub: `${pct(a.active30, a.members.approved)}% of members` },
    { label: "Pending", value: a.members.pending, sub: a.members.declined ? `${a.members.declined} declined` : undefined },
    { label: "Onboarded", value: `${pct(a.members.onboarded, a.members.approved)}%` },
    { label: "Companies", value: a.totals.companies },
    { label: "Connections", value: a.totals.connections },
    { label: "Board posts", value: a.totals.posts, sub: `${a.totals.topics} topics` },
    { label: "Event RSVPs", value: a.totals.rsvps, sub: `${a.totals.events} events` },
    { label: "Briefings", value: a.totals.briefings },
    { label: "Messages", value: a.totals.messages },
    { label: "Open listings", value: a.totals.jobs + a.totals.businesses, sub: `${a.totals.jobs} jobs · ${a.totals.businesses} biz` },
    { label: "Open feedback", value: a.totals.feedbackOpen },
  ];

  const recent: [string, number][] = [
    ["New members", a.members.new30],
    ["Topics", a.new30.topics],
    ["Replies", a.new30.posts],
    ["Events", a.new30.events],
    ["RSVPs", a.new30.rsvps],
    ["Briefings", a.new30.briefings],
    ["Listings", a.new30.listings],
    ["Messages", a.new30.messages],
    ["Connections", a.new30.connections],
  ];

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Analytics</div>
      <h1 style={{ fontSize: "2.6rem" }}>Analytics</h1>
      <p className="meta">Members, growth, and engagement at a glance.</p>

      <div className="metric-grid" style={{ marginTop: "1.5rem" }}>
        {tiles.map((t) => <Metric key={t.label} {...t} />)}
      </div>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.9rem" }}>New members · last 8 weeks</h3>
        <div className="spark">
          {a.weekly.map((w) => (
            <div key={w.weeksAgo} className="spark-col">
              <span className="spark-n">{w.n}</span>
              <span className="spark-bar" style={{ height: `${(w.n / weekMax) * 100}%` }} />
            </div>
          ))}
        </div>
        <p className="meta" style={{ margin: "0.5rem 0 0", display: "flex", justifyContent: "space-between" }}>
          <span>8 weeks ago</span><span>this week</span>
        </p>
      </div>

      <div className="analytics-cols" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.75rem" }}>Last 30 days</h3>
          <dl className="detail-list" style={{ margin: 0 }}>
            {recent.map(([label, value]) => (
              <span key={label} style={{ display: "contents" }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </span>
            ))}
          </dl>
        </div>
        <Breakdown title="Top markets" rows={a.markets} />
      </div>

      <div className="analytics-cols" style={{ marginTop: "1.25rem" }}>
        <Breakdown title="By function" rows={a.functions} />
        <Breakdown title="By seniority" rows={a.seniorities} />
      </div>
    </>
  );
}
