// GET /data/map.geojson: what the map draws, as open data. CC0; each feature names its source.
import type { APIRoute } from "astro";
import { loadMapData, type MapData } from "../../lib/map/data";

export function mapGeojson({ loop, summits, orgs }: MapData) {
  return {
    type: "FeatureCollection",
    license: "CC0-1.0",
    features: [
      { type: "Feature", geometry: { type: "Polygon", coordinates: [loop.ring] }, properties: { layer: "region", name: loop.name, roads: loop.roads, note: "The Colorado Startups region, not a launch site", source: loop.source, source_url: loop.source_url } },
      ...summits.map((s) => ({ type: "Feature", geometry: { type: "Point", coordinates: s.at }, properties: { layer: "summit", name: s.summit, status: "speculative", register: s.register, claims: s.claims, source: `USGS GNIS feature ${s.gnis_id}`, source_url: s.source_url } })),
      ...orgs.map((o) => ({ type: "Feature", geometry: { type: "Point", coordinates: o.at }, properties: { layer: "org", id: o.id, name: o.name, kind: o.kind, source: o.source_url } })),
    ],
  };
}

export const GET: APIRoute = async () =>
  new Response(`${JSON.stringify(mapGeojson(await loadMapData()))}\n`, { headers: { "Content-Type": "application/geo+json; charset=utf-8" } });
