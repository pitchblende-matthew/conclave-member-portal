// Shared HTML/text helpers for turning feed content (RSS/Atom descriptions,
// scraped snippets) into clean plain text for storage and display.

export function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ");
}

// Turn (possibly entity-encoded) HTML into clean plain text. Two passes: strip
// literal tags, decode entities — which may *reveal* entity-encoded tags like
// `&lt;figure&gt;` that some feeds ship — then strip those too. Decoding last
// would leave raw `<figure>` markup in the text.
export function stripHtml(s: string): string {
  let t = stripCdata(s).replace(/<[^>]+>/g, " ");
  t = decodeEntities(t);
  t = t.replace(/<[^>]+>/g, " ");
  return t.replace(/\s+/g, " ").trim();
}
