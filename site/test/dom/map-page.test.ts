// Issue #92: the list twin on /map/ names every drawn place once, so its count per kind equals the drawing's.
import { existsSync, readFileSync } from "node:fs";
// @ts-expect-error jsdom ships no types, and this step adds no dependency.
import { JSDOM } from "jsdom";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { buildMapData } from "../../src/lib/map/data";
import { drawMap } from "../../src/lib/map/draw";
import { orgSchema } from "../../src/lib/orgs/schema";
import { DIST_DIR } from "./pages";

const KINDS = ["command_base", "institution", "company", "summit"] as const;
type Counts = Record<(typeof KINDS)[number], number>;
// Node environment with jsdom by hand: a jsdom-environment file cannot resolve astro:content in data.ts.
const dom = (html: string): Document => new JSDOM(html).window.document;

/** Distinct places drawn across the page's figures: an org by its mark's title, a summit by its register row. */
function drawnCounts(doc: Document): Counts {
  const seen = Object.fromEntries(KINDS.map((k) => [k, new Set<string>()])) as Record<keyof Counts, Set<string>>;
  for (const svg of doc.querySelectorAll("figure.space-map svg[role='img']")) {
    for (const m of svg.querySelectorAll("[data-kind]")) seen[m.getAttribute("data-kind") as keyof Counts].add(m.querySelector("title")?.textContent ?? "");
    for (const g of svg.querySelectorAll("[data-layer='summit']")) seen.summit.add(g.getAttribute("data-register") ?? "");
  }
  return Object.fromEntries(KINDS.map((k) => [k, seen[k].size])) as Counts;
}

/** Items in the list twin per kind. */
function listedCounts(doc: Document): Counts {
  return Object.fromEntries(KINDS.map((k) => [k, doc.querySelectorAll(`#places li[data-kind='${k}']`).length])) as Counts;
}

describe("drawnCounts on fixtures", () => {
  const load = (f: string) => orgSchema.parse(parse(readFileSync(new URL(`../fixtures/orgs/valid/${f}`, import.meta.url), "utf8"), { customTags: ["timestamp"] }));
  const figures = (orgs: Parameters<typeof buildMapData>[0]) =>
    dom((["region", "south"] as const).map((v) => `<figure class="space-map">${drawMap(buildMapData(orgs), v)}</figure>`).join(""));

  it("counts an org drawn in both views once, and the four summits", () => {
    expect(drawnCounts(figures([load("example-startup.yaml"), load("example-command.yaml")]))).toEqual({ command_base: 1, institution: 0, company: 1, summit: 4 });
  });
  it("draws with no orgs at all", () => {
    expect(drawnCounts(figures([]))).toEqual({ command_base: 0, institution: 0, company: 0, summit: 4 });
  });
});

const file = path.join(DIST_DIR, "map", "index.html");
const ready = existsSync(file);
if (!ready && !process.env.CI) console.warn(`[map page] skipped: no ${file}. Run "npm run build" first.`);

describe.skipIf(!ready && !process.env.CI)("the built /map/ page", () => {
  const doc = ready ? dom(readFileSync(file, "utf8")) : dom("");
  it("is built", () => expect(ready, `${file} is missing; build before npm test`).toBe(true));
  it("lists as many places per kind as it draws", () => expect(listedCounts(doc)).toEqual(drawnCounts(doc)));
  it("shows each group's count, and the four summits", () => {
    for (const k of KINDS) expect(Number(doc.querySelector(`[data-group='${k}'] [data-count]`)?.getAttribute("data-count"))).toBe(listedCounts(doc)[k]);
    expect(listedCounts(doc).summit).toBe(4);
  });
  it("keeps each inline SVG's ids unique and its size fixed", () => {
    const ids = [...doc.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
    for (const svg of doc.querySelectorAll("figure.space-map svg")) expect([svg.getAttribute("width"), svg.getAttribute("height")]).not.toContain(null);
  });
  it("loads no MapLibre", () => expect(doc.documentElement.outerHTML).not.toMatch(/maplibre/i));
});
