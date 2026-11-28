import type { Org } from "./schema";

// Checks across the parsed orgs that one file's schema cannot see: area, duplicates, source age.
// Source age is a guideline (issue #154): an old read is a warning, and only errors fail CI.
export const NEARBY_KM = 60;
export const MAX_AGE_DAYS = 365;

export type Ring = [number, number][];
export type Issue = { org: string; path: string; message: string; level: "error" | "warning" };
type Geo = { features: { properties?: { layer?: string }; geometry: { type: string; coordinates: unknown } }[] };

/** The rings ([lon, lat]) of the one `layer: region` polygon in the map GeoJSON. */
export function regionRings(geo: Geo): Ring[] {
  const regions = geo.features.filter((f) => f.properties?.layer === "region");
  if (regions.length !== 1 || regions[0].geometry.type !== "Polygon") throw new Error("map needs exactly one region Polygon");
  return regions[0].geometry.coordinates as Ring[];
}

/** Even-odd ray cast, so a hole ring counts as outside. */
export function insideRegion(lon: number, lat: number, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
}

/** Kilometres from a point to the region's edge, 0 inside, on a local flat projection. */
export function kmToRegion(lon: number, lat: number, rings: Ring[]): number {
  if (insideRegion(lon, lat, rings)) return 0;
  const k = (6371.0088 * Math.PI) / 180;
  const xy = ([x, y]: [number, number]) => [(x - lon) * k * Math.cos((lat * Math.PI) / 180), (y - lat) * k];
  let best = Infinity;
  for (const ring of rings)
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = xy(ring[i - 1]);
      const [bx, by] = xy(ring[i]);
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  return best;
}

const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;
const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
const urlKey = (url: string) => {
  const u = new URL(url);
  return `${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
};

/** Every problem across the orgs, each an error or a warning; a list with no errors passes. `today` is an ISO date. */
export function checkOrgs(orgs: Org[], rings: Ring[], today = new Date().toISOString().slice(0, 10)): Issue[] {
  const issues: Issue[] = [];
  const names = new Map<string, string>();
  const factUrls = new Map<string, string>();
  for (const org of orgs) {
    const add = (path: string, message: string, level: Issue["level"] = "error") => issues.push({ org: org.id, path, message, level });
    const { lat, lon } = org.location;
    if (org.area === "loop" && !insideRegion(lon, lat, rings)) add("location", "area loop, but the point is outside the region");
    if (org.area === "nearby") {
      const km = kmToRegion(lon, lat, rings);
      if (km === 0) add("area", "area nearby, but the point is inside the region: use loop");
      else if (km > NEARBY_KM) add("location", `area nearby, but the point is ${km.toFixed(1)} km out (limit ${NEARBY_KM})`);
    }
    const name = nameKey(org.name);
    if (names.has(name)) add("name", `same name as ${names.get(name)}`);
    else names.set(name, org.id);
    for (const path of ["fact", "location"] as const) {
      const source = org.sources.find((s) => s.id === org[path].source);
      if (!source) {
        add(`${path}.source`, `unknown source ${org[path].source}`);
        continue;
      }
      const age = days(source.read, today);
      if (age > MAX_AGE_DAYS) add(`${path}.source`, `${source.id} was read ${Math.floor(age)} days ago (guideline ${MAX_AGE_DAYS}); read it again`, "warning");
      if (path !== "fact") continue;
      const url = urlKey(source.url);
      if (factUrls.has(url)) add("fact.source", `same fact source URL as ${factUrls.get(url)}`);
      else factUrls.set(url, org.id);
    }
  }
  return issues;
}
