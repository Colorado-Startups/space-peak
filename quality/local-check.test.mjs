// node --test quality/local-check.test.mjs: the committed local run passes local-check.mjs, and each
// forbidden kind of content, and each break from Git Crafter's run-file shape, fails it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { accountNames, check, DEFAULT_FILE, missingFromPage, scrub } from "./local-check.mjs";

const NAMES = ["examplename"];

// A small run in the shape collect.mjs writes: one read metric and one not measured.
const run = (over = {}) => ({
  generated_at: "2026-11-28T03:18:44.374Z",
  commit: "5960fbd33ea8771167cbd98e0b15576ee4fcc2d9",
  mode: "local",
  collectors: ["deploy", "claude_settings"],
  metrics: {
    "deploy.latest_build_minutes": {
      value: 4,
      detail: [{ label: "pages", value: 2, unit: "min" }, { label: "2026-11-28 03:14", value: 1, commit: "5960fbd", commit_from: "time" }],
      source: "npx wrangler deployments list --json; gh api the run's jobs",
      read_at: "2026-11-28T03:17:49.802Z",
      unit: "min",
    },
    "credits.unclaimed_free": { could_not_check: "no allowance to read", source: "params.allowances", unit: "allowances" },
    ...over,
  },
});

const kinds = (r) => check(r, { names: NAMES }).map((f) => f.kind);
const withLabel = (label) => run({ "deploy.latest_build_minutes": { ...run().metrics["deploy.latest_build_minutes"], detail: [{ label, value: 1 }] } });
const withSource = (source) => run({ "credits.unclaimed_free": { could_not_check: "no allowance to read", source } });

test("the committed local run has no finding", () => {
  const committed = JSON.parse(readFileSync(new URL(`../${DEFAULT_FILE}`, import.meta.url), "utf8"));
  assert.deepEqual(check(committed, { names: accountNames() }), []);
});

test("a run in the documented shape has no finding", () => {
  assert.deepEqual(check(run(), { names: NAMES }), []);
});

test("shape: an unknown key, a bad commit, a CI mode, a read metric without a value or source", () => {
  assert.ok(kinds({ ...run(), extra: 1 }).includes("shape: unknown top-level key"));
  assert.ok(kinds({ ...run(), commit: "5960fbd" }).includes("shape: not a 40-hex commit or null"));
  assert.ok(kinds({ ...run(), mode: "ci" }).includes("shape: not a local run"));
  assert.ok(kinds(run({ "a.b": { source: "x" } })).includes("shape: a read metric needs a finite value"));
  assert.ok(kinds(run({ "a.b": { value: 1 } })).includes("shape: a read metric needs a source"));
  assert.ok(kinds(run({ "a.b": { value: 1, source: "x", prompt: "hi" } })).includes("shape: unknown entry key"));
  assert.ok(kinds(run({ "a.b": { value: 1, source: "x", detail: [{ label: "x", text: "y" }] } })).includes("shape: unknown detail field"));
  assert.ok(kinds(run({ "a.b": { value: 1, source: "x", detail: [{ label: "x", value: { nested: 1 } }] } })).includes("shape: not a number, text, true, false or null"));
});

test("transcript or prompt text fails", () => {
  assert.ok(kinds(withLabel("first line\nsecond line")).includes("transcript or prompt text"));
  assert.ok(kinds(withLabel("<system-reminder>be brief")).includes("transcript or prompt text"));
  assert.ok(kinds(withLabel('{"role":"user"')).includes("transcript or prompt text"));
  assert.ok(kinds(withLabel("Human: fix the build")).includes("transcript or prompt text"));
  assert.ok(kinds(withLabel("a".repeat(121))).includes("text over 120 characters (transcript or prompt text)"));
});

test("a path under a home or temp folder fails", () => {
  assert.ok(kinds(withSource("/Users/someone/Developer/x/y.jsonl")).includes("home or temp path"));
  assert.ok(kinds(withSource("read from /home/someone/.claude")).includes("home or temp path"));
  assert.ok(kinds(withSource("checkout /private/tmp/run/git-crafter")).includes("home or temp path"));
  assert.ok(kinds(withSource("C:\\Users\\someone\\x")).includes("home or temp path"));
  assert.ok(kinds(withSource("~/.claude/projects/*-Users-someone-Developer-x*/**/*.jsonl")).includes("project folder name that spells a home path"));
  assert.ok(kinds(withLabel("memory/note.md: ~/Developer/space-peak")).includes("path under a home folder"));
  assert.deepEqual(kinds(withSource("~/.claude/projects/<this repo's project folder>/**/*.jsonl and ~/.claude/rules/*.md")), []);
});

test("an email address fails", () => {
  assert.ok(kinds(withLabel("author someone@example.org")).includes("email address"));
  assert.deepEqual(kinds(withLabel("axe-core@4.14.0")), []);
});

test("a key or token fails", () => {
  for (const s of [
    `ghp_${"a1B2".repeat(9)}`,
    `github_pat_${"a1B2".repeat(8)}`,
    `sk-ant-${"a1B2".repeat(8)}`,
    "AKIAABCDEFGHIJKLMNOP",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig",
    `Bearer ${"a1B2".repeat(5)}`,
    "Zm9vYmFyQmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRkdI",
  ]) assert.ok(kinds(withSource(s)).includes("key or token"), s);
  assert.deepEqual(kinds(withSource("commit 5960fbd33ea8771167cbd98e0b15576ee4fcc2d9")), []);
});

test("an account name fails, in any case", () => {
  assert.ok(kinds(withLabel("ExampleName's session")).includes("account name"));
  assert.ok(accountNames({ PRIVACY_NAMES: "Example Org, ab", CI: "true" }).includes("example org"));
  assert.ok(!accountNames({ PRIVACY_NAMES: "ab", CI: "true" }).includes("ab"));
});

test("scrub rewrites the local paths a collector leaves and nothing else", () => {
  const raw = run({
    "a.b": {
      value: 3,
      source: "~/.claude/projects/*-Users-<user>-Developer-X*/**/*.jsonl; checkout /private/tmp/claude-1/run/git-crafter)",
      detail: [{ label: "memory/note.md: ~/Developer/Space Peak", value: 2 }],
    },
  });
  assert.ok(check(raw, { names: NAMES }).length > 0);
  const clean = scrub(raw);
  assert.deepEqual(check(clean, { names: NAMES }), []);
  assert.equal(clean.metrics["a.b"].source, "~/.claude/projects/<this repo's project folder>/**/*.jsonl; checkout <a local path>)");
  assert.equal(clean.metrics["a.b"].detail[0].label, "memory/note.md: <a path under home>");
  assert.equal(clean.metrics["a.b"].value, 3);
  assert.deepEqual(clean.metrics["deploy.latest_build_minutes"], run().metrics["deploy.latest_build_minutes"]);
});

test("the page check finds a measured metric the page leaves out or shows as not measured", () => {
  const shown = '<details class="metric s-meets" id="m-deploy.latest_build_minutes"><summary>';
  assert.deepEqual(missingFromPage(run(), shown), []);
  assert.deepEqual(missingFromPage(run(), "<html></html>"), [{ id: "deploy.latest_build_minutes", why: "not on the page" }]);
  assert.deepEqual(missingFromPage(run(), shown.replace("s-meets", "s-not-measured")), [{ id: "deploy.latest_build_minutes", why: "shown as not measured" }]);
});
