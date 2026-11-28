// The map's data: the region loop and the four toured summits from 03_deliverables/map/space_peak_map.geojson
// (made by 04_tools/space_peak_map.py), plus data/orgs. Every summit claim stays as its register row says.
import mapText from "../../../../03_deliverables/map/space_peak_map.geojson?raw";
import type { Kind } from "../orgs/kinds";
import type { Org } from "../orgs/schema";

/** The brief's ranked three, then Pikes Peak as the name and headquarters. */
export const TOUR = ["Greenhorn Mountain", "Culebra Peak", "West Spanish Peak", "Pikes Peak"] as const;

/** What a toured summit is on the tour: one of the ranked three, or the name and headquarters. */
export const roleOf = (summit: string) => (summit === TOUR.at(-1) ? "Name and headquarters" : "Summit");

type Lonlat = [number, number];
export interface MapData {
  loop: { name: string; roads: string[]; ring: Lonlat[]; source: string; source_url: string };
  summits: { summit: string; register: string; gnis_id: number; at: Lonlat; source_url: string; claims: { id: string; status: string }[] }[];
  orgs: { id: string; name: string; kind: Kind; at: Lonlat; source_url: string }[];
}
type Feature = { geometry: { type: string; coordinates: any }; properties: Record<string, any> };
const features = (JSON.parse(mapText) as { features: Feature[] }).features;

/** Pure: the same input always gives the same data, orgs sorted by id. */
export function buildMapData(orgs: readonly Org[]): MapData {
  const [r, ...more] = features.filter((f) => f.properties.layer === "region");
  if (!r || more.length || r.geometry.type !== "Polygon") throw new Error("space_peak_map.geojson: want one region Polygon");
  const { name, roads, source, source_url } = r.properties;
  const summits = TOUR.map((summit) => {
    const f = features.find((x) => x.properties.layer === "site" && x.properties.summit === summit);
    if (!f) throw new Error(`space_peak_map.geojson has no summit "${summit}"`);
    const p = f.properties;
    return { summit, register: p.register, gnis_id: p.gnis_id, at: f.geometry.coordinates, source_url: p.source_url, claims: p.claims.map(({ id, status }: { id: string; status: string }) => ({ id, status })) };
  });
  const places = orgs
    .filter((o) => o.status !== "closed")
    .map((o) => ({ id: o.id, name: o.name, kind: o.kind, at: [o.location.lon, o.location.lat] as Lonlat, source_url: o.sources.find((s) => s.id === o.location.source)!.url }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { loop: { name, roads, ring: r.geometry.coordinates[0], source, source_url }, summits, orgs: places };
}

/** At build time: the orgs collection (empty today) read through Astro. */
export async function loadMapData(): Promise<MapData> {
  const { getCollection } = await import("astro:content");
  return buildMapData((await getCollection("orgs")).map((e) => e.data));
}
