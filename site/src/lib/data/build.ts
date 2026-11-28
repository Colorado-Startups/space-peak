// The /data/ files from the orgs and the claims register. Pure: the same inputs give the same bytes.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { z } from "zod";
import { type ClaimRow, STATUSES as CLAIM_STATUSES } from "../claims/parse";
import { servedClaims } from "../claims/served";
import { CITIES, KINDS, PRECISIONS, STATUSES } from "../orgs/kinds";
import { type Org, orgSchema } from "../orgs/schema";

export const SITE = "https://spacepeak.co";
export const LICENSE = "https://creativecommons.org/publicdomain/zero/1.0/";
const META = { generated: z.iso.date(), license: z.literal(LICENSE) };
const str = z.string();
const counts = (keys: readonly string[]) => z.strictObject(Object.fromEntries(keys.map((k) => [k, z.int().min(0)])));
const CSV_COLUMNS = ["id", "name", "kind", "subkind", "city", "area", "status", "lat", "lon", "precision", "summary", "fact", "source"] as const;
const feature = z.strictObject({
  type: z.literal("Feature"),
  geometry: z.strictObject({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.strictObject({ id: str, name: str, kind: z.enum(KINDS), subkind: str, city: z.enum(CITIES), status: z.enum(STATUSES), precision: z.enum(PRECISIONS), source: z.url() }),
});
const dataset = z.strictObject({
  "@type": z.literal("Dataset"), name: str, description: str.min(50).max(5000), url: z.url(), license: z.literal(LICENSE),
  isAccessibleForFree: z.literal(true), dateModified: z.iso.date(),
  distribution: z.array(z.strictObject({ "@type": z.literal("DataDownload"), contentUrl: z.url(), encodingFormat: str })).min(1),
});

/** One zod schema per file; /data/schemas/<name>.json is its JSON Schema. */
export const SCHEMAS = {
  orgs: z.strictObject({ ...META, orgs: z.array(orgSchema) }),
  "orgs-csv-row": z.strictObject(Object.fromEntries(CSV_COLUMNS.map((c) => [c, str]))),
  "orgs-geojson": z.strictObject({ type: z.literal("FeatureCollection"), license: z.literal(LICENSE), features: z.array(feature) }),
  claims: z.strictObject({
    ...META,
    claims: z.array(z.strictObject({ id: str, series: str, section: str, site: str.optional(), claim: str, status: z.enum(CLAIM_STATUSES), source: str, notes: str })),
  }),
  metrics: z.strictObject({
    ...META,
    orgs: z.strictObject({ total: z.int().min(0), by_kind: counts(KINDS), by_city: counts(CITIES) }),
    claims: z.strictObject({ total: z.int().min(0), by_status: counts(CLAIM_STATUSES) }),
  }),
  catalog: z.strictObject({
    "@context": z.literal("https://schema.org"), "@type": z.literal("DataCatalog"), name: str, description: str,
    url: z.url(), license: z.literal(LICENSE), dateModified: z.iso.date(), dataset: z.array(dataset),
  }),
  index: z.strictObject({ ...META, files: z.array(z.strictObject({ path: str, mediaType: str, schema: z.url(), sha256: str.regex(/^[0-9a-f]{64}$/) })) }),
};
type SchemaName = keyof typeof SCHEMAS;
const schemaUrl = (name: string) => `${SITE}/data/schemas/${name}.json`;
const jsonSchema = (name: SchemaName) => ({ ...z.toJSONSchema(SCHEMAS[name], { io: "output", unrepresentable: "any" }), $id: schemaUrl(name) });

/** The register's last commit date (YYYY-MM-DD), so two builds of one commit match. No clock is read. */
export function registerDate(register = "../02_substance/claims_register.md"): string {
  const date = execFileSync("git", ["log", "-1", "--format=%cs", "--", register], { encoding: "utf8" }).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`no git commit date for ${register}`);
  return date;
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const tally = (keys: readonly string[], values: string[]) => Object.fromEntries(keys.map((k) => [k, values.filter((v) => v === k).length]));
const sourceUrl = (org: Org, id: string) => org.sources.find((s) => s.id === id)!.url;
const TYPES: Record<string, string> = { json: "application/json", csv: "text/csv", geojson: "application/geo+json" };
/** The media type a /data/ file is served with, by its extension. */
export const mediaType = (path: string) => TYPES[path.split(".").pop()!];
const FILE_SCHEMA: Record<string, SchemaName> = { "orgs.csv": "orgs-csv-row", "orgs.geojson": "orgs-geojson" };
const schemaFor = (path: string) =>
  path.startsWith("schemas/") ? "https://json-schema.org/draft/2020-12/schema" : schemaUrl(FILE_SCHEMA[path] ?? path.replace(/\.json$/, ""));
const DATASETS: [name: string, paths: string[], description: string][] = [
  ["Space Peak organisations", ["orgs.json", "orgs.csv", "orgs.geojson"],
    "Command bases, institutions and companies in the Colorado Springs region that Space Peak features. Each has a kind, a city, a located point with its precision, one sourced fact and its sources."],
  ["Space Peak claims register", ["claims.json"],
    "The factual claims the Space Peak thesis makes about a peak or the region, each with its review status, source and notes. They are read from 02_substance/claims_register.md, which wins over this copy."],
  ["Space Peak metrics", ["metrics.json"],
    "Counts derived from the other datasets: organisations by kind and by city, and claims by review status. Every kind, city and status appears, with zero where none exist yet."],
  ["Space Peak map layer", ["map.geojson"],
    "The GeoJSON layer the spacepeak.co map draws, as points with the properties the map shows. It is listed here so the catalog names every open file."],
];

/** The schema.org DataCatalog that catalog.json serves; the /ai/ page (step 43) embeds it as JSON-LD. */
export const catalog = (generated: string) => ({
  "@context": "https://schema.org", "@type": "DataCatalog", name: "Space Peak open data", description: "Open data behind spacepeak.co, free to reuse under CC0.",
  url: `${SITE}/data/catalog.json`, license: LICENSE, dateModified: generated,
  dataset: DATASETS.map(([name, paths, description]) => ({
    "@type": "Dataset", name, description, url: `${SITE}/data/${paths[0]}`, license: LICENSE, isAccessibleForFree: true, dateModified: generated,
    distribution: paths.map((p) => ({ "@type": "DataDownload", contentUrl: `${SITE}/data/${p}`, encodingFormat: mediaType(p) })),
  })),
});

/** Every file under /data/ except map.geojson and index.json: path to body. The claims are the rows servedClaims keeps. */
export function buildFiles(orgsIn: Org[], register: ClaimRow[], generated: string): Map<string, string> {
  const orgs = [...orgsIn].sort((a, b) => a.id.localeCompare(b.id));
  const claims = servedClaims(register);
  const meta = { generated, license: LICENSE };
  const csv = orgs.map((o) => {
    const row = { ...o, lat: String(o.location.lat), lon: String(o.location.lon), precision: o.location.precision, fact: o.fact.text, source: sourceUrl(o, o.fact.source) };
    return CSV_COLUMNS.map((c) => csvCell(row[c]));
  });
  const features = orgs.map((o) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [o.location.lon, o.location.lat] },
    properties: { id: o.id, name: o.name, kind: o.kind, subkind: o.subkind, city: o.city, status: o.status, precision: o.location.precision, source: sourceUrl(o, o.location.source) },
  }));
  const files = new Map<string, string>([
    ["orgs.json", json({ ...meta, orgs })],
    ["orgs.csv", [CSV_COLUMNS, ...csv].map((r) => `${r.join(",")}\r\n`).join("")],
    ["orgs.geojson", json({ type: "FeatureCollection", license: LICENSE, features })],
    ["claims.json", json({ ...meta, claims })],
    ["metrics.json", json({
      ...meta,
      orgs: { total: orgs.length, by_kind: tally(KINDS, orgs.map((o) => o.kind)), by_city: tally(CITIES, orgs.map((o) => o.city)) },
      claims: { total: claims.length, by_status: tally(CLAIM_STATUSES, claims.map((c) => c.status)) },
    })],
    ["catalog.json", json(catalog(generated))],
  ]);
  for (const name of Object.keys(SCHEMAS) as SchemaName[]) files.set(`schemas/${name}.json`, json(jsonSchema(name)));
  return files;
}

/** The manifest: every built file with its media type, JSON Schema and sha256. */
export const indexJson = (files: Map<string, string>, generated: string) =>
  json({
    generated, license: LICENSE,
    files: [...files].map(([path, body]) => ({
      path: `/data/${path}`, mediaType: mediaType(path), schema: schemaFor(path), sha256: createHash("sha256").update(body).digest("hex"),
    })),
  });
