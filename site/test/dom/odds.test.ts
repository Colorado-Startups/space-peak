// @vitest-environment jsdom
// Home section 6, "The odds" (step 36, issue #140): one 100-dot array per estimate, each equal to its file and its
// claims-register row, each saying "draft estimate" while the row is open, its reasoning and date behind a press
// that needs no script, and about 30 words.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getClaim } from "../../src/lib/claims/parse";
import { allEstimates, estimateTag, registerId, type Estimate } from "../../src/lib/estimates/schema";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const BUDGET = 30; // about 30 words, issue #140
const ESTIMATES = allEstimates();
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const pct = (e: Estimate) => Number((e.p * 100).toFixed(1));

// Prose words: what a visitor reads with every press closed, outside the dot arrays, the chance each draws and their
// table twins, and outside the status labels, which carry status, not prose.
const NOT_PROSE = "script, style, svg, [hidden], [aria-hidden='true'], .chart > figcaption, .chart > details, .draft-tag, details > :not(summary)";
const words = (node: Node): number => node.nodeType === 3 ? (node.textContent ?? "").split(/\s+/).filter(Boolean).length
  : node.nodeType === 1 && !(node as Element).matches(NOT_PROSE) ? [...node.childNodes].reduce((sum, child) => sum + words(child), 0) : 0;

/** Problems with one card against its estimate file and register row; empty is a pass. */
function cardProblems(card: Element, e: Estimate): string[] {
  const out: string[] = [];
  const id = registerId(e);
  const row = getClaim(id);
  const svg = card.querySelector(".chart svg[role='img']");
  if (svg?.getAttribute("aria-label") !== e.question) out.push(`${e.id} dots are not named by its question`);
  const filled = [...(svg?.querySelectorAll("circle") ?? [])].filter((c) => c.getAttribute("fill") !== "var(--c-rule)").length;
  if (filled !== Math.round(e.p * 100)) out.push(`${e.id} fills ${filled} dots, its file gives p ${e.p}`);
  if (text(card.querySelector(".chart tbody th")) !== String(e.p)) out.push(`${e.id} table twin is not p ${e.p}`);
  if (text(card.querySelector(".chart figcaption")) !== `${pct(e)}%`) out.push(`${e.id} shows "${text(card.querySelector(".chart figcaption"))}", want ${pct(e)}%`);
  if (card.getAttribute("data-register") !== id || card.getAttribute("data-status") !== row.status) out.push(`${e.id} does not name row ${id} and its status`);
  if (!row.claim.includes(`at ${pct(e)} percent`)) out.push(`${id} says "${row.claim}", the file gives p ${e.p}`);
  const press = card.querySelector(":scope > details");
  const tag = text(press?.querySelector("summary .draft-tag"));
  if (tag !== estimateTag(row.status)) out.push(`${e.id} row is ${row.status}, its tag says "${tag}"`);
  // A short label keeps its question's year, so "by 2040" never stands in for another date.
  const label = text(press?.querySelector("summary .odds-label"));
  const year = /\b(20\d{2})\b/.exec(e.question)?.[1];
  if (!label || !year || !label.includes(year)) out.push(`${e.id} label "${label}" drops its year ${year}`);
  const why = text(press?.querySelector(":scope > :not(summary)"));
  for (const [what, want] of [["question", e.question], ["reasoning", e.reasoning], ["date", e.date]] as const)
    if (!why.includes(want.replace(/\s+/g, " ").trim())) out.push(`${e.id} press does not show its ${what}`);
  for (const s of e.sources) if (!press?.querySelector(`a[href="${s.url}"]`)) out.push(`${e.id} press does not link ${s.url}`);
  if (press?.hasAttribute("open")) out.push(`${e.id} starts open`);
  return out;
}

/** Problems with section.odds; empty is a pass. */
function oddsProblems(doc: Document): string[] {
  const section = doc.querySelector("section.odds");
  if (!section) return ["no section.odds"];
  const out: string[] = [];
  const cards = [...section.querySelectorAll("li.odds-card")];
  const ids = cards.map((c) => c.getAttribute("data-estimate"));
  if (ids.join() !== ESTIMATES.map((e) => e.id).join()) out.push(`cards are ${ids.join()}, want every estimate in id order`);
  for (const card of cards) {
    const e = ESTIMATES.find((x) => x.id === card.getAttribute("data-estimate"));
    if (e) out.push(...cardProblems(card, e));
  }
  // Nothing presents a draft as a fact: no register figure, no verified chip, no script to reveal anything.
  if (section.querySelector("[data-claim], .figure, .figure-chip")) out.push("a draft is shown as a register figure");
  if (section.querySelector("script")) out.push("the section loads a script");
  const n = words(section);
  if (n > BUDGET) out.push(`${n} words, budget ${BUDGET}`);
  return out;
}

const card = (e: Estimate) => {
  const filled = Math.round(e.p * 100);
  const dots = Array.from({ length: 100 }, (_, i) => `<circle fill="${i < filled ? "var(--c-region-space-peak)" : "var(--c-rule)"}"></circle>`).join("");
  return `<li class="odds-card" data-estimate="${e.id}" data-register="${registerId(e)}" data-status="open"><figure class="chart"><svg role="img" aria-label="${e.question}">${dots}</svg><figcaption>${pct(e)}%</figcaption>
    <details><summary>Data as a table</summary><table><tbody><tr><th>${e.p}</th><td>${filled}</td><td>100</td></tr></tbody></table></details></figure>
    <details><summary><span class="odds-label">A label for ${/\b(20\d{2})\b/.exec(e.question)![1]}</span><span class="draft-tag">draft estimate</span></summary><div><p>${e.question}</p><p>${e.reasoning}</p><p>${e.date}</p>
    ${e.sources.map((s) => `<a href="${s.url}">${s.publisher}</a>`).join("")}</div></details></li>`;
};
const GOOD = `<section class="odds"><h2>The odds</h2><ul>${ESTIMATES.map(card).join("")}</ul></section>`;

describe("the odds check", () => {
  it("passes a known-good section", () => expect(oddsProblems(parse(GOOD))).toEqual([]));
  const q1 = ESTIMATES[0]!;
  const q1Year = /\b(20\d{2})\b/.exec(q1.question)![1];
  it.each([
    ["a chance off its file", GOOD.replace(`<figcaption>${pct(q1)}%`, "<figcaption>8%"), /q-01 shows "8%"/],
    ["a draft without its tag", GOOD.replace('<span class="draft-tag">draft estimate</span>', '<span class="draft-tag">estimate</span>'), /q-01 row is open, its tag says "estimate"/],
    ["a draft shown as a verified figure", GOOD.replace("</summary>", '<span class="figure-chip">verified</span></summary>'), /shown as a register figure/],
    ["a label without its year", GOOD.replace(`A label for ${q1Year}`, "A label"), /q-01 label "A label" drops its year/],
    ["reasoning missing", GOOD.replace(`<p>${q1.reasoning}</p>`, ""), /q-01 press does not show its reasoning/],
    ["a press open at load", GOOD.replace('<details><summary><span class="odds-label">', '<details open><summary><span class="odds-label">'), /q-01 starts open/],
    ["a card missing", GOOD.replace(card(q1), ""), /want every estimate/],
    ["a script", GOOD.replace("</ul>", "</ul><script src='/x.js'></script>"), /loads a script/],
    ["too many words", GOOD.replace("The odds", "The odds ".repeat(20)), /words, budget 30/],
  ])("flags %s (known bad)", (_name, html, problem) => {
    expect(oddsProblems(parse(html)).join("\n")).toMatch(problem);
  });
});

describe("the odds section's source", () => {
  // Code lines only: the header comment may name the label it describes.
  const source = readFileSync(path.join(SITE_DIR, "src", "sections", "home", "60-odds.astro"), "utf8")
    .split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  it("labels each card through estimateTag, with no label written in", () => {
    expect(source).toMatch(/tag: estimateTag\(row\.status\)/);
    expect(source).not.toMatch(/draft estimate/);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[odds] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("the built home page, section 6", () => {
  const home = parse(ready ? builtPages().find((p) => p.route === "/")?.html ?? "" : "");
  it("draws every estimate from its file and row, each a draft estimate, within the word budget", () => expect(oddsProblems(home)).toEqual([]));
  it("keeps one <h1>, after section 2", () => {
    expect(home.querySelectorAll("h1")).toHaveLength(1);
    const [place, odds] = [home.querySelector("section.place"), home.querySelector("section.odds")];
    expect(place && odds && place.compareDocumentPosition(odds) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
