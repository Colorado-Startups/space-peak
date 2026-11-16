import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { checkOrgs, insideRegion, kmToRegion, MAX_AGE_DAYS, regionRings, type Ring } from "../../src/lib/orgs/check";
import { checkFileId, type Org, orgSchema } from "../../src/lib/orgs/schema";

const root = new URL("../../../", import.meta.url);
const fixtures = new URL("site/test/fixtures/orgs/", root);
const real = new URL("data/orgs/", root);
// The options Astro's YAML loader uses, as in orgs-schema.test.ts.
const load = (url: URL) => parse(readFileSync(url, "utf8"), { customTags: ["timestamp"], merge: true, schema: "core" });
const rings = regionRings(JSON.parse(readFileSync(new URL("03_deliverables/map/space_peak_map.geojson", root), "utf8")));
const base = load(new URL("valid/example-command.yaml", fixtures));
type Case = { name: string; passes?: boolean; fails?: string; orgs: Record<string, unknown>[] };
const cases: Case[] = load(new URL("check-cases.yaml", fixtures));
const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
// A fixture org goes through the schema, unless it has an unknown source, which the schema also rejects.
const build = (patch: Record<string, unknown>) => {
  const sources = (patch.sources ?? base.sources) as { read: unknown }[];
  const org = { ...base, ...patch, sources: sources.map((s) => ({ ...s, read: iso(s.read) })) };
  return (orgSchema.safeParse(org).data ?? org) as Org;
};

describe("orgs checker", () => {
  it.each(cases)("$name", ({ passes, fails, orgs }) => {
    const issues = checkOrgs(orgs.map(build), rings, "2026-11-16");
    if (passes) expect(issues).toEqual([]);
    else expect(issues.filter((i) => i.org === (orgs.at(-1)?.id ?? base.id)).map((i) => i.path)).toContain(fails);
  });

  it("allows a source read exactly the limit ago", () => {
    const org = build({ sources: [{ id: "example-page", url: "https://example.org/command", publisher: "P", read: "2025-11-16" }] });
    expect(MAX_AGE_DAYS).toBe(365);
    expect(checkOrgs([org], rings, "2026-11-16")).toEqual([]);
  });

  it("treats a hole ring as outside", () => {
    const square: Ring = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
    const hole: Ring = [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]];
    expect(insideRegion(0.5, 0.5, [square, hole])).toBe(true);
    expect(insideRegion(2, 2, [square, hole])).toBe(false);
    expect(kmToRegion(2, 2, [square, hole])).toBeCloseTo(111.2, 0);
  });

  it("refuses a map without exactly one region polygon", () => {
    expect(() => regionRings({ features: [] })).toThrow(/exactly one region/);
  });

  it("passes the real data/orgs folder", () => {
    const files = readdirSync(real).filter((f) => !f.startsWith("."));
    const orgs = files.map((f) => {
      const data = load(new URL(f, real));
      checkFileId(f, data);
      return orgSchema.parse(data);
    });
    expect(checkOrgs(orgs, rings)).toEqual([]);
  });
});
