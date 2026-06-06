import Link from "next/link";

// Region filter shared by Companies, Directory, and Events.
// Renders "Near me" / "All areas" chips plus a no-JS GET-form market picker.
export default function AreaFilter({
  basePath,
  active,
  myDma,
  markets,
  hidden = {},
  label = "businesses",
}: {
  basePath: string;
  active: string | null; // selected slug, or null for "all"
  myDma: { slug: string; name: string } | null;
  markets: { slug: string; name: string; n: number }[];
  hidden?: Record<string, string>;
  label?: string;
}) {
  const href = (area: string) => {
    const sp = new URLSearchParams({ ...hidden, area });
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div className="area-filter">
      <nav className="chip-row">
        {myDma ? (
          <Link href={href(myDma.slug)} className={`chip${active === myDma.slug ? " chip-active" : ""}`}>
            Near me · {myDma.name}
          </Link>
        ) : null}
        <Link href={href("all")} className={`chip${active === null ? " chip-active" : ""}`}>
          All areas
        </Link>
      </nav>
      {markets.length > 0 && (
        <form className="area-jump" method="get" action={basePath}>
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label htmlFor="area-pick" className="meta">Jump to a market</label>
          <select id="area-pick" name="area" defaultValue={active ?? "all"} aria-label={`Filter ${label} by market`}>
            <option value="all">All areas</option>
            {markets.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name} ({m.n})</option>
            ))}
          </select>
          <button className="btn btn-ghost inline-btn" type="submit">Go</button>
        </form>
      )}
    </div>
  );
}
