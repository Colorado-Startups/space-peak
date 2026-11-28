// The live map, fetched only on the press: LiveMap.astro's script imports this file on the first click, and this
// file brings MapLibre. Until then, and whenever WebGL2 or the tiles fail, the drawing and the list are the map.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { BASE_STYLE, CREDITS, liveStyle, regionOf } from "./live/region";

/** The short line the status shows when the drawing stays the map. */
export const WHY = {
  webgl: "This browser has no WebGL2, so the drawing below stays the map.",
  tiles: "The map tiles did not load, so the drawing below stays the map.",
} as const;
const WAIT_MS = 20_000; // Tile hosts have no SLA: a fetch or a first draw slower than this counts as failed.

async function json(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(WAIT_MS) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** One press: open the live map in [data-live-map], or say in [data-live-status] why the drawing stays. */
export async function open(doc: Document): Promise<void> {
  const frame = doc.querySelector<HTMLElement>("[data-live-map]");
  const status = doc.querySelector<HTMLElement>("[data-live-status]");
  if (!frame || !status || frame.dataset.state) return; // Loading or open: one map a page.
  const say = (text: string) => void (status.textContent = text);
  if (!doc.createElement("canvas").getContext("webgl2")) return say(WHY.webgl);
  frame.dataset.state = "loading";
  say("Loading the live map.");
  let map: import("maplibre-gl").Map | undefined;
  let loaded = false;
  const fail = (why: string) => {
    const gone = map;
    map = undefined;
    gone?.remove();
    frame.hidden = true;
    delete frame.dataset.state;
    say(why);
  };
  let ready;
  try {
    const [maplibre, , base, fc] = await Promise.all([
      import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css"), json(BASE_STYLE), json("/data/map.geojson"),
    ]);
    const region = regionOf(fc);
    const ink = getComputedStyle(doc.documentElement).getPropertyValue("--c-community").trim();
    ready = { maplibre, region, style: liveStyle(base, region, ink) };
  } catch (err) {
    console.error(err);
    return fail(WHY.tiles);
  }
  const { maplibre, region, style } = ready;
  maplibre.setWorkerUrl(workerUrl);
  frame.hidden = false;
  try {
    map = new maplibre.Map({
      container: frame, style, bounds: region.bounds, fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: false, customAttribution: CREDITS },
    });
  } catch (err) {
    console.error(err);
    return fail(WHY.webgl);
  }
  // Relief is decoration, so a Mapterhorn miss leaves the map whole. Any other error before the first full draw ends it.
  map.on("error", (e) => {
    if (!loaded && map && (e as { sourceId?: string }).sourceId !== "sp-terrain") fail(WHY.tiles);
  });
  map.once("load", () => {
    loaded = true;
    frame.dataset.state = "open";
    say("Live map open: drag to move, pinch or scroll to zoom.");
  });
  setTimeout(() => map && !loaded && fail(WHY.tiles), WAIT_MS);
}
