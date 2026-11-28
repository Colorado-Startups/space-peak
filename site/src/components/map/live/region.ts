// The live map's style, pure so test/unit/map-live.test.ts runs it with no browser: OpenFreeMap's Positron base,
// Mapterhorn relief, and the region loop from /data/map.geojson, the open data the drawing is made from.
import type { MapOptions } from "maplibre-gl";

type Style = Exclude<MapOptions["style"], string | undefined>;
type Feature = { type?: string; geometry: { type: string; coordinates: any }; properties: Record<string, any> };
export type Region = { feature: Feature; bounds: [[number, number], [number, number]]; credit: string };

/** OpenFreeMap's light style (openfreemap.org/quick_start, read 2026-11-27). Its TileJSON credits OpenMapTiles. */
export const BASE_STYLE = "https://tiles.openfreemap.org/styles/positron";
/** tiles.mapterhorn.com/tilejson.json and mapterhorn.com/data-access (read 2026-11-27): terrarium WebP, 512 px, z12 worldwide. */
export const TERRAIN: Style["sources"][string] = {
  type: "raster-dem", tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"], encoding: "terrarium", tileSize: 512, maxzoom: 12,
  attribution: "<a href='https://mapterhorn.com/attribution'>© Mapterhorn</a>",
};
/**
 * Every base-map credit, carried here so the map shows it whatever a host serves. OpenFreeMap's line matches its
 * TileJSON's attribution exactly (tiles.openfreemap.org/backup_planet, read 2026-11-27), so MapLibre shows it once.
 * OpenStreetMap's own wording is from openstreetmap.org/copyright. TERRAIN and the region source add their own.
 */
export const CREDITS = [
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
  '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
  '<a href="https://maplibre.org/">MapLibre</a>',
];

/** The one region polygon in map.geojson, its bounding box and its credit line. */
export function regionOf(fc: { features: Feature[] }): Region {
  const found = fc.features.filter((f) => f.properties.layer === "region" && f.geometry.type === "Polygon");
  if (found.length !== 1) throw new Error(`map.geojson: want one region Polygon, found ${found.length}`);
  const feature = found[0]!;
  const ring = feature.geometry.coordinates[0] as [number, number][];
  const [lons, lats] = [ring.map((p) => p[0]), ring.map((p) => p[1])];
  const url = String(feature.properties.source_url);
  if (!/^https:\/\/[^\s"'<>]+$/.test(url)) throw new Error(`map.geojson: region source_url is not a plain https URL: ${url}`);
  return { feature, bounds: [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], credit: `<a href="${url}">Region: coloradostartups.org</a>` };
}

/** The base style plus relief above its fills and the region under its labels, in `ink`. The base is not changed. */
export function liveStyle(base: Style, region: Region, ink: string): Style {
  const first = (types: string[]) => {
    const i = base.layers.findIndex((l) => types.includes(l.type));
    return i < 0 ? base.layers.length : i;
  };
  const [relief, labels] = [first(["line", "symbol"]), first(["symbol"])];
  const own: Style["layers"] = [
    { id: "sp-region-fill", type: "fill", source: "sp-region", paint: { "fill-color": ink, "fill-opacity": 0.18 } },
    { id: "sp-region-line", type: "line", source: "sp-region", layout: { "line-join": "round" }, paint: { "line-color": ink, "line-width": 3 } },
  ];
  return {
    ...base,
    sources: { ...base.sources, "sp-terrain": TERRAIN, "sp-region": { type: "geojson", data: region.feature as any, attribution: region.credit } },
    layers: [
      ...base.layers.slice(0, relief),
      { id: "sp-relief", type: "hillshade", source: "sp-terrain", paint: { "hillshade-exaggeration": 0.35 } },
      ...base.layers.slice(relief, labels),
      ...own,
      ...base.layers.slice(labels),
    ],
  };
}
