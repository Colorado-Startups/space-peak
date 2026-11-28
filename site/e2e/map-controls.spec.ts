// Step 29 (issue #147): the live map's controls work by keyboard alone, the terrain toggle flips terrain, and the
// opening flies from the globe to the region once, or never under reduced motion. The tile hosts are faked in the
// page's own fetch, as e2e/map.spec.ts's drawing test does, so no test reaches them.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { FLY_MS } from "../src/components/map/live/controls";
import { regionOf } from "../src/components/map/live/region";

const DIST = join(import.meta.dirname, "..", "dist");
const BUDGET_KIB = 307; // code.client_js_kb's goal, shared with e2e/map.spec.ts.
const STYLE = (origin: string) => ({
  version: 8,
  sources: { openmaptiles: { type: "vector", tiles: [`${origin}/no-tiles/{z}/{x}/{y}.pbf`], maxzoom: 14 } },
  layers: [{ id: "background", type: "background" }, { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water" }],
});
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] } });

type Camera = { lng: number; lat: number; zoom: number };
const parse = (text: string): Camera => {
  const [lng = NaN, lat = NaN, zoom = NaN] = text.split(" ").map(Number);
  return { lng, lat, zoom };
};
const camera = async (frame: Locator) => parse((await frame.getAttribute("data-camera")) ?? "");

// The press and every control after it, by Tab and Enter only. Resolves with each camera the map reported, in order,
// once the map is open and idle; the region's bounding box comes from the same /data/map.geojson the map reads.
async function openByKeyboard(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
  await page.evaluate(() => {
    const frame = document.querySelector("[data-live-map]")!;
    const seen: string[] = ((window as unknown as { cameras: string[] }).cameras = []);
    new MutationObserver(() => seen.push(frame.getAttribute("data-camera") ?? "")).observe(frame, { attributeFilter: ["data-camera"] });
  });
  await page.getByRole("button", { name: "Open the live map" }).focus();
  await page.keyboard.press("Enter");
  const frame = page.locator('[data-live-map][data-state="open"]');
  await expect(frame, "the map reached its first full draw").toBeVisible({ timeout: 60_000 });
  await expect(frame, "the map went idle").toHaveAttribute("data-region-features", /^\d+$/, { timeout: 30_000 });
  await expect(frame).toHaveAttribute("data-projection", "globe");
  const cameras = (await page.evaluate(() => (window as unknown as { cameras: string[] }).cameras)).map(parse);
  const [[w, s], [e, n]] = regionOf(await (await page.request.get("/data/map.geojson")).json()).bounds;
  const onRegion = (c: Camera) => c.zoom > 5 && c.lng > w && c.lng < e && c.lat > s && c.lat < n;
  return { frame, cameras, onRegion, errors };
}

// Presses Tab until the control named `name` has focus.
async function tabTo(page: Page, name: string): Promise<void> {
  const focused = () => page.evaluate((n) => document.activeElement?.getAttribute("aria-label") === n, name);
  for (let i = 0; i < 40 && !(await focused()); i++) await page.keyboard.press("Tab");
  expect(await focused(), `Tab reaches "${name}"`).toBe(true);
}

const PAD: [string, (before: Camera, after: Camera) => boolean][] = [
  ["Move north", (a, b) => b.lat > a.lat],
  ["Move west", (a, b) => b.lng < a.lng],
  ["Move east", (a, b) => b.lng > a.lng],
  ["Move south", (a, b) => b.lat < a.lat],
  ["Zoom in", (a, b) => b.zoom > a.zoom],
  ["Zoom out", (a, b) => b.zoom < a.zoom],
];

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the map opens on the region with no flight, and every control works by keyboard", async ({ page }) => {
    test.setTimeout(120_000); // A software renderer on a shared runner.
    const { frame, cameras, onRegion, errors } = await openByKeyboard(page);
    expect(cameras.length, "the map reported its camera").toBeGreaterThan(0);
    expect(cameras.every(onRegion), `every camera before the first press is the region: ${JSON.stringify(cameras)}`).toBe(true);
    for (const [name, moved] of PAD) {
      await tabTo(page, name);
      const before = await camera(frame);
      await page.keyboard.press("Enter");
      await expect.poll(async () => moved(before, await camera(frame)), `${name} moves the camera its way`).toBe(true);
    }
    const toggle = page.getByRole("button", { name: "3D terrain" });
    await tabTo(page, "3D terrain");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(frame, "the map has terrain").toHaveAttribute("data-terrain", "on");
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(frame, "the map has no terrain").toHaveAttribute("data-terrain", "off");
    expect(errors).toEqual([]);
  });
});

test("the map opens on the globe and flies once to the region", async ({ page }) => {
  test.setTimeout(120_000);
  if (FLY_MS > 1500) console.warn(`The opening flight is ${FLY_MS} ms, over the 1,500 ms guideline`);
  const { cameras, onRegion, errors } = await openByKeyboard(page);
  expect(cameras[0]?.zoom, `the first camera is the whole globe: ${JSON.stringify(cameras)}`).toBeLessThan(3);
  const landed = cameras.findIndex(onRegion);
  expect(landed, `the flight ends on the region: ${JSON.stringify(cameras)}`).toBeGreaterThan(0);
  expect(cameras.slice(landed).every(onRegion), "one flight: once on the region, the camera stays there").toBe(true);
  expect(errors).toEqual([]);
});

test(`the controls ship in the press's chunks, and /map/ stays within ${BUDGET_KIB} KiB of client JS`, () => {
  const html = readFileSync(join(DIST, "map", "index.html"), "utf8");
  const queue = [...html.matchAll(/<script\b[^>]*\bsrc="(\/[^"]+)"|<link\b[^>]*\brel="modulepreload"[^>]*\bhref="(\/[^"]+)"/g)]
    .map((m) => join(DIST, (m[1] ?? m[2])!.split(/[?#]/)[0]!));
  const seen = new Set<string>();
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, "utf8").matchAll(/(?:import|from)\s*\(?\s*["'`](\.{1,2}\/[^"'`]+\.js)["'`]/g)) queue.push(resolve(dirname(file), m[1]!));
  }
  const js = [...seen].map((f) => readFileSync(f));
  expect(js.some((b) => b.includes("sp-controls")), "the walk from /map/ reaches the controls").toBe(true);
  const kib = js.reduce((total, b) => total + gzipSync(b).length, 0) / 1024;
  console.log(`/map/ client JS with the controls: ${kib.toFixed(1)} KiB gzipped over ${js.length} files`);
  expect(kib).toBeLessThanOrEqual(BUDGET_KIB);
});
