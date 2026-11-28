// /mcp over `wrangler dev` (the second webServer in playwright.config.ts): the six tools, the limit cap,
// malformed bodies, the Origin rule, and the MCP conformance suite at the 2026-07-28 requirements.
// CI only; nothing runs it on this Mac. After the specs, ci.yml's standard job tallies the suite's
// results and conformance-baseline.yml into the notice ai.mcp_conformance_share reads
// (quality/collectors/space-peak.mjs --mcp-notice), so keep those two names.
import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { MCP_URL } from "../playwright.config";
import notApplicable from "./mcp-not-applicable.json" with { type: "json" };

const VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientInfo": { name: "spacepeak-e2e", version: "1.0.0" },
  "io.modelcontextprotocol/clientCapabilities": {},
};
const TOOLS = ["get_claim", "get_metrics", "get_org", "list_claims", "region_info", "search_orgs"];

// The checks that do not apply to this read-only, tools-only server, each with what it needs and why, from
// one reviewed list (test/unit/mcp-not-applicable.test.ts holds each to the server). They go to the suite as
// its expected failures: it exits 1 on any other failure, and on an entry here that starts to pass.
const BASELINE = notApplicable.checks.map((c) => c.check);

const rpc = (method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) => ({
  headers: {
    "Content-Type": "application/json", Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": VERSION, "Mcp-Method": method,
    ...(typeof params.name === "string" ? { "Mcp-Name": params.name } : {}), ...headers,
  },
  data: { jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: META } },
});

test("tools/list returns the six read-only tools", async ({ request }) => {
  const res = await request.post(MCP_URL, rpc("tools/list"));
  expect(res.status()).toBe(200);
  const tools = (await res.json()).result.tools as { name: string; annotations: { readOnlyHint: boolean } }[];
  expect(tools.map((t) => t.name).sort()).toEqual(TOOLS);
  for (const t of tools) expect(t.annotations.readOnlyHint).toBe(true);
});

test("a tool answers from the built /data files", async ({ request }) => {
  const res = await request.post(MCP_URL, rpc("tools/call", { name: "get_metrics", arguments: {} }));
  const body = JSON.parse((await res.json()).result.content[0].text);
  expect(body.claims.total).toBeGreaterThan(0);
});

// The SDK catches a bad argument's -32602 and answers it as a tool result with isError, on HTTP 200.
test("list_claims with limit 51 is an input validation error", async ({ request }) => {
  const res = await request.post(MCP_URL, rpc("tools/call", { name: "list_claims", arguments: { limit: 51 } }));
  expect(res.status()).toBe(200);
  const { result } = await res.json();
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toMatch(/^Input validation error: Invalid arguments for tool list_claims/);
});

test("list_claims with limit 50 returns at most 50 claims", async ({ request }) => {
  const res = await request.post(MCP_URL, rpc("tools/call", { name: "list_claims", arguments: { limit: 50 } }));
  const { result } = await res.json();
  expect(result.isError).toBeFalsy();
  const body = JSON.parse(result.content[0].text);
  expect(body.claims.length).toBe(Math.min(body.total, 50));
});

// Bytes, not a string: with a JSON Content-Type, Playwright quotes a string that is not valid JSON.
for (const [raw, code] of [["{", -32700], ["[]", -32600]] as const) {
  test(`the raw body ${raw} gets 400 and a JSON-RPC error`, async ({ request }) => {
    const res = await request.post(MCP_URL, { headers: rpc("tools/list").headers, data: Buffer.from(raw) });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error.code).toBe(code);
  });
}

test("a bad Origin gets 403 and the site's own Origin does not", async ({ request }) => {
  expect((await request.post(MCP_URL, rpc("tools/list", {}, { Origin: "https://evil.example" }))).status()).toBe(403);
  expect((await request.post(MCP_URL, rpc("tools/list", {}, { Origin: "https://spacepeak.co" }))).status()).toBe(200);
});

test("GET is 405 and a body over 64 KiB is 413", async ({ request }) => {
  expect((await request.get(MCP_URL)).status()).toBe(405);
  const big = rpc("tools/list");
  expect((await request.post(MCP_URL, { headers: big.headers, data: "x".repeat(65 * 1024) })).status()).toBe(413);
});

test("MCP conformance at the 2026-07-28 requirements", async ({}, testInfo) => {
  test.setTimeout(300_000);
  const baseline = testInfo.outputPath("conformance-baseline.yml");
  writeFileSync(baseline, `server:\n${BASELINE.map((b) => `  - ${b}\n`).join("")}`);
  const args = ["-y", "@modelcontextprotocol/conformance@0.2.0-alpha.12", "server", "--url", MCP_URL,
    "--requirements", VERSION, "--expected-failures", baseline, "-o", testInfo.outputPath("results")];
  const run = await promisify(execFile)("npx", args, { cwd: testInfo.outputDir, timeout: 280_000, maxBuffer: 16 << 20 })
    .then((r) => ({ code: 0, out: r.stdout }), (e) => ({ code: e.code ?? 1, out: `${e.stdout}\n${e.stderr}` }));
  await testInfo.attach("conformance.txt", { body: run.out, contentType: "text/plain" });
  expect(run.code, run.out.slice(-4000)).toBe(0);
});
