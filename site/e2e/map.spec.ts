// Step 27 (issue #122): the live map on /map/ loads only on press, and the drawing and list stay the map without it.
// Tile hosts have no SLA, so no test reaches them. The size test walks dist/ as Git Crafter's
// quality/collectors/code/code-client.mjs does for code.client_js_kb, with backtick specifiers followed too.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = join(import.meta.dirname, "..", "dist");
const BUDGET_KIB = 307; // code.client_js_kb's goal (Git Crafter code-os #120).
const MAP_CODE = /maplibre|live\.client|tiles\.openfreemap\.org|tiles\.mapterhorn\.com|\/data\/map\.geojson/;
// Vector tiles come from the test server, which answers 404, and MapLibre reads a 404 as no data. The stub carries
// no attribution, so every credit the test finds comes from the site's own code.
const STYLE = (origin: string) => ({
  version: 8,
  sources: { openmaptiles: { type: "vector", tiles: [`${origin}/no-tiles/{z}/{x}/{y}.pbf`], maxzoom: 14 } },
  layers: [{ id: "background", type: "background" }, { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water" }],
});
// SwiftShader gives headless Chromium a software WebGL2 on a CI runner with no GPU.
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] } });

const ORIGIN = () => new URL(String(test.info().project.use.baseURL)).origin;

// For the tests that never draw a map: the tile hosts are routed, and down means every request aborts.
async function tiles(page: Page, up = true): Promise<string[]> {
  await page.context().route(/^https:\/\/tiles\.(openfreemap\.org|mapterhorn\.com)\//, (route) => {
    if (!up) return route.abort();
    if (route.request().url().endsWith("/styles/positron")) return route.fulfill({ json: STYLE(ORIGIN()) });
    return route.fulfill({ status: 404 });
  });
  const seen: string[] = [];
  page.on("request", (r) => seen.push(r.url()));
  return seen;
}
// For the test that draws one: with routes on, the map never reached its first full draw in CI and logged no error
// (runs 46097037327 and 46099126170). MapLibre's worker fetches the vector tiles, so nothing is routed here: the
// page's own fetch answers OpenFreeMap's style and Mapterhorn's relief (404, no data), and the test server the tiles.
async function fakeHosts(page: Page): Promise<void> {
  await page.addInitScript((style) => {
    const real = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith("https://tiles.openfreemap.org/styles/")) return Promise.resolve(Response.json(style));
      if (url.startsWith("https://tiles.mapterhorn.com/")) return Promise.resolve(new Response(null, { status: 404 }));
      return real(input, init);
    }) as typeof fetch;
  }, STYLE(ORIGIN()));
}
const press = (page: Page) => page.getByRole("button", { name: "Open the live map" }).click();

async function drawingAndListStay(page: Page): Promise<void> {
  await expect(page.locator("figure.space-map")).toHaveCount(2);
  for (const fig of await page.locator("figure.space-map").all()) await expect(fig.locator('[data-layer="loop"]')).toBeVisible();
  await expect(page.locator("#places li")).not.toHaveCount(0);
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.locator("[data-live-map]")).toBeHidden();
}

test("nothing map-related downloads before the press", async ({ page }) => {
  const seen = await tiles(page);
  await page.goto("/map/");
  await page.waitForLoadState("networkidle");
  expect(seen.filter((u) => MAP_CODE.test(u))).toEqual([]);
  const css = await page.evaluate(() => [...document.styleSheets].some((s) => [...s.cssRules].some((r) => r.cssText.includes("maplibregl"))));
  expect(css, "MapLibre's CSS is on the page before the press").toBe(false);
  await expect(page.locator("[data-live-map]")).toBeHidden();
});

test("the press loads MapLibre and draws the region over the tiles, with every credit", async ({ page }) => {
  test.setTimeout(90_000); // A software renderer on a shared runner.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const hosts: string[] = [];
  page.context().on("request", (r) => void (/^https:\/\/tiles\./.test(r.url()) && hosts.push(r.url())));
  await fakeHosts(page);
  await page.goto("/map/");
  const chunk = page.waitForRequest(/\/maplibre-gl[^/]*\.js$/);
  await press(page);
  await chunk;
  const frame = page.locator('[data-live-map][data-state="open"]');
  const status = page.locator("[data-live-status]");
  await expect(frame, "the map reached its first full draw").toBeVisible({ timeout: 60_000 });
  await expect(frame.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(frame, "the region and relief layers are on the live map").toHaveAttribute("data-layers", "sp-relief sp-region-fill sp-region-line");
  await expect(frame, "the region drew once the map was idle").toHaveAttribute("data-region-features", /^[1-9]\d*$/, { timeout: 30_000 });
  const credits = frame.locator(".maplibregl-ctrl-attrib");
  for (const name of ["OpenStreetMap contributors", "OpenMapTiles", "OpenFreeMap", "Mapterhorn", "Region: coloradostartups.org"]) await expect(credits).toContainText(name);
  await expect(status).toContainText("Live map open");
  expect(errors).toEqual([]);
  expect(hosts, "the tile hosts were reached over the network").toEqual([]);
});

test("with no WebGL2 the press keeps the drawing and the list, says why, and fetches no MapLibre", async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type === "webgl2" ? null : get.call(this, type as "2d", ...(rest as []));
    } as typeof get;
  });
  const seen = await tiles(page);
  await page.goto("/map/");
  await press(page);
  await expect(page.locator("[data-live-status]")).toHaveText("This browser has no WebGL2, so the drawing below stays the map.");
  await drawingAndListStay(page);
  expect(seen.filter((u) => /maplibre|tiles\./.test(u))).toEqual([]);
});

test("when the tiles fail the press keeps the drawing and the list, and says why", async ({ page }) => {
  await tiles(page, false);
  await page.goto("/map/");
  await press(page);
  await expect(page.locator("[data-live-status]")).toHaveText("The map tiles did not load, so the drawing below stays the map.");
  await drawingAndListStay(page);
});

test(`the map page's client JS, every import it can reach, is ${BUDGET_KIB} KiB gzipped or less`, () => {
  const html = readFileSync(join(DIST, "map", "index.html"), "utf8");
  const entries = [
    ...[...html.matchAll(/<script\b[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]!),
    ...[...html.matchAll(/<link\b[^>]*>/g)].filter((m) => /\brel="modulepreload"/.test(m[0])).map((m) => /\bhref="(\/[^"]+)"/.exec(m[0])?.[1] ?? ""),
  ].filter(Boolean);
  const seen = new Set<string>();
  const queue = entries.map((s) => join(DIST, s.split(/[?#]/)[0]!));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, "utf8").matchAll(/(?:import|from)\s*\(?\s*["'`](\.{1,2}\/[^"'`]+\.js)["'`]/g)) queue.push(resolve(dirname(file), m[1]!));
  }
  const kib = (files: string[]) => files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0) / 1024;
  const js = [...seen];
  expect(js.some((f) => /maplibre-gl[^/]*\.js$/.test(f)), "the walk reaches MapLibre's chunk").toBe(true);
  const worker = readdirSync(join(DIST, "_astro")).filter((f) => /^maplibre-gl-worker.*\.mjs$/.test(f)).map((f) => join(DIST, "_astro", f));
  expect(worker, "the worker ships beside the chunks").toHaveLength(1);
  console.log(`/map/ client JS: ${kib(js).toFixed(1)} KiB gzipped over ${js.length} files; the worker, fetched on press: ${kib(worker).toFixed(1)} KiB`);
  expect(kib(js)).toBeLessThanOrEqual(BUDGET_KIB);
});
