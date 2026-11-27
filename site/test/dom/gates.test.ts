// @vitest-environment jsdom
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import * as g from "./gates";
import { DIST_DIR, builtPages, distExists } from "./pages";

const doc = (head: string, body: string) => `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
const goodHead = `<title>T</title><meta name="description" content="d"><link rel="canonical" href="https://spacepeak.co/a/">`;
const files = new Set(["index.html", "a/index.html", "_astro/x.css", "img/p.png"]);
const has = (rel: string) => files.has(rel);

describe("gate logic on fixtures", () => {
  it("basics: passes a clean page, names each missing part (known bad)", () => {
    expect(g.basicsProblems(doc(goodHead, "<h1>A</h1>"))).toEqual([]);
    expect(g.basicsProblems(doc(goodHead, `<h1>A</h1><svg role="img"><title>Map</title></svg>`))).toEqual([]);
    expect(g.basicsProblems(`<html><head><link rel="canonical" href="https://example.com/"></head><body></body></html>`)).toEqual([
      "no lang on <html>",
      "0 <title>, want one with text",
      "0 <h1>, want one",
      "no meta description",
      'canonical "https://example.com/" is not on https://spacepeak.co/',
    ]);
  });

  it("links: resolves root, relative, srcset and trailing-slash refs; flags a missing one", () => {
    const html = doc(`<link rel="stylesheet" href="/_astro/x.css?v=1">`, `<a href="../">h</a><a href="#top">t</a>` +
      `<a href="mailto:x@y.z">m</a><a href="https://other.org/">o</a><img srcset="/img/p.png 1x"><a href="/gone/">g</a>`);
    expect(g.brokenRefs(html, "/a/", has)).toEqual(["/gone/"]);
    expect(g.resolveRef("/a", has)).toBe("a/index.html");
  });

  it("words: counts visible words before the first action, skipping hidden text", () => {
    const words = (n: number) => Array(n).fill("w").join(" ");
    expect(g.wordsBeforeAction(doc("", `<main><p hidden>${words(99)}</p><h1>${words(50)}</h1><a href="/">go</a>${words(99)}</main>`))).toBe(50);
    expect(g.wordsBeforeAction(doc("", `<main><p>${words(51)}</p><button>go</button></main>`))).toBe(51);
    expect(g.wordsBeforeAction(doc("", "<p>no main</p>"))).toBeNull();
  });

  it("scripts: flags inline code, allows external scripts and JSON-LD", () => {
    const ok = `<script src="/a.js"></script><script type="application/ld+json">{"@type":"Thing"}</script>`;
    expect(g.inlineScripts(doc(ok, ""))).toEqual([]);
    expect(g.inlineScripts(doc(`<script type="module">run()</script>`, ""))).toEqual(["run()"]);
  });

  it("images: requires alt, width and height (empty alt is fine)", () => {
    expect(g.imageProblems(doc("", `<img src="/p.png" alt="" width="1" height="1">`))).toEqual([]);
    expect(g.imageProblems(doc("", `<img src="/q.png" width="1">`))).toEqual(["/q.png lacks alt, height"]);
  });

  it("weight: sums HTML plus each referenced CSS, JS and image once", () => {
    const html = doc(`<link rel="stylesheet" href="/_astro/x.css">`, `<img src="/img/p.png"><img src="/img/p.png"><a href="/a/">a</a>`);
    expect(g.pageWeight(html, "/", () => 1000, has)).toBe(Buffer.byteLength(html) + 2000);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
const inCI = Boolean(process.env.CI);
if (!ready && !inCI) console.warn(`[dom gates] skipped: no build at ${DIST_DIR}. Run "npm run build" first.`);

describe.skipIf(!ready && !inCI)("gates on every built page", () => {
  it("finds a build", () => expect(ready, `CI is set but ${DIST_DIR} is missing; build before npm test`).toBe(true));
  const pages = ready ? builtPages() : [];
  // Pages only ever get added, so the home page and the 404 page must always be there.
  it.runIf(ready)("finds the home and 404 pages", () =>
    expect(pages.map((p) => p.route)).toEqual(expect.arrayContaining(["/", "/404.html"])));
  const exists = (rel: string) => existsSync(path.join(DIST_DIR, rel)) && statSync(path.join(DIST_DIR, rel)).isFile();
  const size = (rel: string) => statSync(path.join(DIST_DIR, rel)).size;

  it.each(pages.map((p) => [p.route, p] as const))("%s passes every gate", (route, { html }) => {
    expect(g.basicsProblems(html), "basics").toEqual([]);
    expect(g.brokenRefs(html, route, exists), "internal href/src with no file in dist").toEqual([]);
    expect(g.wordsBeforeAction(html), `words in <main> before the first action (limit ${g.WORDS_LIMIT})`).not.toBeNull();
    expect(g.wordsBeforeAction(html)!).toBeLessThanOrEqual(g.WORDS_LIMIT);
    expect(g.inlineScripts(html), "inline <script> blocked by script-src 'self'").toEqual([]);
    expect(g.imageProblems(html), "img without alt, width or height").toEqual([]);
    expect(g.pageWeight(html, route, size, exists), "HTML + CSS + JS + images, bytes").toBeLessThanOrEqual(g.WEIGHT_LIMIT);
  });
});
