import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchOgImage } from "@/lib/opengraph";

function htmlResponse(html: string, ok = true, contentType = "text/html; charset=utf-8") {
  return {
    ok,
    url: "https://example.com/page",
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? contentType : null) },
    text: async () => html,
  } as unknown as Response;
}

const mockFetch = (html: string, ok = true, ct = "text/html") =>
  vi.stubGlobal("fetch", vi.fn(async () => htmlResponse(html, ok, ct)));

afterEach(() => vi.restoreAllMocks());

describe("fetchOgImage", () => {
  it("extracts an absolute og:image", async () => {
    mockFetch('<meta property="og:image" content="https://cdn.x/a.jpg?a=1&amp;b=2">');
    expect(await fetchOgImage("https://example.com/page")).toBe("https://cdn.x/a.jpg?a=1&b=2");
  });

  it("resolves a relative og:image against the page URL (content-first order)", async () => {
    mockFetch('<meta content="/img/a.png" property="og:image">');
    expect(await fetchOgImage("https://example.com/page")).toBe("https://example.com/img/a.png");
  });

  it("falls back to twitter:image", async () => {
    mockFetch('<meta name="twitter:image" content="https://cdn.x/t.jpg">');
    expect(await fetchOgImage("https://example.com/page")).toBe("https://cdn.x/t.jpg");
  });

  it("returns null when there is no og/twitter image", async () => {
    mockFetch("<title>no image here</title>");
    expect(await fetchOgImage("https://example.com/page")).toBeNull();
  });

  it("returns null on a non-200 response", async () => {
    mockFetch("whatever", false);
    expect(await fetchOgImage("https://example.com/page")).toBeNull();
  });

  it("returns null for non-html content", async () => {
    mockFetch('<meta property="og:image" content="https://cdn.x/a.jpg">', true, "application/json");
    expect(await fetchOgImage("https://example.com/page")).toBeNull();
  });

  it("returns null for a non-http(s) URL without fetching", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await fetchOgImage("ftp://example.com")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
