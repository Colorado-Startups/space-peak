// Tests for Space Peak's own collector: fixtures that put each metric at goal and below goal, and a
// missing input. Nothing here reads the network.
// Run with: node --test quality/collectors/space-peak.test.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";
import { collect, csvObjects, DEFAULTS } from "./space-peak.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO = join(HERE, "../..");
const TODAY = new Date().toISOString().slice(0, 10);
// The site's own checker and kinds, so a fixture runs the logic the build runs.
const REAL = { orgs_check: join(REPO, DEFAULTS.orgs_check), orgs_kinds: join(REPO, DEFAULTS.orgs_kinds) };

// A fresh folder holding `files`: path to text, or to an object written as JSON.
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "space-peak-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof body === "string" ? body : JSON.stringify(body));
  }
  return root;
}
const run = (root, params = {}) => collect({ root, params: { ...REAL, ...params } });
const labels = (entry) => entry.detail.map((d) => d.label).join("; ");

test("the four metrics sit on the Pages tab with sourced goals, and the targets' params are the defaults", () => {
  const defs = JSON.parse(readFileSync(join(HERE, "../targets/space-peak.json"), "utf8"));
  const ids = ["site.orgs_sourced_share", "site.figures_with_status_share", "site.orgs_per_kind", "ai.files_valid_share"];
  assert.deepEqual(defs.map((d) => [d.id, d.goal]), ids.map((id) => [id, id === "site.orgs_per_kind" ? 10 : 100]));
  for (const d of defs) {
    assert.deepEqual([d.tab, d.kind, d.direction, d.needs], ["pages", "quality", "higher", "none"]);
    assert.ok(d.near < d.goal && d.means.length <= 120, `${d.id}: near on the worse side, means within 120 characters`);
    assert.match(d.goal_source, /space-peak#125\), which Paul approved on 2026-11-16/);
  }
  assert.deepEqual(defs[0].params, DEFAULTS);
  const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /\n\s+node --test quality\/collectors\/space-peak\.test\.mjs\n/, "ci.yml's short job runs this file");
});

const SUBKIND = { command_base: "installation", institution: "college", company: "startup" };
const REGION = { features: [{ properties: { layer: "region" }, geometry: { type: "Polygon", coordinates: [[[-105.2, 38.5], [-104.4, 38.5], [-104.4, 39.2], [-105.2, 39.2], [-105.2, 38.5]]] } }] };
const org = (kind, i, source = {}) => ({
  id: `${kind.replace("_", "-")}-${i}`, name: `${kind} ${i}`, summary: "A fixture org.", kind, subkind: SUBKIND[kind], city: "colorado-springs", area: "loop",
  fact: { text: "A fact.", source: "page" },
  sources: [{ id: "page", url: `https://example.org/${kind}/${i}`, publisher: "Example", read: TODAY, quote: "a short quote", ...source }],
  location: { lat: 38.8, lon: -104.8, precision: "city", method: "Fixture.", source: "page" },
  status: "active",
});
const orgSite = (orgs) => fixture({ [DEFAULTS.region]: REGION, ...Object.fromEntries(orgs.map((o) => [`data/orgs/${o.id}.yaml`, stringify(o)])) });
const tenEach = Object.keys(SUBKIND).flatMap((k) => Array.from({ length: 10 }, (_, i) => org(k, i)));

test("orgs: every fact sourced and ten of each kind is at goal", async () => {
  const got = await run(orgSite(tenEach));
  assert.equal(got["site.orgs_sourced_share"].value, 100);
  assert.equal(got["site.orgs_per_kind"].value, 10);
});

test("orgs: no quote, a stale read, a shared fact URL and nine of a kind are below goal; no folder is not measured", async () => {
  const more = [org("company", 20, { quote: undefined }), org("company", 21, { read: "2024-01-01" }), org("company", 22, { url: "https://example.org/company/3" })];
  const got = await run(orgSite([...tenEach.slice(1), ...more]));
  assert.equal(got["site.orgs_sourced_share"].value, 90.6, "29 of 32");
  assert.match(labels(got["site.orgs_sourced_share"]), /company-20\.yaml: source page has no quote; company-21\.yaml: page was read \d+ days ago .*company-3\.yaml: same fact source URL as company-22/);
  assert.equal(got["site.orgs_per_kind"].value, 9);
  assert.deepEqual(got["site.orgs_per_kind"].detail.map((d) => d.value), [9, 10, 13]);
  const none = await run(fixture({}));
  assert.match(none["site.orgs_sourced_share"].could_not_check, /^could not read the orgs: /);
  assert.equal(none["site.orgs_per_kind"].value, undefined, "a folder it could not read is never 0");
});

const CLAIMS = { claims: [{ id: "S-04", status: "unverified" }, { id: "S-16", status: "verified" }] };
const fig = (id, href) => `<span class="figure" data-claim="${id}"><span class="figure-value">1 ft</span>${href ? `<a class="figure-source" href="${href}">source</a>` : ""}</span>`;
const NOTE = `<p data-unproven-note>Figures without a source link are not yet confirmed.</p>`;
const pages = (byPath) => fixture({ "site/dist/data/claims.json": CLAIMS, ...Object.fromEntries(Object.entries(byPath).map(([p, figs]) => [`site/dist/${p}`, `<!doctype html><p>${figs.join(" ")}</p>`])) });

test("figures: a confirmed one with its source link, an unconfirmed one on a page that says so once, is at goal", async () => {
  const good = await run(pages({ "index.html": [NOTE, fig("S-04")], "map/index.html": [fig("S-16", "https://example.org/s-16")] }));
  assert.equal(good["site.figures_with_status_share"].value, 100);
});

test("figures: no source link, no page note or two, and an unknown row are below goal", async () => {
  const got = (await run(pages({
    "index.html": [fig("S-04"), fig("S-16"), fig("Z-9"), fig("S-16", "https://example.org/s-16")],
    "launch/index.html": [NOTE, NOTE, fig("S-04")],
  })))["site.figures_with_status_share"];
  assert.equal(got.value, 20, "1 of 5");
  assert.match(labels(got), /(^|; )index\.html S-04: unverified, on a page that says so 0 times, not once; index\.html S-16: verified, with no source link; index\.html Z-9: no register row(;|$)/);
  assert.match(labels(got), /launch\/index\.html S-04: unverified, on a page that says so 2 times, not once/);
});

test("figures: no figure yet, no build, or a build older than its sources is not measured", async () => {
  assert.match((await run(pages({ "index.html": [] })))["site.figures_with_status_share"].could_not_check, /show no figure yet/);
  assert.match((await run(fixture({})))["site.figures_with_status_share"].could_not_check, /run npm run build/);
  const root = pages({ "index.html": [NOTE, fig("S-04")] });
  mkdirSync(join(root, "data"));
  writeFileSync(join(root, "data/late.yaml"), "late: true\n");
  const later = new Date(Date.now() + 60_000);
  utimesSync(join(root, "data/late.yaml"), later, later);
  assert.match((await run(root))["site.figures_with_status_share"].could_not_check, /older than its sources/);
});

const sha = (text) => createHash("sha256").update(text).digest("hex");
const schemaOf = (zs) => JSON.stringify(z.toJSONSchema(zs));
// A built /data/ folder shaped as step 39 builds it: files, their schemas, and index.json listing each with its sha256.
function dataSite(a = { n: 1 }, tamper = {}) {
  const files = {
    "data/a.json": JSON.stringify(a),
    "data/a.csv": 'id,note\r\nx,"one, ""two""\r\nthree"\r\n',
    "data/schemas/a.json": schemaOf(z.strictObject({ n: z.int() })),
    "data/schemas/a-row.json": schemaOf(z.strictObject({ id: z.string(), note: z.string() })),
    "data/schemas/index.json": schemaOf(z.object({ files: z.array(z.object({ path: z.string(), schema: z.string(), sha256: z.string() })) })),
  };
  const schema = (p) => (p.startsWith("data/schemas/") ? "https://json-schema.org/draft/2020-12/schema" : `https://spacepeak.co/data/schemas/${p.endsWith(".csv") ? "a-row" : "a"}.json`);
  const index = { files: Object.entries(files).map(([p, text]) => ({ path: `/${p}`, schema: schema(p), sha256: sha(text) })) };
  return fixture(Object.fromEntries(Object.entries({ ...files, "data/index.json": JSON.stringify(index), ...tamper }).map(([p, t]) => [`site/dist/${p}`, t])));
}

test("files: every listed file matching its sha256 and schema is at goal", async () => {
  assert.equal((await run(dataSite()))["ai.files_valid_share"].value, 100);
  assert.deepEqual(csvObjects('id,note\r\nx,"one, ""two""\r\nthree"\r\n'), [{ id: "x", note: 'one, "two"\r\nthree' }]);
});

test("files: a body off its schema or bytes off the index are below goal; no index is not measured", async () => {
  const got = (await run(dataSite({ n: "one" }, { "data/a.csv": "id,note\r\nx,y\r\n" })))["ai.files_valid_share"];
  assert.equal(got.value, 66.7, "4 of 6: index.json, two data files and three schemas");
  assert.match(labels(got), /\/data\/a\.json: the body does not match .*\/data\/a\.csv: its bytes differ from the sha256/);
  assert.match((await run(fixture({})))["ai.files_valid_share"].could_not_check, /no site\/dist\/data\/index\.json/);
});

test("the real repo's orgs read as measured", async () => {
  const got = await collect({ root: REPO });
  for (const id of ["site.orgs_sourced_share", "site.orgs_per_kind"]) assert.equal(typeof got[id].value, "number", got[id].could_not_check);
});
