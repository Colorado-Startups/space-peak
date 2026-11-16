import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET, ROBOTS } from "../../src/pages/robots.txt";

const site = (path: string) => new URL(`../../${path}`, import.meta.url);
const read = (path: string) => readFileSync(site(path), "utf8");

// Parse _headers the way Workers static assets does: a URL line, then indented "Name: value" lines.
function parseHeaders(text: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  let current: Record<string, string> | undefined;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = {};
      rules.set(line.trim(), current);
      continue;
    }
    const at = line.indexOf(":");
    if (!current || at < 0) throw new Error(`bad header line: ${line}`);
    current[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return rules;
}

const rules = parseHeaders(read("public/_headers"));

describe("_headers", () => {
  it("sends the CSP, HSTS, nosniff and referrer policy on every path", () => {
    expect(rules.get("/*")).toEqual({
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
        "font-src 'self'; connect-src 'self' https://tiles.openfreemap.org https://tiles.mapterhorn.com; " +
        "worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
  });

  it("keeps the workers.dev host out of search and opens /data/ to any origin", () => {
    expect(rules.get("https://spacepeak.coloradostartups.workers.dev/*")).toEqual({ "X-Robots-Tag": "noindex" });
    expect(rules.get("/data/*")).toEqual({ "Access-Control-Allow-Origin": "*" });
  });

  it("types GeoJSON, Markdown and the API catalog", () => {
    expect(rules.get("/*.geojson")).toEqual({ "Content-Type": "application/geo+json" });
    expect(rules.get("/*.md")).toEqual({ "Content-Type": "text/markdown; charset=utf-8" });
    expect(rules.get("/.well-known/api-catalog")).toEqual({ "Content-Type": "application/linkset+json" });
  });

  it("stays inside the Workers limits: 100 rules, 2,000 characters a line, one splat a rule", () => {
    expect(rules.size).toBeLessThanOrEqual(100);
    for (const line of read("public/_headers").split("\n")) expect(line.length).toBeLessThanOrEqual(2000);
    for (const url of rules.keys()) expect(url.split("*").length).toBeLessThanOrEqual(2);
  });
});

describe("_redirects, robots.txt and security.txt", () => {
  it("has no redirect rules yet", () => {
    expect(read("public/_redirects").split("\n").filter((l) => l.trim() && !l.startsWith("#"))).toEqual([]);
  });

  it("allows all crawlers with Content-Signal and points at the sitemap index", async () => {
    const res = await GET({} as Parameters<typeof GET>[0]);
    expect(await res.text()).toBe(ROBOTS);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(ROBOTS).toMatch(/^User-agent: \*\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: \/\n/);
    expect(ROBOTS).toContain("\nSitemap: https://spacepeak.co/sitemap-index.xml\n");
  });

  it("follows RFC 9116: advisories contact, one Expires, under a year ahead of 2026-11-16", () => {
    const txt = read("public/.well-known/security.txt");
    expect(txt).toContain("Contact: https://github.com/Colorado-Startups/space-peak/security/advisories/new\n");
    const expires = txt.match(/^Expires: (.+)$/gm) ?? [];
    expect(expires).toEqual(["Expires: 2027-11-16T00:00:00.000Z"]);
    expect(txt).toContain("Canonical: https://spacepeak.co/.well-known/security.txt\n");
  });
});

describe("built pages", () => {
  // CI runs astro build before vitest; script-src 'self' blocks any inline script.
  const dist = site("dist/");
  it("emit no inline scripts, so script-src needs no 'unsafe-inline'", () => {
    expect(existsSync(dist), "run astro build first").toBe(true);
    const html = readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
    expect(html.length).toBeGreaterThan(0);
    for (const file of html) {
      const tags = readFileSync(new URL(file, dist), "utf8").match(/<script\b[^>]*>/g) ?? [];
      for (const tag of tags) expect(tag, file).toMatch(/\ssrc=|type="application\/ld\+json"/);
    }
    expect(read("dist/robots.txt")).toBe(ROBOTS);
    expect(existsSync(site("dist/_headers"))).toBe(true);
  });
});
