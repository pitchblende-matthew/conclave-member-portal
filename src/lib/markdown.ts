// A small, safe Markdown subset renderer. It HTML-escapes the input first and
// only emits a known set of tags, so the output is safe to render with
// dangerouslySetInnerHTML (no raw user HTML survives). Pure + client-safe so the
// editor preview and the server both use it.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline formatting on already-escaped text.
function inline(text: string): string {
  // `code` (do first so markers inside are literal)
  text = text.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
  // [label](url) — only http(s)/mailto links are allowed
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    if (!/^(https?:|mailto:)/i.test(url)) return label;
    return `<a href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`;
  });
  // **bold**
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // *italic* / _italic_ (avoid mid-word)
  text = text.replace(/(^|[\s(])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
  text = text.replace(/(^|[\s(])_([^_\s][^_]*?)_/g, "$1<em>$2</em>");
  return text;
}

export function renderMarkdown(src: string): string {
  if (!src || !src.trim()) return "";
  const lines = escapeHtml(src.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join("<br>"))}</p>`);
      para = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === "") { flush(); i++; continue; }

    const heading = t.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length; // 2 or 3
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++; continue;
    }

    if (/^&gt;\s?/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^&gt;\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(items.join("<br>"))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    para.push(t);
    i++;
  }
  flush();
  return out.join("\n");
}
