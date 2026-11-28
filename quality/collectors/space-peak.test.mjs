// Tests for Space Peak's own collector: fixtures that put each metric at goal and below goal, and a
// missing input. GitHub is a stand-in, so nothing here reads the network.
// Run with: node --test quality/collectors/space-peak.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";
import { collect, conformance, csvObjects, DEFAULTS } from "./space-peak.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO = join(HERE, "../..");
const TODAY = new Date().toISOString().slice(0, 10);
process.env.GITHUB_REPOSITORY = "o/r";
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
const run = (root, gh = null, params = {}) => collect({ root, gh, params: { ...REAL, ...params } });
const labels = (entry) => entry.detail.map((d) => d.label).join("; ");

test("the five metrics sit on the Pages tab with sourced goals, and the targets' params are the defaults", () => {
  const defs = JSON.parse(readFileSync(join(HERE, "../targets/space-peak.json"), "utf8"));
  const ids = ["site.orgs_sourced_share", "site.figures_with_status_share", "site.orgs_per_kind", "ai.files_valid_share", "ai.mcp_conformance_share"];
  assert.deepEqual(defs.map((d) => [d.id, d.goal]), ids.map((id) => [id, id === "site.orgs_per_kind" ? 10 : 100]));
  for (const d of defs) {
    assert.deepEqual([d.tab, d.kind, d.direction, d.needs], ["pages", "quality", "higher", "none"]);
    assert.ok(d.near < d.goal && d.means.length <= 120, `${d.id}: near on the worse side, means within 120 characters`);
    assert.match(d.goal_source, /space-peak#125\), which Paul approved on 2026-11-16/);
  }
  assert.deepEqual(defs[0].params, DEFAULTS);
  const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /test:e2e\n\s+node quality\/collectors\/space-peak\.mjs --mcp-line site\/test-results\n/);
  const spec = readFileSync(join(REPO, "site/e2e/mcp.spec.ts"), "utf8");
  assert.ok(spec.includes('"conformance-baseline.yml"') && spec.includes('outputPath("results")'), "mcp.spec.ts writes the baseline and results the CLI reads");
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
const fig = (id, chip) => `<span class="figure" data-claim="${id}"><span class="figure-value">1 ft</span>${chip ? `<span class="figure-chip figure-chip--${chip}">${chip}</span>` : ""}</span>`;
const pages = (byPath) => fixture({ "site/dist/data/claims.json": CLAIMS, ...Object.fromEntries(Object.entries(byPath).map(([p, figs]) => [`site/dist/${p}`, `<!doctype html><p>${figs.join(" ")}</p>`])) });

test("figures: each chip showing its register status is at goal; a wrong, missing or unknown one is below", async () => {
  const good = await run(pages({ "index.html": [fig("S-04", "unverified")], "map/index.html": [fig("S-16", "verified")] }));
  assert.equal(good["site.figures_with_status_share"].value, 100);
  const got = (await run(pages({ "index.html": [fig("S-04", "unverified"), fig("S-16", "unverified"), fig("S-04"), fig("Z-9", "open")] })))["site.figures_with_status_share"];
  assert.equal(got.value, 25);
  assert.match(labels(got), /S-16: chip says unverified, register says verified; index\.html S-04: no status chip; index\.html Z-9: no register row/);
});

test("figures: no figure yet, no build, or a build older than its sources is not measured", async () => {
  assert.match((await run(pages({ "index.html": [] })))["site.figures_with_status_share"].could_not_check, /show no figure yet/);
  assert.match((await run(fixture({})))["site.figures_with_status_share"].could_not_check, /run npm run build/);
  const root = pages({ "index.html": [fig("S-04", "unverified")] });
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

const check = (id, status) => ({ id, name: id, description: id, status, timestamp: "2026-11-27T05:00:00.000Z" });
// A results folder as mcp.spec.ts leaves it: the baseline it writes, and one checks.json per scenario.
const results = (byScenario, baseline = []) =>
  join(fixture({
    "out/conformance-baseline.yml": `server:\n${baseline.map((b) => `  - ${b}\n`).join("")}`,
    ...Object.fromEntries(Object.entries(byScenario).map(([s, checks]) => [`out/results/server-${s}-2026-11-27T05-00-00-000Z/checks.json`, checks])),
  }), "out");

test("mcp: a check its baseline names is never a pass, a warning is run, and SKIPPED and INFO are not run", () => {
  const dir = results({
    "tools-list": [check("a", "SUCCESS"), check("b", "SUCCESS"), check("i", "INFO")],
    "server-stateless": [check("ok", "SUCCESS"), check("sep-x", "FAILURE"), check("w", "WARNING")],
    "prompts-list": [check("p", "SUCCESS"), check("q", "FAILURE")],
    "skipped-one": [check("s", "SKIPPED")],
  }, ["server-stateless:sep-x", "prompts-list"]);
  assert.deepEqual(conformance(dir), { passed: 3, run: 7, baselined: 3 });
  assert.equal(conformance(fixture({})), null, "no results is null, never 100");
});

// A stand-in GitHub: the newest successful run skipped its standard job, the one before ran it with `log`.
const fakeGh = (log, jobs = [{ id: 7, name: "ci / standard", conclusion: "success" }]) => ({
  rest: async (route) => {
    if (route.includes("/workflows/ci.yml/runs?branch=main&status=success")) return { workflow_runs: [{ id: 2, created_at: "2026-11-27T06:00:00Z" }, { id: 1, created_at: "2026-11-26T06:00:00Z" }] };
    return route.includes("/runs/2/") ? { jobs: [{ id: 6, name: "ci / standard", conclusion: "skipped" }] } : { jobs };
  },
  text: async (route) => (route === "repos/o/r/actions/jobs/7/logs" ? log : ""),
});

test("mcp: the CLI's line, read back from the newest run whose standard job ran, is the share", async () => {
  const dir = results({ "tools-list": [check("a", "SUCCESS"), check("b", "FAILURE"), check("c", "SUCCESS"), check("d", "SUCCESS")] });
  const line = execFileSync(process.execPath, [join(HERE, "space-peak.mjs"), "--mcp-line", dir], { encoding: "utf8" }).trim();
  assert.equal(line, "== mcp conformance: 3 passed of 4 run, 0 baselined");
  const below = (await run(fixture({}), fakeGh(`2026-11-26T06:01:02.1234567Z ${line}\n`)))["ai.mcp_conformance_share"];
  assert.equal(below.value, 75);
  assert.match(below.source, /: run 1 \(2026-11-26\)$/);
  const good = await run(fixture({}), fakeGh("== mcp conformance: 40 passed of 40 run, 0 baselined"));
  assert.equal(good["ai.mcp_conformance_share"].value, 100);
});

test("mcp: no line, no run that ran the job, a refused read or no client is not measured", async () => {
  const reason = async (gh) => (await run(fixture({}), gh))["ai.mcp_conformance_share"].could_not_check;
  assert.match(await reason(fakeGh("npm test\nok\n")), /standard log of ci\.yml run 1 has no mcp conformance line/);
  assert.match(await reason(fakeGh("", [])), /none of the last 10 successful ci\.yml runs on main ran its standard job/);
  assert.match(await reason({ rest: async () => { throw new Error("HTTP 403: Resource not accessible"); } }), /could not read the ci\.yml runs: HTTP 403/);
  assert.match(await reason(null), /no GitHub client/);
});

test("the real repo's orgs read as measured", async () => {
  const got = await collect({ root: REPO, gh: null });
  for (const id of ["site.orgs_sourced_share", "site.orgs_per_kind"]) assert.equal(typeof got[id].value, "number", got[id].could_not_check);
});
