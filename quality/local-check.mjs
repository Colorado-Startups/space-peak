#!/usr/bin/env node
// Checks quality/data/local.json, the run a --local Quality collect writes, before it is committed.
// This repo is public, so the file may hold aggregate numbers and short labels only.
//
//   node quality/local-check.mjs [FILE]                     shape and content; exit 1 on a finding
//   node quality/local-check.mjs --scrub [FILE]             rewrite the local paths collectors leave, then check
//   node quality/local-check.mjs --page HTML [FILE]         the built page shows every measured metric as measured
//
// Shape: Git Crafter v7.0.2, the pin in .github/workflows/pages.yml. Its quality/collectors/README.md
// (Contract, Returns), quality/render/README.md (Charts, Display fields, Run files) and collect.mjs
// (runRecord, recordLocal) define the run file. They win over this file.
//
// A finding names the JSON path and the kind, never the text it matched, so CI logs leak nothing.
// Account names: PRIVACY_NAMES (comma separated) everywhere; off CI, also this machine's user name and
// git user.name and user.email. None is written in this file.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { pathToFileURL } from "node:url";

export const DEFAULT_FILE = "quality/data/local.json";

const TOP_KEYS = new Set(["generated_at", "commit", "mode", "collectors", "metrics", "api_spend"]);
const ENTRY_KEYS = new Set(["value", "detail", "source", "read_at", "unit", "could_not_check", "weak", "by_repo"]);
// render/README.md: label, value, unit and partial, plus each chart's detail fields. latest_rework is
// read by render/repos.mjs at the same pin, though the README's repos row leaves it out.
const DETAIL_KEYS = new Set([
  "label", "value", "unit", "partial",
  "stage", "kind", "runs", "file", "pass_rate",
  "group", "fires", "false_alarm", "hours", "tokens", "verdict",
  "share", "merged", "per_10m", "tokens_per_pr", "cache_read_share", "waste_share", "rework_per_pr", "latest_rework", "per_hour",
  "commit", "commit_from", "lead_hours", "rollback", "failed", "restore_hours",
  "allowance", "used", "used_floor", "unused", "used_share", "pool", "resets", "status", "replaces", "could_take_over", "claim_needs",
  "installed", "eligible", "newest", "majors_behind", "waiting_days", "where",
]);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const METRIC_ID = /^[a-z][a-z0-9_-]*\.[a-z0-9_]+$/;
const AREA = /^[a-z][a-z0-9_-]*$/;
const REPO = /^[\w.-]+(\/[\w.-]+)?$/;

// Longest text each field may hold; transcript or prompt text runs longer.
const CAP = { source: 1200, could_not_check: 400, unit: 40, detail: 120, other: 200 };

const LOCAL_PATH = /(\/Users|\/home|\/root|\/private|\/var\/folders|\/tmp)\/[^\s,;)'"]*/g;
const PROJECT_SLUG = /\*?-(Users|home)-[^\s/*,;)]*\*?/g;
// ~/.claude/ is Claude Code's own documented folder and names no account; any other ~/ path is the owner's layout.
const HOME_PATH = /~\/(?!\.claude(?:\/|$|[\s,;)]))[^,;)'"]*/g;

const RULES = [
  ["home or temp path", (s) => /(^|[^\w.])(\/Users|\/home|\/root|\/private|\/var\/folders|\/tmp)\//.test(s) || /[A-Za-z]:\\Users\\/i.test(s)],
  ["project folder name that spells a home path", (s) => /-(Users|home)-\S/.test(s)],
  ["path under a home folder", (s) => /~\/(?!\.claude(?:\/|$|[\s,;)]))/.test(s)],
  ["email address", (s) => /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/.test(s)],
  ["key or token", (s) => [
    /\bgh[pousr]_[A-Za-z0-9]{20,}/, /\bgithub_pat_[A-Za-z0-9_]{20,}/, /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/,
    /\bxox[abposr]-[A-Za-z0-9-]{10,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bAIza[0-9A-Za-z_-]{35}\b/, /\bhf_[A-Za-z0-9]{30,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]{16,}/i,
  ].some((re) => re.test(s)) || (s.match(/[A-Za-z0-9]{32,}/g) ?? []).some((run) => /[A-Z]/.test(run) && /[a-z]/.test(run) && /\d/.test(run))],
  ["transcript or prompt text", (s) => /[\n\r\t]/.test(s)
    || /<\/?(system-reminder|command-name|command-message|command-args|function_calls|invoke|parameter|local-command-stdout|user-prompt-submit-hook)\b/i.test(s)
    || /"(role|content|tool_use_id|tool_use|text)"\s*:/.test(s)
    || /(^|\s)(Human|Assistant|User):\s/.test(s)],
];

// The account names to look for, lower case, four characters or more.
export function accountNames(env = process.env) {
  const names = String(env.PRIVACY_NAMES ?? "").split(",");
  if (!env.CI) {
    try {
      names.push(userInfo().username);
    } catch {}
    for (const key of ["user.name", "user.email"]) {
      try {
        const v = execFileSync("git", ["config", key], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        names.push(v, v.split("@")[0]);
      } catch {}
    }
  }
  return [...new Set(names.map((n) => n.trim().toLowerCase()).filter((n) => n.length >= 4))];
}

const isObj = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isScalar = (v) => v === null || typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));

// Every finding in a run: [{ path, kind }]. names: account names, lower case.
export function check(run, { names = accountNames() } = {}) {
  const found = [];
  const add = (path, kind) => found.push({ path, kind });
  const text = (path, s, cap) => {
    if (typeof s !== "string") return;
    if (s.length > cap) add(path, `text over ${cap} characters (transcript or prompt text)`);
    for (const [kind, test] of RULES) if (test(s)) add(path, kind);
    const low = s.toLowerCase();
    if (names.some((n) => low.includes(n))) add(path, "account name");
  };

  if (!isObj(run)) return [{ path: "$", kind: "shape: not an object" }];
  for (const k of Object.keys(run)) if (!TOP_KEYS.has(k)) add(k, "shape: unknown top-level key");
  if (typeof run.generated_at !== "string" || !ISO.test(run.generated_at)) add("generated_at", "shape: not an ISO UTC time");
  if (!(run.commit === null || (typeof run.commit === "string" && /^[0-9a-f]{40}$/.test(run.commit)))) add("commit", "shape: not a 40-hex commit or null");
  if (run.mode !== "local") add("mode", "shape: not a local run");
  if (!Array.isArray(run.collectors) || !run.collectors.every((c) => typeof c === "string" && AREA.test(c))) add("collectors", "shape: not a list of collector areas");
  if (run.api_spend !== undefined) {
    if (!isObj(run.api_spend)) add("api_spend", "shape: not an object");
    else for (const [k, v] of Object.entries(run.api_spend)) {
      if (!isScalar(v)) add(`api_spend.${k}`, "shape: not a number or text");
      text(`api_spend.${k}`, v, CAP.source);
    }
  }
  if (!isObj(run.metrics)) {
    add("metrics", "shape: not an object");
    return found;
  }
  for (const [id, entry] of Object.entries(run.metrics)) entryFindings(id, entry, { add, text });
  return found;
}

function entryFindings(id, entry, { add, text }) {
  const at = `metrics.${id}`;
  if (!METRIC_ID.test(id)) add(at, "shape: not a metric id");
  if (!isObj(entry)) return add(at, "shape: entry is not an object");
  for (const k of Object.keys(entry)) if (!ENTRY_KEYS.has(k)) add(`${at}.${k}`, "shape: unknown entry key");
  if (entry.could_not_check !== undefined) {
    if (typeof entry.could_not_check !== "string" || !entry.could_not_check.trim()) add(`${at}.could_not_check`, "shape: empty reason");
  } else {
    if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) add(`${at}.value`, "shape: a read metric needs a finite value");
    if (typeof entry.source !== "string" || !entry.source.trim()) add(`${at}.source`, "shape: a read metric needs a source");
  }
  if (entry.value !== undefined && (typeof entry.value !== "number" || !Number.isFinite(entry.value))) add(`${at}.value`, "shape: not a finite number");
  if (entry.weak !== undefined && entry.weak !== true) add(`${at}.weak`, "shape: weak is true or absent");
  if (entry.read_at !== undefined && (typeof entry.read_at !== "string" || !ISO.test(entry.read_at))) add(`${at}.read_at`, "shape: not an ISO UTC time");
  for (const k of ["source", "unit", "could_not_check"]) if (entry[k] !== undefined && typeof entry[k] !== "string") add(`${at}.${k}`, "shape: not text");
  text(`${at}.source`, entry.source, CAP.source);
  text(`${at}.could_not_check`, entry.could_not_check, CAP.could_not_check);
  text(`${at}.unit`, entry.unit, CAP.unit);
  if (entry.by_repo !== undefined) {
    if (!isObj(entry.by_repo)) add(`${at}.by_repo`, "shape: not an object");
    else for (const [repo, v] of Object.entries(entry.by_repo)) {
      if (!REPO.test(repo)) add(`${at}.by_repo`, "shape: not a repo name");
      text(`${at}.by_repo`, repo, CAP.other);
      if (!(v === null || (typeof v === "number" && Number.isFinite(v)))) add(`${at}.by_repo`, "shape: not a number or null");
    }
  }
  if (entry.detail === undefined) return;
  if (!Array.isArray(entry.detail)) return add(`${at}.detail`, "shape: not a list");
  entry.detail.forEach((row, i) => {
    const rp = `${at}.detail.${i}`;
    if (!isObj(row)) return add(rp, "shape: row is not an object");
    if (typeof row.label !== "string") add(`${rp}.label`, "shape: a row needs a label");
    for (const [k, v] of Object.entries(row)) {
      if (!DETAIL_KEYS.has(k)) add(`${rp}.${k}`, "shape: unknown detail field");
      if (!isScalar(v)) add(`${rp}.${k}`, "shape: not a number, text, true, false or null");
      text(`${rp}.${k}`, v, CAP.detail);
    }
  });
}

// The run with each local path a collector left rewritten: a temp or home folder's absolute path, a
// Claude Code project folder name that spells one, and a ~/ path outside ~/.claude/.
export function scrub(run) {
  const fix = (s) => s.replace(LOCAL_PATH, "<a local path>").replace(PROJECT_SLUG, "<this repo's project folder>").replace(HOME_PATH, "<a path under home>");
  const walk = (v) => {
    if (typeof v === "string") return fix(v);
    if (Array.isArray(v)) return v.map(walk);
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [fix(k), walk(x)]));
    return v;
  };
  return walk(run);
}

// The measured metrics a built Quality page does not show as measured: [{ id, why }]. The page draws
// each metric as <details class="metric s-STATUS" id="m-ID">, STATUS not-measured when it has no value.
export function missingFromPage(run, html) {
  const missing = [];
  for (const [id, e] of Object.entries(run.metrics ?? {})) {
    if (e.could_not_check !== undefined) continue;
    const tag = new RegExp(`<details\\b[^>]*\\bid="m-${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`).exec(html)?.[0];
    if (!tag) missing.push({ id, why: "not on the page" });
    else if (/\bs-not-measured\b/.test(tag)) missing.push({ id, why: "shown as not measured" });
  }
  return missing;
}

function main(argv) {
  const scrubbing = argv[0] === "--scrub";
  const pageAt = argv[0] === "--page" ? argv[1] : null;
  const file = argv[scrubbing ? 1 : pageAt ? 2 : 0] ?? DEFAULT_FILE;
  let run = JSON.parse(readFileSync(file, "utf8"));
  if (scrubbing) {
    run = scrub(run);
    writeFileSync(file, `${JSON.stringify(run, null, 2)}\n`);
    console.log(`scrubbed ${file}`);
  }
  if (pageAt) {
    const missing = missingFromPage(run, readFileSync(pageAt, "utf8"));
    const shown = Object.values(run.metrics).filter((e) => e.could_not_check === undefined).length;
    for (const m of missing) console.error(`${m.id}: ${m.why}`);
    console.log(`${shown - missing.length} of ${shown} measured local metrics on ${pageAt}`);
    return missing.length ? 1 : 0;
  }
  const names = accountNames();
  const found = check(run, { names });
  for (const f of found) console.error(`${file}: ${f.path}: ${f.kind}`);
  const entries = Object.values(run.metrics ?? {});
  const read = entries.filter((e) => e && e.could_not_check === undefined).length;
  console.log(`${file}: ${entries.length} entries, ${read} measured, ${found.length} finding(s); account names checked: ${names.length}${names.length ? "" : " (set PRIVACY_NAMES to check them)"}`);
  return found.length ? 1 : 0;
}

// A file that cannot be read or parsed is "could not verify", exit 2, never a content finding.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`local-check: could not verify (${String(err.message).split("\n")[0]})`);
    process.exitCode = 2;
  }
}
