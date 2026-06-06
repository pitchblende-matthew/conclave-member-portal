import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown — formatting", () => {
  it("renders bold, italic and links", () => {
    const h = renderMarkdown("see [SBA](https://sba.gov) **bold** _it_");
    expect(h).toContain('<a href="https://sba.gov" target="_blank" rel="noreferrer noopener">SBA</a>');
    expect(h).toContain("<strong>bold</strong>");
    expect(h).toContain("<em>it</em>");
  });

  it("renders headings", () => {
    expect(renderMarkdown("## Title")).toContain("<h2>Title</h2>");
    expect(renderMarkdown("### Sub")).toContain("<h3>Sub</h3>");
  });

  it("renders unordered and ordered lists", () => {
    expect(renderMarkdown("- a\n- b")).toContain("<ul><li>a</li><li>b</li></ul>");
    expect(renderMarkdown("1. a\n2. b")).toContain("<ol><li>a</li><li>b</li></ol>");
  });

  it("renders blockquotes and code", () => {
    expect(renderMarkdown("> quoted")).toContain("<blockquote>quoted</blockquote>");
    expect(renderMarkdown("use `code` here")).toContain("<code>code</code>");
  });

  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("   ")).toBe("");
  });
});

describe("renderMarkdown — XSS safety", () => {
  it("escapes raw script tags", () => {
    const h = renderMarkdown("<script>alert(1)</script>");
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("drops javascript: links", () => {
    const h = renderMarkdown("[x](javascript:alert(1))");
    expect(h.toLowerCase()).not.toContain("javascript:");
    expect(h).not.toContain("<a ");
  });

  it("neutralizes an img/onerror payload (escaped to text)", () => {
    const h = renderMarkdown("<img src=x onerror=alert(1)>");
    expect(h).not.toContain("<img");
    expect(h).toContain("&lt;img"); // the whole tag is escaped, so it can't execute
  });

  it("only allows http(s)/mailto link schemes", () => {
    expect(renderMarkdown("[a](https://ok.com)")).toContain('href="https://ok.com"');
    expect(renderMarkdown("[a](mailto:x@y.com)")).toContain('href="mailto:x@y.com"');
    expect(renderMarkdown("[a](data:text/html,x)")).not.toContain("<a ");
  });
});
