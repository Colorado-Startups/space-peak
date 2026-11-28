// Issue #124: on the built /launch/ page every figure carries its register status, no number stands
// outside a figure, the profile says "speculative" in the yellow hatch, and the nav links the page.
import { existsSync, readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getClaim } from "../../src/lib/claims/parse";
import { launch } from "../../src/lib/launch/data";
import { liveLinks } from "../../src/lib/nav";
import { DIST_DIR } from "./pages";

const file = path.join(DIST_DIR, "launch", "index.html");
const ready = existsSync(file);
if (!ready && !process.env.CI) console.warn(`[launch page] skipped: no ${file}. Run "npm run build" first.`);

it("the nav offers /launch/ now that its page exists", () => expect(liveLinks().map((l) => l.href)).toContain("/launch/"));

describe.skipIf(!ready && !process.env.CI)("the built /launch/ page", () => {
  const doc = new JSDOM(ready ? readFileSync(file, "utf8") : "").window.document;
  const main = doc.querySelector("main") ?? doc.createElement("main"); // the body runs even when skipped
  const figures = [...main.querySelectorAll(".figure")];
  const svg = main.querySelector("svg[role='img']");

  it("is built", () => expect(ready, `${file} is missing; build before npm test`).toBe(true));

  it("gives every figure its register row's status, as a chip word", () => {
    const data = launch();
    const cited = [...data.profile.map((e) => e.claim), ...data.make_or_break];
    // Later sections, such as the cadence (test/dom/cadence.test.ts), add their own figures after these.
    expect(figures.map((f) => f.getAttribute("data-claim")).slice(0, cited.length)).toEqual(cited);
    for (const f of figures) {
      const row = getClaim(f.getAttribute("data-claim")!);
      expect(f.getAttribute("data-status")).toBe(row.status);
      expect(f.querySelector(".figure-chip")?.textContent).toBe(row.status);
    }
  });

  it("puts every number on the page inside a figure, or in arithmetic labelled not a forecast", () => {
    const walker = doc.createTreeWalker(main, 4);
    const loose: string[] = [];
    // [data-arithmetic] is the cadence calculator's working; test/dom/cadence.test.ts checks its label and its numbers.
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\d/.test(n.textContent!) && !n.parentElement!.closest(".figure, [data-arithmetic]")) loose.push(n.textContent!.trim());
    expect(loose).toEqual([]);
  });

  it("draws the run in the yellow hatch with the word speculative, keyed letter for letter", () => {
    expect(svg?.querySelector("pattern#launch-hatch rect[fill='var(--co-yellow)']")).not.toBeNull();
    expect(svg?.querySelector("[data-layer='tunnel'] [stroke='url(#launch-hatch)']")).not.toBeNull();
    expect([...svg!.querySelectorAll("text")].map((t) => t.textContent)).toContain("speculative");
    expect(main.querySelector(".profile-figure figcaption")?.textContent).toMatch(/not to scale/);
    const letters = (sel: string) => [...main.querySelectorAll(sel)].map((e) => e.getAttribute("data-mark"));
    expect(letters("svg [data-mark]")).toEqual(letters(".profile-key li"));
  });

  it("says speculative in the lead's hatch tag and the title, and links /launch/ in the header", () => {
    expect(main.querySelector(".hatch-tag")?.textContent).toBe("speculative");
    expect(doc.title).toMatch(/speculative/);
    expect(doc.querySelectorAll("header nav a[href='/launch/']")).toHaveLength(1);
  });
});
