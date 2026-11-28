import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { allClaims } from "../../src/lib/claims/parse";
import { servedClaims } from "../../src/lib/claims/served";
import { buildFiles, indexJson, registerDate, SCHEMAS } from "../../src/lib/data/build";
import { orgSchema } from "../../src/lib/orgs/schema";

const dir = new URL("../fixtures/orgs/valid/", import.meta.url);
const load = (f: string) => orgSchema.parse(parse(readFileSync(new URL(f, dir), "utf8"), { customTags: ["timestamp"], schema: "core" }));
const orgs = readdirSync(dir).filter((f) => f.endsWith(".yaml")).map(load);
const date = registerDate();
const files = buildFiles(orgs, allClaims(), date);
// Fixture cells hold no line breaks, so a row is one CRLF line.
const cells = (line: string) => [...line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map((c) => c[1].replace(/^"|"$/g, "").replaceAll('""', '"'));

describe("open data files", () => {
  // CI builds before it tests, so every download the catalog offers must exist in the build.
  const dist = new URL("../../dist/", import.meta.url);
  it.runIf(existsSync(dist))("every catalog download resolves to a built file", () => {
    const urls: string[] = JSON.parse(files.get("catalog.json")!).dataset.flatMap((d: { distribution: { contentUrl: string }[] }) => d.distribution.map((x) => x.contentUrl));
    const missing = urls.map((u) => new URL(u).pathname).filter((path) => !existsSync(new URL(`.${path}`, dist)));
    expect(urls.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it.each([
    ["orgs.json", "orgs"], ["orgs.geojson", "orgs-geojson"], ["claims.json", "claims"], ["metrics.json", "metrics"], ["catalog.json", "catalog"],
  ] as const)("%s matches its schema", (path, name) => {
    expect(SCHEMAS[name].safeParse(JSON.parse(files.get(path)!)).error).toBeUndefined();
  });

  it("orgs.csv has one row per org, each matching its schema", () => {
    const [head, ...rows] = files.get("orgs.csv")!.split("\r\n").slice(0, -1).map(cells);
    expect(rows.map((r) => r[0])).toEqual(orgs.map((o) => o.id).sort());
    for (const r of rows) expect(SCHEMAS["orgs-csv-row"].safeParse(Object.fromEntries(head.map((h, i) => [h, r[i]]))).error).toBeUndefined();
  });

  it("index.json lists every file and schema, dated by the register's last commit", () => {
    const index = JSON.parse(indexJson(files, date));
    expect(SCHEMAS.index.safeParse(index).error).toBeUndefined();
    expect(index.files.map((f: { path: string }) => f.path)).toEqual([...files.keys()].map((p) => `/data/${p}`));
    expect(Object.keys(SCHEMAS).every((n) => files.has(`schemas/${n}.json`))).toBe(true);
  });

  it("builds the same bytes twice, in any org order", () => {
    const again = buildFiles([...orgs].reverse(), allClaims(), date);
    expect([...again]).toEqual([...files]);
    expect(indexJson(again, date)).toBe(indexJson(files, date));
  });

  it("builds from an empty orgs collection, as today", () => {
    const empty = buildFiles([], allClaims(), date);
    expect(SCHEMAS.orgs.parse(JSON.parse(empty.get("orgs.json")!)).orgs).toEqual([]);
    expect(JSON.parse(empty.get("metrics.json")!).claims.total).toBe(servedClaims(allClaims()).length);
  });
});
