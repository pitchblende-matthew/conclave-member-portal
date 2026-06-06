import Link from "next/link";

// Prev/Next pager. Determine `hasNext` by fetching one extra row than the page
// size. Preserves the page's other query params (filters).
export default function Pager({
  page,
  hasNext,
  basePath,
  params = {},
}: {
  page: number;
  hasNext: boolean;
  basePath: string;
  params?: Record<string, string>;
}) {
  if (page <= 1 && !hasNext) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="pager">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-ghost inline-btn">← Previous</Link>
      ) : (
        <span className="btn btn-ghost inline-btn pager-disabled" aria-disabled>← Previous</span>
      )}
      <span className="meta">Page {page}</span>
      {hasNext ? (
        <Link href={href(page + 1)} className="btn btn-ghost inline-btn">Next →</Link>
      ) : (
        <span className="btn btn-ghost inline-btn pager-disabled" aria-disabled>Next →</span>
      )}
    </div>
  );
}
