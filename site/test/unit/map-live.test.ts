import { describe, expect, it } from "vitest";
import { CREDITS, liveStyle, regionOf, TERRAIN } from "../../src/components/map/live/region";
import { buildMapData } from "../../src/lib/map/data";
import { mapGeojson } from "../../src/pages/data/map.geojson";

// The live map reads /data/map.geojson; e2e/map.spec.ts covers it in a browser.
const data = buildMapData([]);
const fc = JSON.parse(JSON.stringify(mapGeojson(data)));
const base: Parameters<typeof liveStyle>[0] = {
  version: 8,
  sources: { openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
  layers: [
    { id: "background", type: "background" },
    { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water" },
    { id: "road", type: "line", source: "openmaptiles", "source-layer": "transportation" },
    { id: "label", type: "symbol", source: "openmaptiles", "source-layer": "place" },
  ],
};

describe("live map style", () => {
  it("takes the region from /data/map.geojson: the ring the drawing draws, its box and its credit", () => {
    const region = regionOf(fc);
    expect(region.feature.geometry.coordinates[0]).toEqual(data.loop.ring);
    const [lons, lats] = [data.loop.ring.map((p) => p[0]), data.loop.ring.map((p) => p[1])];
    expect(region.bounds).toEqual([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]]);
    expect(region.credit).toBe(`<a href="${data.loop.source_url}">Region: coloradostartups.org</a>`);
    expect(() => regionOf({ features: [] })).toThrow(/want one region Polygon, found 0/);
  });

  it("puts Mapterhorn relief above the fills and the region under the labels, leaving the base alone", () => {
    const before = JSON.stringify(base);
    const style = liveStyle(base, regionOf(fc), "#35647E");
    expect(style.layers.map((l) => l.id)).toEqual(["background", "water", "sp-relief", "road", "sp-region-fill", "sp-region-line", "label"]);
    expect(style.sources["sp-terrain"]).toBe(TERRAIN);
    expect(TERRAIN).toMatchObject({ type: "raster-dem", encoding: "terrarium", tileSize: 512, attribution: expect.stringContaining("Mapterhorn") });
    expect(style.sources["sp-region"]).toMatchObject({ type: "geojson", attribution: regionOf(fc).credit });
    expect(JSON.stringify(base)).toBe(before);
  });

  it("carries every base-map credit itself, whatever a host's TileJSON says", () => {
    for (const name of ["OpenFreeMap", "OpenMapTiles", "OpenStreetMap contributors", "MapLibre"]) expect(CREDITS.join(" ")).toContain(name);
  });
});
