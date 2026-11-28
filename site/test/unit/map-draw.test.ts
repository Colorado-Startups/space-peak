import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { buildMapData, TOUR } from "../../src/lib/map/data";
import { drawMap, frame, narrowBand, VIEWS, type View } from "../../src/lib/map/draw";
import { orgSchema, type Org } from "../../src/lib/orgs/schema";
import { mapGeojson } from "../../src/pages/data/map.geojson";

const load = (f: string) => orgSchema.parse(parse(readFileSync(new URL(`../fixtures/orgs/valid/${f}`, import.meta.url), "utf8"), { customTags: ["timestamp"] }));
const company = load("example-startup.yaml");
const institution: Org = { ...company, id: "example-lab", kind: "institution", subkind: "lab", location: { ...company.location, lat: 38.9 } };
const orgs = [company, institution, load("example-command.yaml")];
const views = Object.keys(VIEWS) as View[];

describe("map data and drawing", () => {
  it("draws the region loop as one closed ring of the five roads", () => {
    const { loop } = buildMapData([]);
    expect(loop.roads).toEqual(["I-25", "Interquest Pkwy", "Powers Blvd", "Mesa Ridge Pkwy", "US-85"]);
    expect([loop.ring.length > 100, loop.ring.at(0)]).toEqual([true, loop.ring.at(-1)]);
    for (const v of views) expect(drawMap(buildMapData([]), v).match(/data-layer="loop"/g)).toHaveLength(1);
  });
  it("draws only the four toured summits, each an open triangle with its name; the page says speculative", () => {
    expect(buildMapData([]).summits.map((s) => s.summit)).toEqual([...TOUR]);
    const svg = drawMap(buildMapData([]), "south");
    const groups = svg.match(/<g data-layer="summit".*?<\/g>/g) ?? [];
    expect(groups).toHaveLength(4);
    groups.forEach((g, i) => expect(g).toMatch(new RegExp(`fill="none".*>${TOUR[i]}<`)));
    for (const v of views) expect(drawMap(buildMapData([]), v)).not.toMatch(/speculative/i);
    for (const other of ["Almagre", "Blanca", "Crestone"]) expect(svg).not.toContain(other);
    expect(drawMap(buildMapData([]), "region")).toContain(">Pikes Peak<");
  });
  it("draws an empty orgs collection, and each kind in its own shape and colour", () => {
    expect(buildMapData([]).orgs).toEqual([]); // data/orgs is empty today, and the map still draws
    const svg = drawMap(buildMapData(orgs), "region");
    expect(svg).toMatch(/<rect [^>]*fill="#0054A2"[^>]*data-kind="command_base"/);
    expect(svg).toMatch(/<path [^>]*fill="#245D38"[^>]*data-kind="institution"/);
    expect(svg).toMatch(/<circle [^>]*fill="#6D3A5D"[^>]*data-kind="company"/);
  });
  it("has a title and desc, and text only at 15 and 18 px", () => {
    for (const v of views) {
      const svg = drawMap(buildMapData(orgs), v);
      expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 800 \d+"[^>]*><title id="map-title">[^<]+<\/title><desc id="map-desc">[^<]+<\/desc>/);
      for (const size of svg.match(/font-size="\d+"/g) ?? []) expect(['font-size="15"', 'font-size="18"']).toContain(size);
    }
  });
  it("gives identical output on two builds", async () => {
    const first = views.map((v) => drawMap(buildMapData(orgs), v));
    vi.resetModules();
    const [d, m] = await Promise.all([import("../../src/lib/map/data"), import("../../src/lib/map/draw")]);
    expect(views.map((v) => m.drawMap(d.buildMapData([...orgs].reverse()), v))).toEqual(first);
  });
  it("publishes CC0 GeoJSON with a source on every feature", () => {
    const g = mapGeojson(buildMapData(orgs));
    expect([g.license, g.features.length]).toEqual(["CC0-1.0", 8]);
    for (const f of g.features) expect(f.properties.source).toBeTruthy();
  });
});

// Issue #194: a frame narrower than the drawing hides the empty band on its open side, so it opens on what it shows.
describe("a frame narrower than the drawing", () => {
  const PHONE = 341; // The frame's inner width on a 375 px screen, in user units: the drawing shows at 50rem for 800.
  /** The x range a phone's frame shows first: the band at the open side hidden, the rest a scroll away. */
  const firstView = (data: ReturnType<typeof buildMapData>, view: View): [number, number] => {
    const band = narrowBand(data, view);
    return VIEWS[view].open === "east" ? [VIEWS[view].width - band - PHONE, VIEWS[view].width - band] : [band, band + PHONE];
  };
  const within = ([lo, hi]: [number, number], ...xs: number[]) => xs.every((x) => x >= lo && x <= hi);

  it("opens the region on its loop and its orgs, and the tour on its summits", () => {
    const data = buildMapData(orgs);
    const region = frame("region");
    const seen = firstView(data, "region");
    expect(within(seen, ...data.loop.ring.map((p) => region.xy(p)[0]))).toBe(true);
    expect(within(seen, ...data.orgs.filter((o) => region.inside(o.at)).flatMap((o) => [region.xy(o.at)[0] - 8, region.xy(o.at)[0] + 8]))).toBe(true);
    const south = frame("south");
    expect(within(firstView(data, "south"), ...data.summits.flatMap((s) => [south.xy(s.at)[0] - 8, south.xy(s.at)[0] + 8]))).toBe(true);
  });
  it("hides nothing drawn: an org in the empty band narrows the band to it", () => {
    const at = (id: string, lon: number, lat: number): Org => ({ ...company, id, location: { ...company.location, lon, lat } });
    const [region, south] = [frame("region"), frame("south")];
    // An org at region x 700 and one at tour x 100: 800 - 708 and 92, less the 16-unit margin, leave a band of 76.
    const near = buildMapData([...orgs, at("near-east", -104.625, 38.8), at("near-west", -105.675, 37.5)]);
    expect(region.xy(near.orgs.find((o) => o.id === "near-east")!.at)[0]).toBeCloseTo(700, 6);
    expect(south.xy(near.orgs.find((o) => o.id === "near-west")!.at)[0]).toBeCloseTo(100, 6);
    for (const v of views) expect(Math.abs(narrowBand(near, v) - 76), v).toBeLessThanOrEqual(1);
    // An org at the drawing's very edge leaves no empty band, so the band clamps to 0.
    const edge = buildMapData([...orgs, at("far-east", -104.56, 38.8), at("far-west", -105.85, 37.5)]);
    expect([narrowBand(edge, "region"), narrowBand(edge, "south")]).toEqual([0, 0]);
  });
  it("tags the credit line, which an east frame moves in from the hidden band", () => {
    for (const v of views) expect(drawMap(buildMapData([]), v).match(/<text [^>]*data-layer="credit"[^>]*>Summits: USGS GNIS/g)).toHaveLength(1);
  });
});
