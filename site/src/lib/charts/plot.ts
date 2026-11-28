// The chart kit: Observable Plot drawn to an SVG string at build time on jsdom's document, so no chart
// script ships. One theme: every text at 15 px (--t-step--1), colours only as CSS variables from tokens.
import * as Plot from "@observablehq/plot";
import { JSDOM } from "jsdom";

/** --t-step--1 (0.9375rem) in px: the one type size inside a chart. */
export const CHART_PX = 15;
/** Lead is granite pink; the four kind colours; yellow marks a speculative figure; muted is the rest. */
export const TONES = {
  lead: "var(--c-region-space-peak)",
  blue: "var(--c-kind-blue)",
  green: "var(--c-kind-green)",
  purple: "var(--c-kind-purple)",
  yellow: "var(--c-kind-yellow)",
  muted: "var(--c-rule)",
} as const;
export type Tone = keyof typeof TONES;

export interface BarRow { label: string; value: number; tone?: Tone }
export interface LinePoint { x: number; y: number }
export type ChartSpec =
  | { kind: "bar"; title: string; rows: BarRow[]; unit: string }
  | { kind: "line"; title: string; rows: LinePoint[]; x: string; y: string; log?: boolean; tone?: Tone }
  | { kind: "dots"; title: string; p: number; tone?: Tone };

/** The same data as rows of text: the table twin, so nothing is chart-only. */
export function tableOf(spec: ChartSpec): { columns: string[]; rows: string[][] } {
  if (spec.kind === "bar") return { columns: ["Item", spec.unit], rows: spec.rows.map((r) => [r.label, fmt(r.value)]) };
  if (spec.kind === "line") return { columns: [spec.x, spec.y], rows: spec.rows.map((r) => [String(r.x), fmt(r.y)]) };
  // A percent, as a visitor reads a chance; percentOf keeps every decimal p has, where fmt stops at 3.
  return { columns: ["Chance", "Dots filled", "Dots in all"], rows: [[percentOf(spec.p), String(dotsFilled(spec.p)), "100"]] };
}

/** p from 0 to 1 as a percent, exact and free of float noise: 0.07 is "7%", 0.0745 is "7.45%". */
export const percentOf = (p: number) => `${Number((p * 100).toPrecision(12))}%`;

const fmt = (v: number) => v.toLocaleString("en-US");
/** p is a probability from 0 to 1, as data/estimates/*.yaml stores it; the array fills p * 100 dots, rounded. */
export function dotsFilled(p: number): number {
  if (typeof p !== "number" || Number.isNaN(p) || p < 0 || p > 1) throw new Error(`dots: p must be a number from 0 to 1, got ${p}`);
  return Math.round(p * 100);
}

/** Estimated width in px of one line of text at CHART_PX, from a rough em width per character class. */
export function labelPx(text: string): number {
  let em = 0;
  for (const ch of text) em += /[MWmw@%]/.test(ch) ? 0.9 : /[A-Z0-9]/.test(ch) ? 0.7 : /[\s.,:;'!|()\-fijlrt]/.test(ch) ? 0.32 : 0.56;
  return Math.ceil(em * CHART_PX);
}
/** Tick (6 px) and Plot's 3 px label offset, plus room to breathe. */
const LABEL_GAP = 16;
/** The widest a bar label line may run before it wraps, so the bars keep most of the 640 px. */
export const LABEL_MAX_PX = 240;
/** Greedy word wrap at LABEL_MAX_PX; a single word wider than that keeps its own line and widens the margin. */
function wrapLabel(text: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && labelPx(next) > LABEL_MAX_PX) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  return line ? [...lines, line] : lines;
}

// One document for every chart; Plot only creates nodes on it, so output does not depend on call order.
const { document } = new JSDOM("").window;
const base = { document, className: "sp-chart", width: 640 };

function plotOf(spec: ChartSpec) {
  if (spec.kind === "bar") {
    const rows = spec.rows.map((r) => ({ ...r, fill: TONES[r.tone ?? "lead"] }));
    // The left margin fits the widest label line at 15 px; longer labels wrap, and each band grows to hold its lines.
    const lines = new Map(rows.map((r) => [r.label, wrapLabel(r.label)]));
    const widest = Math.max(0, ...[...lines.values()].flat().map(labelPx));
    const most = Math.max(1, ...[...lines.values()].map((l) => l.length));
    return Plot.plot({
      ...base,
      height: 48 + rows.length * Math.max(40, most * CHART_PX + 16),
      marginLeft: Math.max(40, widest + LABEL_GAP),
      color: { type: "identity" },
      x: { label: spec.unit, grid: true, nice: true },
      y: { label: null, domain: rows.map((r) => r.label), tickFormat: (d: string) => (lines.get(d) ?? [d]).join("\n") },
      marks: [
        Plot.barX(rows, { x: "value", y: "label", fill: "fill", rx2: 4, insetTop: 2, insetBottom: 2, title: (r) => `${r.label}: ${fmt(r.value)} ${spec.unit}` }),
        Plot.ruleX([0]),
      ],
    });
  }
  if (spec.kind === "line") {
    const stroke = TONES[spec.tone ?? "lead"];
    return Plot.plot({
      ...base,
      height: 320,
      marginLeft: 80,
      x: { label: spec.x, tickFormat: (d: number) => String(d) },
      y: { label: spec.y, grid: true, type: spec.log ? "log" : "linear" },
      marks: [
        Plot.line(spec.rows, { x: "x", y: "y", stroke, strokeWidth: 2 }),
        Plot.dot(spec.rows, { x: "x", y: "y", fill: stroke, stroke: "var(--c-ground)", strokeWidth: 2, r: 4, title: (r) => `${r.x}: ${fmt(r.y)}` }),
      ],
    });
  }
  // dots: a 10 by 10 icon array, filled in reading order, one dot per chance in 100.
  const filled = dotsFilled(spec.p);
  const tone = TONES[spec.tone ?? "lead"];
  const cells = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10), fill: i < filled ? tone : TONES.muted }));
  return Plot.plot({
    ...base,
    width: 320,
    height: 320,
    margin: 16,
    axis: null,
    color: { type: "identity" },
    x: { domain: [0, 9], inset: 8 },
    y: { domain: [0, 9], inset: 8, reverse: true },
    // The svg is a named img; its 100 cells are decoration, and a named group with no role fails axe (#149).
    marks: [Plot.dot(cells, { x: "x", y: "y", fill: "fill", r: 11, ariaHidden: "true" })],
  });
}

/** One chart as a standalone SVG string. Pure: the same spec always gives the same bytes. */
export function renderChart(spec: ChartSpec): string {
  const svg = plotOf(spec) as unknown as SVGSVGElement;
  svg.querySelector("style")?.remove(); // Plot's own sheet; Chart.astro styles the SVG from tokens instead
  svg.setAttribute("font-size", String(CHART_PX));
  svg.setAttribute("font-family", "inherit");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", spec.title);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  for (const el of svg.querySelectorAll("[font-size]")) if (el !== svg) el.removeAttribute("font-size");
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = spec.title;
  svg.prepend(title);
  return svg.outerHTML;
}
