// @vitest-environment jsdom
// Home section 2, "The place" (step 25, issue #128): 3 tiles, each number equal to its claims-register row,
// each with a small "source" link to the loop file (issue #153), about 20 words, and the page keeps one <h1>.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getClaim } from "../../src/lib/claims/parse";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const CLAIMS = ["R-03", "R-04", "R-05"];
const BUDGET = 20; // about 20 words, issue #128; a guideline, issue #154
const REGISTER = readFileSync(path.join(SITE_DIR, "..", "02_substance", "claims_register.md"), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const firstNumber = (s: string) => Number(/\d+(?:\.\d+)?/.exec(s)?.[0]);

/** The file the register's loop rows cite, at the commit it names, as a GitHub link. */
function loopSource(register: string): string {
  const m = /`Colorado-Startups\/coloradostartups\.org`, `([^`]+)`, feature `space-peak`, at commit `([0-9a-f]{40})`/.exec(register);
  if (!m) throw new Error("claims register: the loop section no longer names its source file and commit");
  return `https://github.com/Colorado-Startups/coloradostartups.org/blob/${m[2]}/${m[1]}`;
}
const SOURCE = loopSource(REGISTER);

// Words a visitor sees, each tile's "source" link included.
const UNSEEN = "script, style, [hidden], [aria-hidden='true']";
const words = (node: Node): number => node.nodeType === 3 ? (node.textContent ?? "").split(/\s+/).filter(Boolean).length
  : node.nodeType === 1 && !(node as Element).matches(UNSEEN) ? [...node.childNodes].reduce((sum, child) => sum + words(child), 0) : 0;

/** Problems with section.place; empty is a pass. */
function placeProblems(doc: Document): string[] {
  const section = doc.querySelector("section.place");
  if (!section) return ["no section.place"];
  const out: string[] = [];
  const tiles = [...section.querySelectorAll(".place-tiles > li")];
  const ids = tiles.map((t) => t.querySelector(".figure")?.getAttribute("data-claim"));
  if (ids.join() !== CLAIMS.join()) out.push(`tiles show ${ids.join()}, want ${CLAIMS.join()}`);
  for (const [i, tile] of tiles.entries()) {
    const fig = tile.querySelector(".figure");
    const id = ids[i];
    if (!fig || !id || !CLAIMS.includes(id)) continue;
    const row = getClaim(id);
    const shown = firstNumber(text(fig.querySelector(".figure-value")));
    if (shown !== firstNumber(row.claim)) out.push(`${id} shows ${shown}, its row says "${row.claim}"`);
    const link = fig.querySelector("a.figure-source");
    if (link?.getAttribute("href") !== SOURCE || text(link) !== "source") out.push(`${id} has no "source" link to ${SOURCE}`);
    if (tile.querySelector(".figure-chip, details")) out.push(`${id} shows a chip or waits behind a press`);
  }
  if (!section.querySelector("img[src='/maps/region.svg'][width][height]")?.getAttribute("alt")?.trim()) out.push("no region drawing with alt, width and height");
  return out;
}

const tile = (id: string, value: string) =>
  `<li><span class="figure" data-claim="${id}"><span class="figure-value">${value}</span><a class="figure-source" href="${SOURCE}">source</a></span><span>a label</span></li>`;
const GOOD = `<section class="place"><h2>The place</h2><img src="/maps/region.svg" alt="The region" width="800" height="761"><ul class="place-tiles">${tile("R-03", "89 sq mi")}${tile("R-04", "22.7 mi")}${tile("R-05", "0.94×")}</ul></section>`;

describe("the place check", () => {
  it("names the register's loop source", () => expect(SOURCE).toMatch(/^https:\/\/github\.com\/Colorado-Startups\/coloradostartups\.org\/blob\/[0-9a-f]{40}\/data\/geo\/regions\.geojson$/));
  it("passes a known-good section", () => expect(placeProblems(parse(GOOD))).toEqual([]));
  it.each([
    ["a number off its row", GOOD.replace("89 sq mi", "90 sq mi"), /R-03 shows 90/],
    ["a fourth tile", GOOD.replace("</ul>", `${tile("R-01", "5")}</ul>`), /want R-03,R-04,R-05/],
    ["no source link", GOOD.replace(`<a class="figure-source" href="${SOURCE}">source</a>`, ""), /R-03 has no "source" link/],
    ["a file name for the link", GOOD.replace(">source</a>", ">regions.geojson</a>"), /R-03 has no "source" link/],
    ["a status chip", GOOD.replace("</span><a", `</span><span class="figure-chip">verified</span><a`), /R-03 shows a chip/],
  ])("flags %s (known bad)", (_name, html, problem) => {
    expect(placeProblems(parse(html)).join("\n")).toMatch(problem);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[place] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("the built home page, section 2", () => {
  const home = parse(ready ? builtPages().find((p) => p.route === "/")?.html ?? "" : "");
  it("has 3 tiles that match the register, each with its source link", () => expect(placeProblems(home)).toEqual([]));
  it("warns past the word budget, and never fails on it", () => {
    const section = home.querySelector("section.place");
    const n = section ? words(section) : 0;
    if (n > BUDGET) console.warn(`[place] guideline: "The place" has ${n} words, about ${BUDGET} suggested`);
  });
  it("keeps one <h1>, and comes after the hero", () => {
    expect(home.querySelectorAll("h1")).toHaveLength(1);
    const [hero, place] = [home.querySelector("section.hero"), home.querySelector("section.place")];
    expect(hero && place && hero.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("draws from a built /maps/region.svg", () => expect(existsSync(path.join(DIST_DIR, "maps", "region.svg"))).toBe(true));
});
