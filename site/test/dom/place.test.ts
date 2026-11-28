// @vitest-environment jsdom
// Home section 2, "The place" (step 25, issue #128): 3 tiles, each number equal to its claims-register row,
// each with a source behind a press, about 20 words, and the page keeps one <h1>.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { sourceOf } from "../../src/components/figure";
import { getClaim } from "../../src/lib/claims/parse";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const CLAIMS = ["R-03", "R-04", "R-05"];
const BUDGET = 20; // about 20 words, issue #128
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

// Words a visitor sees with every tile closed: a tile's source waits behind its press.
const CLOSED = "script, style, [hidden], [aria-hidden='true'], .figure-source, details > :not(summary)";
const words = (node: Node): number => node.nodeType === 3 ? (node.textContent ?? "").split(/\s+/).filter(Boolean).length
  : node.nodeType === 1 && !(node as Element).matches(CLOSED) ? [...node.childNodes].reduce((sum, child) => sum + words(child), 0) : 0;

/** Problems with section.place; empty is a pass. */
function placeProblems(doc: Document): string[] {
  const section = doc.querySelector("section.place");
  if (!section) return ["no section.place"];
  const out: string[] = [];
  const tiles = [...section.querySelectorAll("details")];
  const ids = tiles.map((t) => t.querySelector("summary .figure")?.getAttribute("data-claim"));
  if (ids.join() !== CLAIMS.join()) out.push(`tiles show ${ids.join()}, want ${CLAIMS.join()}`);
  for (const [i, tile] of tiles.entries()) {
    const fig = tile.querySelector("summary .figure");
    const id = ids[i];
    if (!fig || !id || !CLAIMS.includes(id)) continue;
    const row = getClaim(id);
    const shown = firstNumber(text(fig.querySelector(".figure-value")));
    if (shown !== firstNumber(row.claim)) out.push(`${id} shows ${shown}, its row says "${row.claim}"`);
    if (fig.getAttribute("data-status") !== row.status || text(fig.querySelector(".figure-chip")) !== row.status) out.push(`${id} chip is not "${row.status}"`);
    if (text(fig.querySelector(".figure-source")) !== sourceOf(row.source)?.text) out.push(`${id} source is not its row's`);
    const body = [...tile.children].filter((c) => c.tagName !== "SUMMARY").flatMap((c) => [c, ...c.querySelectorAll("*")]);
    if (!body.some((el) => el.matches("a[href]") && el.getAttribute("href") === SOURCE)) out.push(`${id} opens no link to ${SOURCE}`);
    if (tile.hasAttribute("open")) out.push(`${id} starts open`);
  }
  if (!section.querySelector("img[src='/maps/region.svg'][width][height]")?.getAttribute("alt")?.trim()) out.push("no region drawing with alt, width and height");
  const n = words(section);
  if (n > BUDGET) out.push(`${n} words, budget ${BUDGET}`);
  return out;
}

const tile = (id: string, value: string) => {
  const row = getClaim(id);
  return `<li><details><summary><span class="figure" data-claim="${id}" data-status="${row.status}"><span class="figure-value">${value}</span><span class="figure-chip">${row.status}</span><span class="figure-source">${sourceOf(row.source)?.text}</span></span><span>a label</span></summary><p><a href="${SOURCE}">source</a></p></details></li>`;
};
const GOOD = `<section class="place"><h2>The place</h2><img src="/maps/region.svg" alt="The region" width="800" height="761"><ul>${tile("R-03", "89 sq mi")}${tile("R-04", "22.7 mi")}${tile("R-05", "0.94×")}</ul></section>`;

describe("the place check", () => {
  it("names the register's loop source", () => expect(SOURCE).toMatch(/^https:\/\/github\.com\/Colorado-Startups\/coloradostartups\.org\/blob\/[0-9a-f]{40}\/data\/geo\/regions\.geojson$/));
  it("passes a known-good section", () => expect(placeProblems(parse(GOOD))).toEqual([]));
  it.each([
    ["a number off its row", GOOD.replace("89 sq mi", "90 sq mi"), /R-03 shows 90/],
    ["a fourth tile", GOOD.replace("</ul>", `${tile("R-01", "5")}</ul>`), /want R-03,R-04,R-05/],
    ["no source link", GOOD.replace(`<a href="${SOURCE}">source</a>`, "source"), /R-03 opens no link/],
    ["a tile open at load", GOOD.replace("<details>", "<details open>"), /R-03 starts open/],
    ["too many words", GOOD.replace("The place", "The place ".repeat(5)), /words, budget 20/],
  ])("flags %s (known bad)", (_name, html, problem) => {
    expect(placeProblems(parse(html)).join("\n")).toMatch(problem);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[place] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("the built home page, section 2", () => {
  const home = parse(ready ? builtPages().find((p) => p.route === "/")?.html ?? "" : "");
  it("has 3 tiles that match the register, each with its source, within the word budget", () => expect(placeProblems(home)).toEqual([]));
  it("keeps one <h1>, and comes after the hero", () => {
    expect(home.querySelectorAll("h1")).toHaveLength(1);
    const [hero, place] = [home.querySelector("section.hero"), home.querySelector("section.place")];
    expect(hero && place && hero.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("draws from a built /maps/region.svg", () => expect(existsSync(path.join(DIST_DIR, "maps", "region.svg"))).toBe(true));
});
