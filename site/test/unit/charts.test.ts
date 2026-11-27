import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { CHART_PX, LABEL_MAX_PX, labelPx, renderChart, tableOf, type ChartSpec } from "../../src/lib/charts/plot";

// Issue #91: charts drawn at build, text only at 15 px, colours only from tokens, a table twin for each.
const SPECS: ChartSpec[] = [
  { kind: "bar", title: "Organisations by kind", unit: "organisations", rows: [{ label: "Command bases", value: 4, tone: "blue" }, { label: "Institutions", value: 9, tone: "green" }, { label: "Companies", value: 31, tone: "purple" }] },
  { kind: "line", title: "Cost to orbit", x: "Year", y: "USD per kg", log: true, rows: [{ x: 1981, y: 54500 }, { x: 2002, y: 8100 }, { x: 2018, y: 1500 }] },
  { kind: "dots", title: "Draft odds", p: 0.07, tone: "yellow" },
];
const TOKENS = ["tokens.css", "space-peak.css"].map((f) => readFileSync(`${process.cwd()}/src/styles/${f}`, "utf8")).join("\n");
const parse = (svg: string) => new JSDOM(`<body>${svg}</body>`).window.document.querySelector("svg")!;
// The data marks Plot drew: one bar per bar row (a path, for its rounded end), one dot per line point, the 100 cells of a dot array.
const bars = (svg: SVGSVGElement) => svg.querySelectorAll('g[aria-label="bar"] > :is(rect, path)').length;
const dots = (svg: SVGSVGElement) => [...svg.querySelectorAll('g[aria-label="dot"] circle')];

describe.each(SPECS)("$kind chart", (spec) => {
  const svg = parse(renderChart(spec));

  it("sets 15 px once on the root and no other text size", () => {
    expect(svg.getAttribute("font-size")).toBe(String(CHART_PX));
    expect(svg.querySelectorAll("[font-size]:not(svg), style").length).toBe(0);
    for (const el of svg.querySelectorAll("[style]")) expect(el.getAttribute("style")).not.toMatch(/font/);
  });

  it("names itself for assistive tech", () => {
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe(spec.title);
    expect(svg.querySelector(":scope > title")?.textContent).toBe(spec.title);
  });

  it("paints only currentColor, none or a token variable", () => {
    for (const el of svg.querySelectorAll("[fill], [stroke]"))
      for (const v of [el.getAttribute("fill"), el.getAttribute("stroke")].filter(Boolean) as string[]) {
        if (v === "currentColor" || v === "none") continue;
        const name = v.match(/^var\((--[\w-]+)\)$/)?.[1];
        expect(name, v).toBeTruthy();
        expect(TOKENS, name).toContain(`${name}:`);
      }
  });

  it("is deterministic, whatever was drawn before", () => {
    const first = renderChart(spec);
    for (const other of SPECS) renderChart(other);
    expect(renderChart(spec)).toBe(first);
  });

  it("has a table twin whose rows match the marks drawn", () => {
    const t = tableOf(spec);
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length);
    if (spec.kind === "bar") expect(t.rows).toHaveLength(bars(svg));
    if (spec.kind === "line") expect(t.rows).toHaveLength(dots(svg).length);
    if (spec.kind === "dots") {
      // One row per estimate; its counts are the filled cells and all the cells drawn.
      const cells = dots(svg);
      const [filled, outOf] = t.rows[0]!.slice(1).map(Number);
      expect(t.rows).toHaveLength(1);
      expect(cells.filter((d) => d.getAttribute("fill") !== "var(--c-rule)")).toHaveLength(filled!);
      expect(cells).toHaveLength(outOf!);
    }
  });
});

describe("dot array", () => {
  const lead = (p: number) => dots(parse(renderChart({ kind: "dots", title: "x", p }))).filter((d) => d.getAttribute("fill") === "var(--c-region-space-peak)");

  it("draws 100 dots with the estimate filled", () => {
    const cells = dots(parse(renderChart(SPECS[2]!)));
    expect(cells).toHaveLength(100);
    expect(cells.filter((d) => d.getAttribute("fill") === "var(--c-kind-yellow)")).toHaveLength(7);
  });

  it("takes p from 0 to 1 and fills Math.round(p * 100) dots", () => {
    for (const [p, want] of [[0, 0], [1, 100], [0.074, 7], [0.075, 8]] as const) {
      expect(lead(p), String(p)).toHaveLength(want);
      expect(tableOf({ kind: "dots", title: "x", p }).rows).toEqual([[String(p), String(want), "100"]]);
    }
  });

  it("shows the exact p in the table, not a rounded one", () => {
    expect(tableOf({ kind: "dots", title: "x", p: 0.0745 }).rows[0]![0]).toBe("0.0745");
  });

  it("rejects p outside 0 to 1 or NaN", () => {
    for (const p of [-0.01, 1.01, 7, Number.NaN]) expect(() => renderChart({ kind: "dots", title: "x", p }), String(p)).toThrow(/0 to 1/);
  });
});

describe("bar labels", () => {
  const long = "Colorado School of Mines Space Resources Program";
  const svg = parse(renderChart({ kind: "bar", title: "x", unit: "n", rows: [{ label: "Short", value: 1 }, { label: long, value: 2 }] }));
  const ticks = [...svg.querySelectorAll('g[aria-label="y-axis tick label"] text')];
  // Plot anchors each label's right edge at the left margin, less its 9 px tick and offset.
  const edge = (t: Element) => Number(/translate\(([\d.]+),/.exec(t.getAttribute("transform")!)![1]) - 9;
  const linesOf = (t: Element) => (t.querySelector("tspan") ? [...t.querySelectorAll("tspan")] : [t]).map((l) => l.textContent!);

  it("wraps a long label and keeps every line inside the left margin", () => {
    expect(linesOf(ticks[1]!).length).toBeGreaterThan(1);
    expect(ticks.flatMap(linesOf).join(" ")).toBe(`Short ${long}`);
    for (const t of ticks) for (const line of linesOf(t)) expect(labelPx(line), line).toBeLessThanOrEqual(edge(t));
  });

  it("sizes the margin from the labels, not a fixed 160 px", () => {
    const short = parse(renderChart({ kind: "bar", title: "x", unit: "n", rows: [{ label: "A", value: 1 }] }));
    expect(edge(short.querySelector('g[aria-label="y-axis tick label"] text')!)).toBeLessThan(160 - 9);
    expect(edge(ticks[1]!)).toBeLessThanOrEqual(LABEL_MAX_PX + 16);
  });
});

it("Chart.astro renders the table from tableOf, not a copy of the data", () => {
  const astro = readFileSync(`${process.cwd()}/src/components/charts/Chart.astro`, "utf8");
  expect(astro).toMatch(/const table = tableOf\(spec\)/);
  expect(astro).toMatch(/<table>[\s\S]*table\.rows\.map/);
});
