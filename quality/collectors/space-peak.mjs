// Space Peak's own metrics on the Pages tab, read from the repo and its built site.
// The contract is Git Crafter's quality/collectors/README.md (v7.0.2): targets/space-peak.json pairs
// with this file by name, repo values come from params, and nothing here throws. A missing file
// or package is could_not_check with its reason, never 0.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
};

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

async function figureShare(root, p) {
  const source = `state now: elements with data-claim or class figure on the ${p.site_dir} pages that hold a .figure-chip whose word is the claim's status in ${p.site_dir}/${p.data_claims}`;
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
      const { window } = new JSDOM(readFileSync(page, "utf8"));
      for (const fig of window.document.querySelectorAll("[data-claim], .figure")) {
        total += 1;
        const id = fig.getAttribute("data-claim");
        const want = status.get(id);
        const chip = fig.querySelector(".figure-chip")?.textContent.trim();
        const bad = !want ? "no register row" : !chip ? "no status chip" : chip !== want ? `chip says ${chip}, register says ${want}` : null;
        if (bad) misses.push(`${relative(dist, page)} ${id ?? "(no data-claim)"}: ${bad}`);
      }
      window.close();
    }
    return total ? share(total - misses.length, misses, source, "figures") : no(`the ${pages.length} built pages show no figure yet`, source);
  } catch (err) {
    return no(`could not read the pages: ${first(err)}`, source);
  }
}

/** RFC 4180 rows as objects keyed by the header row; a quoted cell may hold commas, quotes and line breaks. */
export function csvObjects(text) {
  const rows = [[]];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted && c === '"' && text[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (c === '"') quoted = !quoted;
    else if (quoted || (c !== "," && c !== "\n")) cell += c;
    else {
      rows.at(-1).push(c === "\n" ? cell.replace(/\r$/, "") : cell);
      cell = "";
      if (c === "\n") rows.push([]);
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

/** The four metrics, each measured or could_not_check with its reason. */
export async function collect({ root = process.cwd(), params = {} } = {}) {
  const p = { ...DEFAULTS, ...params };
  const [orgs, figures, data] = await Promise.all([orgMetrics(root, p), figureShare(root, p), filesShare(root, p)]);
  return { ...orgs, "site.figures_with_status_share": figures, "ai.files_valid_share": data };
}

