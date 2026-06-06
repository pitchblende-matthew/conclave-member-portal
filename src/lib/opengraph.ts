// Best-effort OpenGraph image scrape for link briefings. Fetches the page and
// reads og:image (falling back to twitter:image). Returns an absolute image URL
// or null — it never throws, so callers can treat it as optional.

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#47;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(pageUrl)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(pageUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ConclaveBot/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("html")) return null;

    const html = (await res.text()).slice(0, 250_000);
    const patterns = [
      /<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) {
        try {
          return new URL(decodeEntities(m[1]), res.url || pageUrl).toString();
        } catch {
          // bad URL, try the next pattern
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
