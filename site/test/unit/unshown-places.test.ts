// Issue #199. Paul, 2026-11-27: the site never shows the Blanca Peak or Crestones exclusions. No file the
// site serves and no /mcp result names either place, and every claims count matches the rows served.
// The register keeps its rows (src/lib/claims/served.ts). CI builds before it tests, so the last case
// reads every built file there, and fails if the build is missing.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { allClaims, type ClaimRow } from "../../src/lib/claims/parse";
import { servedClaims } from "../../src/lib/claims/served";
import { buildFiles, indexJson, registerDate } from "../../src/lib/data/build";
import { buildMapData } from "../../src/lib/map/data";
import { orgSchema } from "../../src/lib/orgs/schema";
import { twins } from "../../src/lib/twins";
import { mapGeojson } from "../../src/pages/data/map.geojson";
import { llmsTxt } from "../../src/pages/llms.txt";
import worker from "../../worker/mcp";
import { DIST_DIR, distExists } from "../dom/pages";

// Wider than the rule in served.ts on purpose. It needs no letter before or after a name, drops accents, and
// takes the gaps a URL or a page may put between words: a space, _, -, +, %20 or &nbsp;. Other spellings pass.
const GAP = String.raw`(?:[\s_+-]|%20|&nbsp;|&#160;)*`;
const NAMES = new RegExp(`blanca|crestone|sand${GAP}dunes?|sis${GAP}naa?s?j`, "i");
const names = (text: string) => NAMES.test(text.normalize("NFKD").replace(/\p{M}/gu, ""));
const named = (entries: [string, unknown][]) => entries.filter(([, body]) => names(JSON.stringify(body))).map(([where]) => where);
// The rows left out today. Pinned, so a rule or register change that moves one is a conscious edit here.
const DROPPED = ["S-17", "S-18", "S-19", "S-20", "G-06", "G-07", "E-07"];

const dir = new URL("../fixtures/orgs/valid/", import.meta.url);
const orgs = readdirSync(dir).filter((f) => f.endsWith(".yaml"))
  .map((f) => orgSchema.parse(parse(readFileSync(new URL(f, dir), "utf8"), { customTags: ["timestamp"], schema: "core" })));
const date = registerDate();
const files = buildFiles(orgs, allClaims(), date);
const mapData = buildMapData(orgs);
const served = new Map<string, string>([
  ...[...files].map(([p, body]): [string, string] => [`/data/${p}`, body]),
  ["/data/index.json", indexJson(files, date)],
  ["/data/map.geojson", JSON.stringify(mapGeojson(mapData))],
  ["/llms.txt", llmsTxt()],
  ...twins(mapData),
]);
const claims: { id: string }[] = JSON.parse(files.get("claims.json")!).claims;
const ids = allClaims().map((r) => r.id);

const VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientInfo": { name: "spacepeak-unit", version: "1.0.0" },
  "io.modelcontextprotocol/clientCapabilities": {},
};
// The Worker's ASSETS binding, answering from the files above as the static build would.
const ASSETS = {
  fetch: async (req: Request) => {
    const body = served.get(new URL(req.url).pathname);
    return body === undefined ? new Response(null, { status: 404 }) : new Response(body, { headers: { "Content-Type": "application/json" } });
  },
};

async function rpc(method: string, params: Record<string, unknown> = {}): Promise<any> {
  const name: Record<string, string> = typeof params.name === "string" ? { "Mcp-Name": params.name } : {};
  const res = await worker.fetch(new Request("http://localhost/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": VERSION, "Mcp-Method": method, ...name },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: META } }),
  }), { ASSETS });
  expect(res.status, `${method}: HTTP ${res.status}`).toBe(200);
  return (await res.json()).result;
}
const tool = async (name: string, args: Record<string, unknown> = {}) => [`${name} ${JSON.stringify(args)}`, await rpc("tools/call", { name, arguments: args })] as [string, any];
const body = ([, result]: [string, any]) => JSON.parse(result.content[0].text);

describe("Blanca Peak and the Crestones", () => {
  it("no /data/ file, Markdown twin or llms.txt names them, and the counts match the rows served", () => {
    expect(named([...served])).toEqual([]);
    expect(ids.filter((id) => DROPPED.includes(id))).toEqual(DROPPED);
    expect(claims.map((c) => c.id)).toEqual(ids.filter((id) => !DROPPED.includes(id)));
    const { total, by_status } = JSON.parse(files.get("metrics.json")!).claims;
    expect(total).toBe(claims.length);
    expect(Object.values<number>(by_status).reduce((a, b) => a + b, 0)).toBe(claims.length);
  });

  it("no /mcp result names them, and list_claims and get_claim serve only the rows served", async () => {
    const series = [...new Set(allClaims().map((r) => r.series))];
    const bySeries = await Promise.all(series.map((s) => tool("list_claims", { series: s, limit: 50 })));
    const byId = await Promise.all(allClaims().map((r) => tool("get_claim", { id: r.id })));
    const results: [string, unknown][] = [
      ["server/discover", await rpc("server/discover")], ["tools/list", await rpc("tools/list")],
      await tool("list_claims", { limit: 50 }), ...bySeries, ...byId,
      await tool("get_metrics"), await tool("region_info"), await tool("region_info", { lat: 37.57757, lon: -105.48561 }),
      await tool("search_orgs", { query: "Blanca Crestone Sand Dunes Sisnaajini", limit: 50 }), await tool("search_orgs", { limit: 50 }),
      ...(await Promise.all(orgs.map((o) => tool("get_org", { id: o.id })))),
    ];
    expect(named(results)).toEqual([]);
    expect(bySeries.reduce((n, r) => n + body(r).total, 0)).toBe(claims.length);
    expect(byId.filter(([, r]) => !r.isError).map((r) => body(r).id)).toEqual(claims.map((c) => c.id));
    expect(body(await tool("get_metrics")).claims.total).toBe(claims.length);
  });

  it("the rule and this test catch each spelling, and keep a row that names neither place", () => {
    const row = (claim: string): ClaimRow => ({ id: "X-01", series: "X", section: "Fixture", claim, status: "unverified", source: "", notes: "" });
    const spellings = ["Blanca Peak", "Crestone Peak", "the Crestones", "Great Sand Dunes", "Great_Sand_Dunes", "sand-dunes", "a Sand Dune",
      "Sisnaajini", "Sisnaajiní", "Sis Naajiní", "Tsisnaasjiní"];
    expect(servedClaims(spellings.map(row))).toEqual([]);
    expect(spellings.filter((s) => !names(s))).toEqual([]);
    expect(servedClaims([row("Casablanca"), row("Culebra Peak")]).map((r) => r.claim)).toEqual(["Casablanca", "Culebra Peak"]);
  });

  // Binary media cannot hold the names as text; everything else the build serves is read as UTF-8.
  const BINARY = /\.(avif|gif|ico|jpe?g|mp4|otf|pdf|png|ttf|wasm|webm|webp|woff2?)$/i;
  it.runIf(distExists() || !!process.env.CI)("no built file names them", () => {
    const built = (readdirSync(DIST_DIR, { recursive: true, withFileTypes: true }))
      .filter((e) => e.isFile() && !BINARY.test(e.name))
      .map((e): [string, string] => [path.relative(DIST_DIR, path.join(e.parentPath, e.name)), readFileSync(path.join(e.parentPath, e.name), "utf8")]);
    expect(built.length).toBeGreaterThan(0);
    expect(built.filter(([, text]) => names(text)).map(([file]) => file)).toEqual([]);
  });
});
