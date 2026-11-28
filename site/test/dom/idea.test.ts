// @vitest-environment jsdom
// Home section 5, "The big idea" (step 36, issue #140): every chart and ruler value equals its claims-register row,
// with that row's status; the ruler is drawn with no script and stays still under reduced motion; about 30 words.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getClaim } from "../../src/lib/claims/parse";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const COST = ["E-06", "E-07", "E-08", "E-09", "E-10"];
const RULER = ["P-01", "S-14", "P-02", "P-02"]; // orbit, Pikes Peak, the muzzle, the air below it
const BUDGET = 30; // about 30 words, issue #140
const MOTION_LIMIT_S = 1.5;
const SECTION = readFileSync(path.join(SITE_DIR, "src", "sections", "home", "50-idea.astro"), "utf8");
const SCRIPT = readFileSync(path.join(SITE_DIR, "public", "js", "ruler-rise.js"), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const numbers = (s: string) => [...s.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, "")));

// Prose words: what a visitor reads with every press closed, outside the pictures (the chart, the ruler drawing,
// the table twin) and outside the figures and their status labels, which carry data, not prose.
const NOT_PROSE = "script, style, svg, [hidden], [aria-hidden='true'], .chart > details, .figure, .figure-chip, .hatch-tag, details > :not(summary)";
const words = (node: Node): number => node.nodeType === 3 ? (node.textContent ?? "").split(/\s+/).filter(Boolean).length
  : node.nodeType === 1 && !(node as Element).matches(NOT_PROSE) ? [...node.childNodes].reduce((sum, child) => sum + words(child), 0) : 0;

/** A figure's numbers all come from its row, and a number the row hedges with "about" stays hedged. */
function figureProblems(id: string, value: string): string[] {
  const row = getClaim(id).claim;
  const out: string[] = [];
  for (const n of value.match(/\d[\d,]*/g) ?? []) {
    if (!numbers(row).includes(Number(n.replace(/,/g, "")))) out.push(`${id} shows ${n}, its row says "${row}"`);
    if (row.includes(`about ${n}`) && !value.includes(`about ${n}`)) out.push(`${id} drops the "about" before ${n}`);
  }
  return out;
}

/** Problems with section.idea; empty is a pass. */
function ideaProblems(doc: Document): string[] {
  const section = doc.querySelector("section.idea");
  if (!section) return ["no section.idea"];
  const out: string[] = [];
  const cost = section.querySelector(".idea-cost");
  const ids = cost?.getAttribute("data-claims")?.split(" ") ?? [];
  if (ids.join() !== COST.join()) out.push(`cost chart cites ${ids.join()}, want ${COST.join()}`);
  const rows = [...(cost?.querySelectorAll(".chart table tbody tr") ?? [])];
  if (rows.length !== ids.length) out.push(`cost chart has ${rows.length} rows for ${ids.length} claims`);
  if (cost?.querySelectorAll(".chart svg[role='img'] g[aria-label='bar'] > *").length !== ids.length) out.push("cost chart draws a bar per row");
  const chips = [...(cost?.querySelectorAll(".idea-source .figure-chip") ?? [])].map(text);
  for (const [i, tr] of rows.entries()) {
    const id = ids[i];
    if (!id) continue;
    const row = getClaim(id);
    const shown = numbers(text(tr.querySelector("td")))[0];
    if (!new RegExp(`\\$${shown?.toLocaleString("en-US")} per kg`).test(row.claim)) out.push(`${id} plots ${shown}, its row says "${row.claim}"`);
    if (!chips.includes(row.status)) out.push(`${id} is ${row.status}, and no chip says so`);
  }
  if (!cost?.querySelector(".idea-source a[href^='https://ntrs.nasa.gov/']")) out.push("cost chart links no NASA source");

  const ruler = section.querySelector("figure.ruler");
  if (ruler?.getAttribute("data-rise") !== "") out.push(`ruler starts at data-rise="${ruler?.getAttribute("data-rise")}", want drawn`);
  const figs = [...(ruler?.querySelectorAll(".ruler-key summary .figure") ?? [])];
  const shownIds = figs.map((f) => f.getAttribute("data-claim"));
  if (shownIds.join() !== RULER.join()) out.push(`ruler shows ${shownIds.join()}, want ${RULER.join()}`);
  for (const fig of figs) {
    const id = fig.getAttribute("data-claim")!;
    const status = getClaim(id).status;
    out.push(...figureProblems(id, text(fig.querySelector(".figure-value"))));
    if (fig.getAttribute("data-status") !== status || text(fig.querySelector(".figure-chip")) !== status) out.push(`${id} chip is not "${status}"`);
  }
  const muzzle = ruler?.querySelector("li[data-mark='muzzle']");
  if (text(muzzle?.querySelector(".hatch-tag")) !== "speculative") out.push("the muzzle is not tagged speculative");
  if (!/^url\(#/.test(ruler?.querySelector("svg [data-mark='muzzle']")?.getAttribute("fill") ?? "")) out.push("the muzzle band is not hatched");
  if (section.querySelector("details[open]")) out.push("a press starts open");
  const n = words(section);
  if (n > BUDGET) out.push(`${n} words, budget ${BUDGET}`);
  return out;
}

const figure = (id: string, value: string) => `<span class="figure" data-claim="${id}" data-status="${getClaim(id).status}"><span class="figure-value">${value}</span><span class="figure-chip">${getClaim(id).status}</span></span>`;
const key = (mark: string, label: string, fig: string) => `<li data-mark="${mark}"><details><summary><span>${label}</span>${fig}</summary></details></li>`;
const bar = (id: string) => `<tr><th>x</th><td>${/\$([\d,]+) per kg/.exec(getClaim(id).claim)![1]}</td></tr>`;
const GOOD = `<section class="idea"><h2>The big idea</h2><p>Cost to orbit is the choke point.</p>
  <div class="idea-cost" data-claims="${COST.join(" ")}"><figure class="chart"><svg role="img"><g aria-label="bar">${COST.map(() => "<path/>").join("")}</g></svg>
  <details><summary>Data as a table</summary><table><tbody>${COST.map(bar).join("")}</tbody></table></details></figure>
  <p class="idea-source"><a href="https://ntrs.nasa.gov/x">NASA</a> <span class="figure-chip">verified</span></p></div>
  <figure class="ruler" data-rise=""><svg><rect data-mark="muzzle" fill="url(#h)"/></svg><ul class="ruler-key">
  ${key("orbit", "Orbit", figure("P-01", "about 17,500 mph sideways"))}${key("pikes", "Pikes Peak", figure("S-14", "14,115 ft"))}
  ${key("muzzle", 'Muzzle <span class="hatch-tag">speculative</span>', figure("P-02", "12,000–14,000 ft"))}${key("air", "Air below", figure("P-02", "about 36–41%"))}
  </ul></figure></section>`;

describe("the big idea check", () => {
  it("passes a known-good section", () => expect(ideaProblems(parse(GOOD))).toEqual([]));
  it.each([
    ["a bar off its row", GOOD.replace("<td>61,720</td>", "<td>54,500</td>"), /E-08 plots 54500/],
    ["a bar with no row", GOOD.replace(`data-claims="${COST.join(" ")}"`, `data-claims="${COST.slice(1).join(" ")}"`), /cost chart cites/],
    ["no status chip", GOOD.replace('<span class="figure-chip">verified</span>', ""), /E-06 is verified, and no chip/],
    ["a ruler number off its row", GOOD.replace("14,115 ft", "14,110 ft"), /S-14 shows 14,110/],
    ["a hedge dropped", GOOD.replace("about 17,500", "17,500"), /P-01 drops the "about"/],
    ["the muzzle unlabelled", GOOD.replace('<span class="hatch-tag">speculative</span>', ""), /not tagged speculative/],
    ["a ruler hidden at rest", GOOD.replace('data-rise=""', 'data-rise="wait"'), /want drawn/],
    ["too many words", GOOD.replace("The big idea", "The big idea ".repeat(9)), /words, budget 30/],
  ])("flags %s (known bad)", (_name, html, problem) => {
    expect(ideaProblems(parse(html)).join("\n")).toMatch(problem);
  });
});

/** public/js/ruler-rise.js on its own document, handed a stubbed matchMedia and IntersectionObserver. */
function runRuler({ reduce = false, observer = true } = {}) {
  const doc = document.implementation.createHTMLDocument("ruler");
  doc.body.innerHTML = '<figure class="ruler" data-rise=""><svg></svg></figure>';
  const media = { matches: reduce, listeners: [] as (() => void)[], addEventListener(_: string, f: () => void) { this.listeners.push(f); } };
  const io = { callback: undefined as undefined | ((e: object[]) => void), disconnected: false };
  const Observer = class { constructor(cb: (e: object[]) => void) { io.callback = cb; } observe() {} disconnect() { io.disconnected = true; } };
  const win = observer ? { IntersectionObserver: Observer } : {};
  new Function("window", "document", "matchMedia", "IntersectionObserver", SCRIPT)(win, doc, () => media, observer ? Observer : undefined);
  const ruler = doc.querySelector<HTMLElement>(".ruler")!;
  return {
    io,
    state: () => ruler.dataset.rise,
    answer: (isIntersecting: boolean, intersectionRatio: number) => io.callback!([{ isIntersecting, intersectionRatio }]),
    reduce: () => { media.matches = true; media.listeners.forEach((f) => f()); },
  };
}

describe("the ruler's script", () => {
  it("leaves it still under reduced motion, and watches nothing", () => {
    const r = runRuler({ reduce: true });
    expect(r.state()).toBe("");
    expect(r.io.callback).toBeUndefined();
  });
  it("leaves it drawn with no IntersectionObserver, or one that never answers", () => {
    expect(runRuler({ observer: false }).state()).toBe("");
    expect(runRuler().state()).toBe("");
  });
  it("leaves it drawn when it starts on screen", () => {
    const r = runRuler();
    r.answer(true, 0.5);
    expect([r.state(), r.io.disconnected]).toEqual(["", true]);
  });
  it("holds it off screen, then rises once a third is in view", () => {
    const r = runRuler();
    r.answer(false, 0);
    expect(r.state()).toBe("wait");
    r.answer(true, 0.1);
    expect(r.state()).toBe("wait");
    r.answer(true, 0.4);
    expect([r.state(), r.io.disconnected]).toEqual(["go", true]);
  });
  it("draws it at once if reduced motion turns on while it waits", () => {
    const r = runRuler();
    r.answer(false, 0);
    r.reduce();
    expect([r.state(), r.io.disconnected]).toEqual(["", true]);
  });
});

describe("the ruler's motion", () => {
  const css = /<style>([\s\S]*?)<\/style>/.exec(SECTION)?.[1] ?? "";
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));
  it("hides or moves only in the wait and go states", () => {
    const moving = rules.filter((r) => /\.ruler-(rise|labels)/.test(r.selector) && /scaleY\(0\)|opacity:\s*0|animation:/.test(r.body));
    expect(moving.length).toBeGreaterThanOrEqual(4);
    for (const r of moving) expect(r.selector).toMatch(/\[data-rise="(wait|go)"\]/);
  });
  it(`finishes within ${MOTION_LIMIT_S} s, transform and opacity only`, () => {
    const anims = [...css.matchAll(/animation:\s*([^;]+);/g)].map((m) => [...m[1]!.matchAll(/(\d*\.?\d+)s\b/g)].map((t) => Number(t[1])));
    expect(anims).toHaveLength(2);
    for (const [duration = Infinity, delay = 0] of anims) expect(duration + delay).toBeLessThanOrEqual(MOTION_LIMIT_S);
    const frames = [...css.matchAll(/@keyframes[^{]+\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)].map((m) => m[1]!);
    expect(frames).toHaveLength(2);
    for (const f of frames) for (const [, prop] of f.matchAll(/([\w-]+)\s*:/g)) expect(["transform", "opacity"]).toContain(prop);
  });
  it("resets both groups under reduced motion", () => {
    const still = css.split("\n").find((line) => line.includes("prefers-reduced-motion")) ?? "";
    expect(still).toMatch(/\.ruler-rise\s*\{\s*transform:\s*none/);
    expect(still).toMatch(/\.ruler-labels\s*\{\s*opacity:\s*1/);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[idea] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("the built home page, section 5", () => {
  const html = ready ? builtPages().find((p) => p.route === "/")?.html ?? "" : "";
  const home = parse(html);
  it("plots and shows every value from its register row, with its status, within the word budget", () => expect(ideaProblems(home)).toEqual([]));
  it("keeps one <h1>, after section 2", () => {
    expect(home.querySelectorAll("h1")).toHaveLength(1);
    const [place, idea] = [home.querySelector("section.place"), home.querySelector("section.idea")];
    expect(place && idea && place.compareDocumentPosition(idea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("needs no script: the one it loads is the ruler's own file", () => {
    const scripts = [...(home.querySelector("section.idea")?.querySelectorAll("script") ?? [])];
    expect(scripts.map((s) => s.getAttribute("src"))).toEqual(["/js/ruler-rise.js"]);
    expect(readFileSync(path.join(DIST_DIR, "js", "ruler-rise.js"), "utf8")).toBe(SCRIPT);
  });
});
