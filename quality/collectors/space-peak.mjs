#!/usr/bin/env node
// Space Peak's own metrics on the Pages tab, read from the repo, its built site and its CI.
// The contract is Git Crafter's quality/collectors/README.md (v7.0.2): targets/space-peak.json pairs
// with this file by name, repo values come from params, and nothing here throws. A missing file,
// package or run is could_not_check with its reason, never 0.
//
// ci.yml's standard job runs this file as a CLI after the e2e suite:
//   node quality/collectors/space-peak.mjs --mcp-notice site/test-results
// It prints one ::notice workflow command whose message is the MCP conformance tally as JSON.
// GitHub keeps it as an annotation on that job's check run, and ai.mcp_conformance_share reads it
// back through the Checks API. Git Crafter's ci-standard.yml has no artifact step, and the job log
// is never read.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const area = "space-peak";

/** The params targets/space-peak.json gives; the test holds the two equal. */
export const DEFAULTS = {
  orgs_dir: "data/orgs",
  orgs_check: "site/src/lib/orgs/check.ts",
  orgs_kinds: "site/src/lib/orgs/kinds.ts",
  region: "03_deliverables/map/space_peak_map.geojson",
  site_dir: "site/dist",
  data_index: "data/index.json",
  data_claims: "data/claims.json",
  sources: ["site/src", "data", "02_substance/claims_register.md"],
  mcp: { workflow: "ci.yml", job: "standard", branch: "main", runs: 10 },
};

// The annotation's title, which the CLI writes and the collector finds.
export const MCP_TITLE = "MCP conformance";
// GitHub's runner cuts an annotation message at 4,096 characters (actions/runner,
// src/Runner.Worker/ExecutionContext.cs, _maxIssueMessageLength, read 2026-11-27). Past this
// length the id lists drop, so the JSON stays whole and the counts stay.
const NOTICE_CHARS = 4000;

const ok = (value, source, detail) => ({ value, ...(detail ? { detail } : {}), source, read_at: new Date().toISOString() });
const no = (reason, source) => ({ could_not_check: reason, source });
const first = (err) => String(err?.message ?? err).split("\n")[0].slice(0, 200);
const pct = (part, whole) => Math.round((1000 * part) / whole) / 10;
const files = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)) : []);
const load = (root, path) => import(pathToFileURL(resolve(root, path)).href);

// A share: the pass and miss counts, then one row per miss naming the item and why.
function share(passed, misses, source, unit) {
  const rows = [{ label: "pass", value: passed, unit }, { label: "miss", value: misses.length, unit }, ...misses.map((label) => ({ label, value: 1, unit }))];
  return ok(pct(passed, passed + misses.length), source, rows);
}

// The contract's stale input rule: a build output older than its newest source is not measured.
function stale(root, p, outputs) {
  const sources = p.sources.map((s) => resolve(root, s)).flatMap((at) => (existsSync(at) && statSync(at).isFile() ? [at] : files(at)));
  const newest = Math.max(0, ...sources.map((f) => statSync(f).mtimeMs));
  return Math.min(...outputs.map((f) => statSync(f).mtimeMs)) < newest ? `${p.site_dir} is older than its sources (${p.sources.join(", ")}): rebuild it` : null;
}

const factSource = (o) => (Array.isArray(o?.sources) ? o.sources.find((s) => s?.id === o.fact?.source) : undefined);

// Why an org's fact is not sourced, or null: the source it cites needs an https URL, a quote and a read date.
function unsourced(o) {
  const s = factSource(o);
  if (!s) return "its fact cites no listed source";
  if (!URL.canParse(s.url) || new URL(s.url).protocol !== "https:") return `source ${s.id} has no https URL`;
  if (typeof s.quote !== "string" || !s.quote.trim()) return `source ${s.id} has no quote`;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s.read ?? "")) ? null : `source ${s.id} has no read date`;
}

// Whether check.ts's checkOrgs can read the org without throwing: the fields it reads, shaped as the schema shapes them.
const checkable = (o) =>
  typeof o?.name === "string" && typeof o.summary === "string" && Array.isArray(o.sources) && typeof o.fact?.source === "string" && typeof o.location?.source === "string" &&
  Number.isFinite(o.location.lat) && Number.isFinite(o.location.lon) && (!factSource(o) || URL.canParse(factSource(o).url));

async function orgMetrics(root, p) {
  const sourced = `state now: ${p.orgs_dir}/*.yaml whose fact cites a source with an https URL, a quote and a read date, and that ${p.orgs_check} checkOrgs gives no fact.source issue`;
  const kinds = `state now: ${p.orgs_dir}/*.yaml counted by each kind in ${p.orgs_kinds}; the value is the smallest count`;
  try {
    const [{ parse }, { checkOrgs, regionRings }, { KINDS }] = await Promise.all([import("yaml"), load(root, p.orgs_check), load(root, p.orgs_kinds)]);
    const dir = resolve(root, p.orgs_dir);
    const parsed = (file) => {
      try {
        return parse(readFileSync(join(dir, file), "utf8"));
      } catch {
        return null;
      }
    };
    const orgs = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort().map((file) => ({ file, o: parsed(file) }));
    const read = orgs.filter(({ o }) => checkable(o)).map(({ o }) => o);
    const issues = checkOrgs(read, regionRings(JSON.parse(readFileSync(resolve(root, p.region), "utf8"))));
    const flagged = new Map(issues.filter((i) => i.path === "fact.source").map((i) => [i.org, i.message]));
    const why = (o) => (o === null ? "empty or not YAML" : (unsourced(o) ?? (read.includes(o) ? flagged.get(o.id) : "not a well-formed org")));
    const misses = orgs.map(({ file, o }) => [file, why(o)]).filter(([, w]) => w).map(([file, w]) => `${file}: ${w}`);
    const counts = KINDS.map((k) => ({ label: k, value: orgs.filter(({ o }) => o?.kind === k).length, unit: "orgs" }));
    return {
      "site.orgs_sourced_share": orgs.length ? share(orgs.length - misses.length, misses, sourced, "orgs") : no(`no org files in ${p.orgs_dir}`, sourced),
      "site.orgs_per_kind": ok(Math.min(...counts.map((c) => c.value)), kinds, counts),
    };
  } catch (err) {
    const reason = `could not read the orgs: ${first(err)}`;
    return { "site.orgs_sourced_share": no(reason, sourced), "site.orgs_per_kind": no(reason, kinds) };
  }
}

// How a page shows a figure's status (issue #153): a confirmed row links its source; an unconfirmed one has no
// link and a page that says so in one [data-unproven-note]. site/src/components/figure.ts holds the same lists.
// Any other status, such as open, has no way to show itself on a figure, so it is a miss.
const CONFIRMED = ["verified", "corrected"];
const UNCONFIRMED = ["unverified", "unverifiable"];

/** Why one figure does not show its status, or null. */
function figureMiss(status, link, notes) {
  if (!status) return "no register row";
  if (CONFIRMED.includes(status)) return link.startsWith("https://") ? null : `${status}, with no source link`;
  if (!UNCONFIRMED.includes(status)) return `${status}, neither confirmed nor unconfirmed`;
  if (link) return `${status}, with a source link`;
  return notes === 1 ? null : `${status}, on a page that says so ${notes} times, not once`;
}

/** One built page's figures: how many, and why each one that does not show its status misses. */
function pageFigures(JSDOM, dist, page, status) {
  const { window } = new JSDOM(readFileSync(page, "utf8"));
  const notes = window.document.querySelectorAll("[data-unproven-note]").length;
  const figures = [...window.document.querySelectorAll("[data-claim], .figure")];
  const misses = [];
  for (const fig of figures) {
    const id = fig.getAttribute("data-claim");
    const link = fig.querySelector("a.figure-source")?.getAttribute("href") ?? "";
    const bad = figureMiss(status.get(id), link, notes);
    if (bad) misses.push(`${relative(dist, page)} ${id ?? "(no data-claim)"}: ${bad}`);
  }
  window.close();
  return { total: figures.length, misses };
}

async function figureShare(root, p) {
  const source = `state now: elements with data-claim or class figure on the ${p.site_dir} pages; per ${p.site_dir}/${p.data_claims}, a verified or corrected one needs an https source link, an unverified or unverifiable one no link and a page with one [data-unproven-note], and any other status is a miss`;
  const dist = resolve(root, p.site_dir);
  const pages = files(dist).filter((f) => f.endsWith(".html"));
  const claims = join(dist, p.data_claims);
  if (!pages.length || !existsSync(claims)) return no(`no built pages or ${p.data_claims} in ${p.site_dir}: run npm run build`, source);
  try {
    const old = stale(root, p, [...pages, claims]);
    if (old) return no(old, source);
    const { JSDOM } = await import("jsdom");
    const status = new Map(JSON.parse(readFileSync(claims, "utf8")).claims.map((c) => [c.id, c.status]));
    const misses = [];
    let total = 0;
    for (const page of pages) {
      const got = pageFigures(JSDOM, dist, page, status);
      total += got.total;
      misses.push(...got.misses);
    }
    return total ? share(total - misses.length, misses, source, "figures") : no(`the ${pages.length} built pages show no figure yet`, source);
  } catch (err) {
    return no(`could not read the pages: ${first(err)}`, source);
  }
}

// Inside quotes, two quote marks are one quote in the cell.
const doubledQuote = (text, i, quoted) => quoted && text[i] === '"' && text[i + 1] === '"';

// A comma or a line break outside quotes ends the cell; a line break also starts the next row.
function endCell(rows, cell, c) {
  rows.at(-1).push(c === "\n" ? cell.replace(/\r$/, "") : cell);
  if (c === "\n") rows.push([]);
}

/** RFC 4180 rows as objects keyed by the header row; a quoted cell may hold commas, quotes and line breaks. */
export function csvObjects(text) {
  const rows = [[]];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (doubledQuote(text, i, quoted)) {
      cell += '"';
      i += 1;
    } else if (c === '"') quoted = !quoted;
    else if (quoted || (c !== "," && c !== "\n")) cell += c;
    else {
      endCell(rows, cell, c);
      cell = "";
    }
  }
  if (cell) rows.at(-1).push(cell);
  const [head = [], ...body] = rows.filter((r) => r.length);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// Why one listed file does not validate, or null. It must be built, match index.json's sha256 and
// match its JSON Schema, a CSV row by row. A schema file must itself load as a JSON Schema.
function fileProblem(dist, f, z) {
  const at = join(dist, f.path);
  if (!existsSync(at)) return "listed but not built";
  const bytes = readFileSync(at);
  if (f.sha256 && createHash("sha256").update(bytes).digest("hex") !== f.sha256) return "its bytes differ from the sha256 in the index";
  const text = bytes.toString("utf8");
  if (String(f.schema).startsWith("https://json-schema.org/")) return z.fromJSONSchema(JSON.parse(text)) ? null : "not a JSON Schema";
  const schema = z.fromJSONSchema(JSON.parse(readFileSync(join(dist, new URL(f.schema, "https://schema.invalid").pathname), "utf8")));
  const values = f.path.endsWith(".csv") ? csvObjects(text) : [JSON.parse(text)];
  const bad = values.findIndex((v) => !schema.safeParse(v).success);
  return bad < 0 ? null : `${f.path.endsWith(".csv") ? `row ${bad + 1}` : "the body"} does not match ${f.schema}`;
}

async function filesShare(root, p) {
  const source = `state now: ${p.site_dir}/${p.data_index} and every file it lists, each against its sha256 there and its JSON Schema (zod fromJSONSchema), a CSV row by row`;
  const dist = resolve(root, p.site_dir);
  const index = join(dist, p.data_index);
  if (!existsSync(index)) return no(`no ${p.site_dir}/${p.data_index}: run npm run build`, source);
  try {
    const { z } = await import("zod");
    const own = { path: `/${p.data_index}`, schema: `/${join(dirname(p.data_index), "schemas", basename(p.data_index))}` };
    const listed = [own, ...(JSON.parse(readFileSync(index, "utf8")).files ?? [])];
    const old = stale(root, p, listed.map((f) => join(dist, f.path)).filter(existsSync));
    if (old) return no(old, source);
    const problem = (f) => {
      try {
        return fileProblem(dist, f, z);
      } catch (err) {
        return first(err);
      }
    };
    const misses = listed.map((f) => [f.path, problem(f)]).filter(([, w]) => w).map(([path, w]) => `${path}: ${w}`);
    return share(listed.length - misses.length, misses, source, "files");
  } catch (err) {
    return no(`could not read ${p.data_index}: ${first(err)}`, source);
  }
}

// A scenario's folder under the suite's -o folder: server-<scenario>-<ISO time with : and . as ->.
const SCENARIO = /(?:^|\/)server-(.+)-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z$/;
const SEVERITY = { FAILURE: 3, WARNING: 2, SUCCESS: 1 };

// A scenario's checks once per id, at the most severe status (ties keep the last), as the suite's own
// collapseDuplicateChecks does; INFO and SKIPPED checks are not run.
function collapse(checks) {
  const byId = new Map();
  for (const c of Array.isArray(checks) ? checks : []) {
    if (!c || c.status === "INFO") continue;
    const had = byId.get(c.id);
    if (!had || (SEVERITY[c.status] ?? 0) >= (SEVERITY[had.status] ?? 0)) byId.set(c.id, c);
  }
  return [...byId.values()].filter((c) => c.status !== "SKIPPED");
}

/**
 * The MCP conformance tally under dir, or null with no results. It reads the checks.json files and the
 * expected-failures baseline that site/e2e/mcp.spec.ts writes there from site/e2e/mcp-not-applicable.json.
 * A check that list names, as `<scenario>` or `<scenario>:<check-id>`, is run and not applicable: it is
 * neither passed nor failed. Any other check is passed on SUCCESS and failed on FAILURE or WARNING, as the
 * suite judges it.
 */
export function conformance(dir) {
  const all = files(dir);
  const results = all.filter((f) => basename(f) === "checks.json").sort();
  if (!results.length) return null;
  const base = all.find((f) => basename(f) === "conformance-baseline.yml");
  const listed = new Set(base ? [...readFileSync(base, "utf8").matchAll(/^\s+- (\S+)\s*$/gm)].map((m) => m[1]) : []);
  const tally = { run: 0, passed: 0, not_applicable: 0, failed: 0, not_applicable_ids: new Set(), failed_ids: [] };
  for (const f of results) {
    const at = relative(dir, dirname(f));
    const scenario = SCENARIO.exec(at)?.[1] ?? at;
    for (const c of collapse(JSON.parse(readFileSync(f, "utf8")))) {
      const entry = [scenario, `${scenario}:${c.id}`].find((e) => listed.has(e));
      tally.run += 1;
      if (entry) {
        tally.not_applicable += 1;
        tally.not_applicable_ids.add(entry);
      } else if (c.status === "SUCCESS") tally.passed += 1;
      else {
        tally.failed += 1;
        tally.failed_ids.push(`${scenario}:${c.id}`);
      }
    }
  }
  return { ...tally, not_applicable_ids: [...tally.not_applicable_ids].sort(), failed_ids: tally.failed_ids.sort() };
}

/** The ::notice workflow command for a tally: its message is the tally as JSON, escaped as GitHub reads it. */
export function mcpNotice(tally) {
  const full = JSON.stringify(tally);
  const body = full.length <= NOTICE_CHARS ? full : JSON.stringify({ ...tally, not_applicable_ids: [], failed_ids: [], ids_cut: true });
  return `::notice title=${MCP_TITLE}::${body.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")}`;
}

const count = (n) => Number.isInteger(n) && n >= 0;

// The tally in an annotation's message, or why it is not one. A tally left before step 48 (#159) has
// baselined in place of not_applicable, and its baselined checks still count against the share.
function readTally(message) {
  let t;
  try {
    t = { not_applicable: 0, baselined: 0, ...JSON.parse(message) };
  } catch {
    return { why: "its message is not JSON" };
  }
  const keys = ["passed", "not_applicable", "baselined", "failed"];
  const whole = count(t.run) && keys.every((k) => count(t[k])) && keys.reduce((n, k) => n + t[k], 0) === t.run;
  return whole ? { t } : { why: "its counts are missing or do not add up to run" };
}

const checkRunId = (job) => /\/check-runs\/(\d+)$/.exec(String(job.check_run_url ?? ""))?.[1] ?? job.id;

/** The detail rows of a tally: the counts, then each check id it lists. */
function tallyRows(t) {
  const ids = (key, kind) => (Array.isArray(t[key]) ? t[key] : []).map((id) => ({ label: `${kind}: ${id}`, value: 1, unit: "" }));
  return [
    ...["passed", "failed", "not_applicable", ...(t.baselined ? ["baselined"] : [])].map((key) => ({ label: key.replace("_", " "), value: t[key], unit: "checks" })),
    ...ids("failed_ids", "failed"),
    ...ids("baselined_ids", "on the baseline"),
    ...ids("not_applicable_ids", "not applicable"),
    ...(t.ids_cut ? [{ label: "check ids left out to fit the annotation", value: 1, unit: "" }] : []),
  ];
}

/** The share from one successful run's annotation, or null when its job did not run. */
async function runShare(gh, repo, run, { workflow, job }, source) {
  const jobs = (await gh.rest(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`))?.jobs ?? [];
  const ran = jobs.find((j) => (j.name === job || String(j.name).endsWith(` / ${job}`)) && j.conclusion === "success");
  if (!ran) return null;
  const read = `${source}: run ${run.id} (${String(run.created_at).slice(0, 10)}, ${String(run.head_sha).slice(0, 7)})`;
  const notes = await gh.rest(`repos/${repo}/check-runs/${checkRunId(ran)}/annotations?per_page=100`);
  const ours = (level) => (Array.isArray(notes) ? notes : []).find((a) => a?.title === MCP_TITLE && a.annotation_level === level);
  const note = ours("notice");
  if (!note) {
    const warned = ours("warning");
    return no(warned ? `${workflow} run ${run.id}'s ${job} job warned: ${first(warned.message)}` : `${workflow} run ${run.id}'s ${job} job left no ${MCP_TITLE} annotation`, read);
  }
  const { t, why } = readTally(note.message);
  if (!t) return no(`the ${MCP_TITLE} annotation on ${workflow} run ${run.id}: ${why}`, read);
  const applies = t.run - t.not_applicable;
  if (!applies) return no(`${workflow} run ${run.id} ran no conformance check that applies to /mcp`, read);
  return ok(pct(t.passed, applies), read, tallyRows(t));
}

async function mcpShare(p, gh, repo) {
  const { workflow, job, branch, runs } = p.mcp;
  const source = `latest: the ${MCP_TITLE} annotation that node quality/collectors/space-peak.mjs --mcp-notice leaves on ${workflow} job ${job}, in the newest of the last ${runs} successful ${branch} runs whose ${job} job ran. A check site/e2e/mcp-not-applicable.json names is run and left out of the share`;
  if (!repo) return no("no repo: params.repo, GITHUB_REPOSITORY and the origin remote name none", source);
  if (!gh) return no("no GitHub client: Git Crafter's collect.mjs passes lib", source);
  try {
    const list = await gh.rest(`repos/${repo}/actions/workflows/${workflow}/runs?branch=${branch}&event=push&status=success&per_page=${runs}`);
    for (const run of list?.workflow_runs ?? []) {
      const got = await runShare(gh, repo, run, p.mcp, source);
      if (got) return got;
    }
    return no(`none of the last ${runs} successful ${workflow} runs on ${branch} ran its ${job} job`, source);
  } catch (err) {
    return no(`could not read the ${workflow} runs: ${first(err)}`, source);
  }
}

/** The five metrics, each measured or could_not_check with its reason. gh and repo default to Git Crafter's lib. */
export async function collect({ root = process.cwd(), params = {}, lib, gh = lib?.ghClient ? lib.ghClient() : null, repo } = {}) {
  const p = { ...DEFAULTS, ...params, mcp: { ...DEFAULTS.mcp, ...params.mcp } };
  const slug = repo ?? (lib?.ownRepo ? await lib.ownRepo(root, p).catch(() => "") : (p.repo ?? process.env.GITHUB_REPOSITORY ?? ""));
  const [orgs, figures, data, mcp] = await Promise.all([orgMetrics(root, p), figureShare(root, p), filesShare(root, p), mcpShare(p, gh, /^[\w.-]+\/[\w.-]+$/.test(slug) ? slug : null)]);
  return { ...orgs, "site.figures_with_status_share": figures, "ai.files_valid_share": data, "ai.mcp_conformance_share": mcp };
}

// The CLI. No results is a warning, never a failed job: the metric then reads not measured.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [flag, dir] = process.argv.slice(2);
  if (flag !== "--mcp-notice" || !dir) {
    console.error("usage: node quality/collectors/space-peak.mjs --mcp-notice DIR");
    process.exit(2);
  }
  const warn = (why) => console.log(`::warning title=${MCP_TITLE}::${why.replace(/%/g, "%25")}`);
  try {
    const got = conformance(resolve(dir));
    if (got) console.log(mcpNotice(got));
    else warn(`no MCP conformance results under ${dir}`);
  } catch (err) {
    warn(`could not read the results under ${dir}: ${first(err)}`);
  }
}
