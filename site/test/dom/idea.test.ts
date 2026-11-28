// @vitest-environment jsdom
// Home section 5, "The big idea" (step 36, issue #140): every chart and ruler value equals its claims-register row,
// and every unproven number carries a marker; the ruler is drawn with no script and stays still under reduced motion.
// The 30-word budget is our own guideline, so it warns and never fails (Paul, 2026-11-28).
// e2e/ruler.spec.ts checks the motion itself in a real browser.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getClaim } from "../../src/lib/claims/parse";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const COST = ["E-09", "E-10", "E-11", "E-12", "E-13"];
const RULER = ["P-01", "S-14", "P-14", "P-02"]; // orbit, Pikes Peak, the muzzle, the air below it
const THESIS = "E-14";
const BUDGET = 30; // about 30 words, issue #140: a guideline that warns
// Statuses a reader cannot take as proven. Only these need a marker beside the number.
const UNPROVEN = ["unverified", "unverifiable", "open"];
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
  for (const [i, tr] of rows.entries()) {
    const id = ids[i];
    if (!id) continue;
    const row = getClaim(id);
    const shown = numbers(text(tr.querySelector("td")))[0];
    if (!new RegExp(`\\$${shown?.toLocaleString("en-US")} per kg`).test(row.claim)) out.push(`${id} plots ${shown}, its row says "${row.claim}"`);
    // The label carries the first-flight year (or years) the row states, so no bar reads as a cost of another year.
    const years = /first launched in (\d{4})|first flown from (\d{4}) to (\d{4})/.exec(row.claim)?.slice(1).filter(Boolean) ?? [];
    const label = text(tr.querySelector("th"));
    if (!years.length || !years.every((y) => label.includes(`first fl`) && label.includes(y))) out.push(`${id} label "${label}" does not give its first flight`);
    // A bar has no room for a marker, so each one must be proven.
    if (UNPROVEN.includes(row.status)) out.push(`${id} is ${row.status}, and a bar cannot mark it unproven`);
  }
  if (!cost?.querySelector(".idea-source a[href^='https://ntrs.nasa.gov/']")) out.push("cost chart links no NASA source");
  if (!text(cost?.querySelector(".idea-source")).includes("2018 list prices, not today's")) out.push("the Falcon bars are not marked as 2018 list prices");
  const thesis = section.querySelector(`.idea-lead .figure[data-claim='${THESIS}']`);
  if (!thesis) out.push(`the thesis is not ${THESIS}`);
  else if (UNPROVEN.includes(getClaim(THESIS).status) && !thesis.querySelector(".figure-chip")) out.push("the thesis is unproven and carries no marker");

  const ruler = section.querySelector("figure.ruler");
  if (ruler?.getAttribute("data-rise") !== "") out.push(`ruler starts at data-rise="${ruler?.getAttribute("data-rise")}", want drawn`);
  const figs = [...(ruler?.querySelectorAll(".ruler-key summary .figure") ?? [])];
  const shownIds = figs.map((f) => f.getAttribute("data-claim"));
  if (shownIds.join() !== RULER.join()) out.push(`ruler shows ${shownIds.join()}, want ${RULER.join()}`);
  for (const fig of figs) {
    const id = fig.getAttribute("data-claim")!;
    out.push(...figureProblems(id, text(fig.querySelector(".figure-value"))));
    if (UNPROVEN.includes(getClaim(id).status) && !fig.querySelector(".figure-chip")) out.push(`${id} is unproven and carries no marker`);
  }
  const muzzle = ruler?.querySelector("li[data-mark='muzzle']");
  if (text(muzzle?.querySelector(".hatch-tag")) !== "speculative") out.push("the muzzle is not tagged speculative");
  if (!/^url\(#/.test(ruler?.querySelector("svg [data-mark='muzzle']")?.getAttribute("fill") ?? "")) out.push("the muzzle band is not hatched");
  if (section.querySelector("details[open]")) out.push("a press starts open");
  return out;
}

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

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[idea] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("the built home page, section 5", () => {
  const html = ready ? builtPages().find((p) => p.route === "/")?.html ?? "" : "";
  const home = parse(html);
  it("plots and shows every value from its register row, each unproven one marked", () => expect(ideaProblems(home)).toEqual([]));
  it(`keeps to about ${BUDGET} prose words, or warns`, () => {
    const section = home.querySelector("section.idea");
    const n = section ? words(section) : 0;
    if (n > BUDGET) console.warn(`[idea] section 5 has ${n} prose words; the guideline is about ${BUDGET}.`);
    expect(n).toBeGreaterThan(0);
  });
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
