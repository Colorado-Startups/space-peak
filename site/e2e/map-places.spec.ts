// Step 28 (issue #146): kinds, summits and popups on the live map. The tile hosts are stubbed as in map.spec.ts,
// so no test reaches them. The places come from the built /data/map.geojson and /data/orgs.json.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = join(import.meta.dirname, "..", "dist");
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]; // As routes-axe.spec.ts.
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"]; // See routes-axe.spec.ts for the cast.
type Feature = { geometry: { coordinates: [number, number] }; properties: Record<string, any> };
const read = (path: string) => JSON.parse(readFileSync(join(DIST, path), "utf8"));
const features: Feature[] = read("data/map.geojson").features;
const orgs: { id: string; fact: { text: string; source: string }; sources: { id: string; url: string }[] }[] = read("data/orgs.json").orgs;

// map.spec.ts's stub: the page's own fetch answers OpenFreeMap's style and Mapterhorn's relief (404, no data),
// and the test server answers the vector tiles with 404.
const STYLE = (origin: string) => ({
  version: 8,
  sources: { openmaptiles: { type: "vector", tiles: [`${origin}/no-tiles/{z}/{x}/{y}.pbf`], maxzoom: 14 } },
  layers: [{ id: "background", type: "background" }, { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water" }],
});
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] } });

async function openLiveMap(page: Page) {
  await page.addInitScript((style) => {
    const real = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith("https://tiles.openfreemap.org/styles/")) return Promise.resolve(Response.json(style));
      if (url.startsWith("https://tiles.mapterhorn.com/")) return Promise.resolve(new Response(null, { status: 404 }));
      return real(input, init);
    }) as typeof fetch;
  }, STYLE(new URL(String(test.info().project.use.baseURL)).origin));
  await page.goto("/map/");
  await page.getByRole("button", { name: "Open the live map" }).click();
  const frame = page.locator('[data-live-map][data-state="open"]');
  await expect(frame, "the map reached its first full draw").toBeVisible({ timeout: 60_000 });
  await expect(frame, "the places drew").toHaveAttribute("data-places", /^command_base:/, { timeout: 30_000 });
  return frame;
}

test.describe.configure({ timeout: 120_000 }); // A software renderer on a shared runner.

test("every org and summit in map.geojson draws once, in its kind", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const frame = await openLiveMap(page);
  const kindOf = (f: Feature) => (f.properties.layer === "summit" ? "summit" : f.properties.kind);
  const want = ["command_base", "institution", "company", "summit"].map((k) => `${k}:${features.filter((f) => kindOf(f) === k).length}`).join(" ");
  expect(want, "the data has every kind").not.toMatch(/:0\b/);
  // The map opens on the region, so zoom out by keyboard until every place is on screen.
  const canvas = frame.locator("canvas.maplibregl-canvas");
  await expect
    .poll(async () => {
      const drawn = await frame.getAttribute("data-places");
      if (drawn !== want) await canvas.press("-");
      return drawn;
    }, { timeout: 60_000, intervals: [1_500] })
    .toBe(want);
  expect(errors).toEqual([]);
});

test("a place's popup opens by keyboard with its fact and source, and Escape hands focus back", async ({ page }) => {
  await openLiveMap(page);
  const summit = features.find((f) => f.properties.layer === "summit")!.properties;
  const org = features.find((f) => f.properties.layer === "org")!.properties;
  const o = orgs.find((x) => x.id === org.id)!;
  const cases = [
    { name: summit.name, says: ["Summit, speculative", "USGS records its summit at"], url: summit.source_url },
    { name: org.name, says: [o.fact.text], url: o.sources.find((s) => s.id === o.fact.source)!.url },
  ];
  for (const { name, says, url } of cases) {
    const show = page.getByRole("button", { name: `Show on map: ${name}` });
    await show.focus();
    await page.keyboard.press("Enter");
    const popup = page.locator(".maplibregl-popup");
    await expect(popup.locator("strong"), "focus moves to the place's name").toBeFocused();
    await expect(popup.locator("strong")).toHaveText(name);
    for (const text of says) await expect(popup).toContainText(text);
    await page.keyboard.press("Tab");
    const link = popup.getByRole("link", { name: /^Source: / });
    await expect(link).toBeFocused();
    await expect(link).toHaveAttribute("href", url);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(show).toBeFocused();
  }
});

test("axe passes with the live map and a popup open", async ({ page }) => {
  await openLiveMap(page);
  await page.getByRole("button", { name: /^Show on map: / }).first().press("Enter");
  await expect(page.locator(".maplibregl-popup")).toBeVisible();
  const results = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`)).toEqual([]);
});

// The size is a guideline, logged here; the real check is map.spec.ts's 307 KiB budget, whose walk this chunk is on.
test("the places code is one chunk that the live map script imports, so the /map/ budget counts it", () => {
  const dir = join(DIST, "_astro");
  const js = readdirSync(dir).filter((f) => f.endsWith(".js"));
  const chunks = js.filter((f) => readFileSync(join(dir, f), "utf8").includes('"sp-places"'));
  expect(chunks, "one chunk holds the places layer").toHaveLength(1);
  const importers = js.filter((f) => /live\.client/.test(f) && readFileSync(join(dir, f), "utf8").includes(`./${chunks[0]}`));
  expect(importers, "live.client imports the places chunk").toHaveLength(1);
  console.log(`places chunk ${chunks[0]}: ${(gzipSync(readFileSync(join(dir, chunks[0]!))).length / 1024).toFixed(1)} KiB gzipped`);
});
