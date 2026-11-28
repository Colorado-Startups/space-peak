// @vitest-environment jsdom
// Step 38, issue #130: /about/ shows each part, each link names a real form or file, the privacy tiles
// match _headers, every internal link resolves, and the nav links /about/ once the page exists.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { liveLinks, pageExists } from "../../src/lib/nav";
import { ACCESS, CREDITS, HOSTS, REPO, STEPS, type Link, type Part } from "../../src/sections/about/facts";
import { brokenRefs, internalRefs } from "./gates";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const ROOT = path.join(SITE_DIR, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const linksIn = (parts: Part[]) => parts.filter((p): p is Link => typeof p !== "string");
const stepLinks = STEPS.map((s) => [s.label, ...linksIn(s.detail)]);
const allLinks = [...stepLinks.flat(), ...CREDITS.flatMap((c) => linksIn([...c.from, ...c.terms])), ...Object.values(ACCESS)];

/** The repo path a GitHub link names: a blob or tree path, or an issue form. Null for any other URL. */
function repoTarget(href: string): string | null {
  if (!href.startsWith(`${REPO}/`)) return null;
  const url = new URL(href);
  const form = url.searchParams.get("template");
  if (url.pathname.endsWith("/issues/new") && form) return `.github/ISSUE_TEMPLATE/${form}`;
  return url.pathname.match(/^\/Colorado-Startups\/space-peak\/(?:blob|tree)\/main\/(.+)$/)?.[1] ?? null;
}

/** Every https host in the Content-Security-Policy that _headers sends. */
const cspHosts = (headers: string) =>
  [...new Set([...(headers.match(/Content-Security-Policy:(.+)/)?.[1] ?? "").matchAll(/https:\/\/([^\s;]+)/g)].map((m) => m[1]))].sort();

describe("about facts against the repo", () => {
  it("reads repo links and the CSP (known bad and good)", () => {
    expect(repoTarget("https://example.org/a")).toBeNull();
    expect(existsSync(path.join(ROOT, repoTarget(`${REPO}/issues/new?template=9-none.yml`)!))).toBe(false);
    expect(cspHosts("  Content-Security-Policy: script-src 'self'; connect-src https://a.example https://b.example\n")).toEqual(["a.example", "b.example"]);
  });

  it("links each step, licence and report to a form or file that exists, or to a page here", () => {
    const targets = allLinks.map((l) => repoTarget(l.href)).filter((t) => t !== null);
    expect(targets.length).toBeGreaterThanOrEqual(12);
    for (const t of targets) expect(existsSync(path.join(ROOT, t)), t).toBe(true);
    for (const { label } of STEPS) expect(repoTarget(label.href) !== null || label.href.startsWith("/"), label.text).toBe(true);
  });

  it("names exactly the CSP's outside hosts; only own scripts, no cookie, /mcp logged", () => {
    const headers = read("site/public/_headers");
    expect(HOSTS.map((h) => h.host).sort()).toEqual(cspHosts(headers));
    expect(headers).toMatch(/script-src 'self';/);
    for (const file of ["site/public/_headers", "site/worker/mcp.ts"]) expect(read(file), file).not.toMatch(/set-cookie|document\.cookie/i);
    expect(read("wrangler.jsonc")).toMatch(/"observability": \{ "enabled": true \}/);
  });

  it("credits every font the build ships, and the nav gains /about/ with its page", () => {
    const fonts = [...read("site/astro.config.mjs").matchAll(/\{ name: "([^"]+)"/g)].map((m) => `${m[1]} font`);
    expect(CREDITS.map((c) => c.part)).toEqual(expect.arrayContaining(fonts.length ? fonts : ["no fonts found"]));
    expect(pageExists("/about/")).toBe(true);
    expect(liveLinks().map((l) => l.href)).toContain("/about/");
    expect(liveLinks(["../pages/guide/index.astro"]).map((l) => l.href)).not.toContain("/about/");
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[about] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("the built /about/ page", () => {
  const pages = ready ? builtPages() : [];
  const html = pages.find((p) => p.route === "/about/")?.html ?? "";
  const doc = parse(html);
  const part = (name: string) => doc.querySelector(`main [data-about="${name}"]`);
  const hrefs = (el: Element | null | undefined) => [...(el?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"));

  it("has the heading, the support lockup and each listing step with its links", () => {
    expect(text(doc.querySelector("main h1"))).toBe("About");
    expect(text(part("support")?.querySelector("[data-support]"))).toBe("Supported by Colorado Startups and Colorado Compute");
    const items = [...doc.querySelectorAll("[data-flow] > li")];
    expect(items.map((li) => hrefs(li))).toEqual(stepLinks.map((links) => links.map((l) => l.href)));
  });

  it("has the privacy tiles, the accessibility facts and the licence rows", () => {
    // The whole hosts line, so a space Astro drops before an expression fails here (the preview read "tiles:OpenFreeMap").
    const tiles = `${HOSTS.length} outside hosts, both for map tiles: ${HOSTS.map((h) => h.name).join(" and ")}.`;
    for (const line of ["0 cookies", "0 tracking scripts", tiles]) expect(text(part("privacy"))).toContain(line);
    const shown = [...(part("privacy")?.querySelectorAll("[data-host]") ?? [])].map((el) => el.getAttribute("data-host"));
    expect(shown.sort()).toEqual(cspHosts(read("site/public/_headers")));
    expect(text(part("access"))).toContain("WCAG 2.2 at level AA");
    expect(hrefs(part("access"))).toEqual(Object.values(ACCESS).map((l) => l.href));
    const live = existsSync(path.join(SITE_DIR, "src/components/map/LiveMap.astro"));
    const rows = [...doc.querySelectorAll("[data-credit]")].map((r) => r.getAttribute("data-credit"));
    expect(rows).toEqual(CREDITS.filter((c) => !c.liveMap || live).map((c) => c.id));
  });

  it("resolves every internal link; every nav links /about/; no off-site script or cookie read", () => {
    const isFile = (rel: string) => existsSync(path.join(DIST_DIR, rel)) && statSync(path.join(DIST_DIR, rel)).isFile();
    expect(internalRefs(html, "/about/")).toEqual(expect.arrayContaining(["/guide/", "/art/NOTICE.md"]));
    expect(brokenRefs(html, "/about/", isFile)).toEqual([]);
    for (const p of pages) {
      const page = parse(p.html);
      expect(page.querySelector("header nav a[href='/about/']"), p.route).not.toBeNull();
      for (const s of page.querySelectorAll("script[src]")) expect(s.getAttribute("src"), p.route).toMatch(/^\/(?!\/)/);
    }
    for (const f of readdirSync(DIST_DIR, { recursive: true, encoding: "utf8" }).filter((f) => /\.m?js$/.test(f)))
      expect(readFileSync(path.join(DIST_DIR, f), "utf8"), f).not.toContain("document.cookie");
  });
});
