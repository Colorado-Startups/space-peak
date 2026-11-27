import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { CHART_PX, renderChart, tableOf, type ChartSpec } from "../../src/lib/charts/plot";

// Issue #91: charts drawn at build, text only at 15 px, colours only from tokens, a table twin for each.
const SPECS: ChartSpec[] = [
  { kind: "bar", title: "Organisations by kind", unit: "organisations", rows: [{ label: "Command bases", value: 4, tone: "blue" }, { label: "Institutions", value: 9, tone: "green" }, { label: "Companies", value: 31, tone: "purple" }] },
  { kind: "line", title: "Cost to orbit", x: "Year", y: "USD per kg", log: true, rows: [{ x: 1981, y: 54500 }, { x: 2002, y: 8100 }, { x: 2018, y: 1500 }] },
  { kind: "dots", title: "Draft odds", percent: 7, tone: "yellow" },
];
const TOKENS = ["tokens.css", "space-peak.css"].map((f) => readFileSync(`${process.cwd()}/src/styles/${f}`, "utf8")).join("\n");
const parse = (svg: string) => new JSDOM(`<body>${svg}</body>`).window.document.querySelector("svg")!;

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

  it("has a table twin with one row per data row", () => {
    const want = spec.kind === "dots" ? 1 : spec.rows.length;
    const t = tableOf(spec);
    expect(t.rows).toHaveLength(want);
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length);
  });
});

describe("dot array", () => {
  it("draws 100 dots with the estimate filled", () => {
    const dots = [...parse(renderChart(SPECS[2]!)).querySelectorAll("circle")];
    expect(dots).toHaveLength(100);
    expect(dots.filter((d) => d.getAttribute("fill") === "var(--c-kind-yellow)")).toHaveLength(7);
  });

  it("rejects a percent that is not a whole number 0 to 100", () => {
    for (const percent of [-1, 101, 2.5]) expect(() => renderChart({ kind: "dots", title: "x", percent })).toThrow(/whole number/);
  });
});

it("Chart.astro renders the table from tableOf, not a copy of the data", () => {
  const astro = readFileSync(`${process.cwd()}/src/components/charts/Chart.astro`, "utf8");
  expect(astro).toMatch(/const table = tableOf\(spec\)/);
  expect(astro).toMatch(/<table>[\s\S]*table\.rows\.map/);
});
