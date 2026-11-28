// /mcp: spacepeak.co's keyless, read-only MCP server (Streamable HTTP 2026-07-28, stateless).
// wrangler.jsonc runs this Worker first only for /mcp, so every other request stays a free static asset.
// The tools read the built /data/*.json files through the ASSETS binding; nothing is written anywhere.
// Shaped like Colorado-Startups/coloradostartups.org site/worker/mcp/.
import { createMcpHandler, localhostAllowedHostnames, McpServer, originValidationResponse } from "@modelcontextprotocol/server";
import * as z from "zod";
import { CITIES, KINDS } from "../src/lib/orgs/kinds";

// The same list as STATUSES in src/lib/claims/parse.ts, which the Worker cannot import (it reads the register with ?raw).
const CLAIM_STATUSES = ["unverified", "verified", "corrected", "unverifiable", "open"] as const;
const SITE_HOSTS = ["spacepeak.co", "www.spacepeak.co"];
const MAX = 50;
const MAX_BODY = 64 * 1024;
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const LABELS = "Every item carries its status and its read date. Repeat each status to the user; when it is unverified, say \"unverified\" beside the claim, every time.";

interface Assets { fetch(request: Request): Promise<Response> }
interface Env { ASSETS?: Assets }
type Source = { id: string; url: string; publisher: string; read: string };
type Org = { id: string; name: string; summary: string; kind: string; subkind: string; city: string; area: string; status: string;
  fact: { text: string; source: string }; sources: Source[]; location: { lat: number; lon: number; precision: string } };
type Claim = { id: string; series: string; section: string; site?: string; claim: string; status: string; source: string; notes: string };
type Ring = [number, number][];
interface OpenData { generated: string; orgs: Org[]; claims: Claim[]; metrics: unknown; loop: { name: string; roads: string[]; ring: Ring; note: string; source_url: string } | null }

const EMPTY: OpenData = { generated: "", orgs: [], claims: [], metrics: null, loop: null };
let cached: Promise<OpenData> | null = null;

async function read(assets: Assets, path: string): Promise<any> {
  const res = await assets.fetch(new Request(`https://assets.invalid/data/${path}`));
  if (!res.ok) throw new Error(`/data/${path}: HTTP ${res.status}`);
  return res.json();
}

/** The open data, read once per isolate. A failed read is not kept, so the next request tries again. */
function loadData(assets: Assets | undefined): Promise<OpenData> {
  if (!assets) return Promise.resolve(EMPTY);
  cached ??= Promise.all(["orgs.json", "claims.json", "metrics.json", "map.geojson"].map((p) => read(assets, p)))
    .then(([o, c, metrics, map]) => {
      if (!Array.isArray(o.orgs) || !Array.isArray(c.claims) || !Array.isArray(map.features)) throw new Error("/data/: unexpected shape");
      const r = map.features.find((f: any) => f.properties?.layer === "region" && f.geometry?.type === "Polygon");
      const loop = r ? { name: r.properties.name, roads: r.properties.roads, ring: r.geometry.coordinates[0], note: r.properties.note, source_url: r.properties.source_url } : null;
      return { generated: c.generated, orgs: o.orgs, claims: c.claims, metrics, loop };
    })
    .catch((err: unknown) => {
      console.error(JSON.stringify({ msg: "mcp: open data unavailable", err: String(err) }));
      cached = null;
      return EMPTY;
    });
  return cached;
}

const words = (s: string) => s.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]{2,}/gu) ?? [];
const latestRead = (o: Org) => o.sources.map((s) => s.read).sort().at(-1) ?? "";
const orgItem = (o: Org) => ({ id: o.id, name: o.name, kind: o.kind, subkind: o.subkind, city: o.city, summary: o.summary, status: o.status, read: latestRead(o), url: `https://spacepeak.co/data/orgs.json#${o.id}` });
const claimItem = (c: Claim, read: string) => ({ ...c, read });
const text = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });
const missing = (what: string, tool: string) => ({ ...text({ error: `No ${what} with that id. Use ${tool} to find one.` }), isError: true });

/** Ray casting; the ring is [lon, lat] pairs. */
function inside([x, y]: [number, number], ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const INSTRUCTIONS = [
  "Space Peak (spacepeak.co) is a speculative venture thesis for a mass driver in a Colorado peak, and an open map of the Colorado Springs space region.",
  "This server is read-only and needs no key. It reads the site's open data under CC0: organisations, the claims register and metrics.",
  `Each list returns at most ${MAX} items. ${LABELS}`,
  "Most claims are unverified. Never present an unverified claim as fact.",
].join(" ");

export function buildServer(data: OpenData): McpServer {
  const server = new McpServer({ name: "spacepeak", title: "Space Peak", version: "1.0.0" }, { instructions: INSTRUCTIONS });
  const limit = z.int().min(1).max(MAX).optional().describe(`At most this many items, 1 to ${MAX}; 10 when left out`);
  const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100);

  server.registerTool("search_orgs", {
    title: "Search Space Peak organisations",
    description: `Command bases, institutions and companies in the Colorado Springs region, filtered by words, kind and city. ${LABELS}`,
    inputSchema: z.object({
      query: z.string().max(200).optional().describe("Words to look for in the name, summary and fact"),
      kind: z.enum(KINDS).optional(), city: z.enum(CITIES).optional(), limit,
    }),
    annotations: READ_ONLY,
  }, async ({ query, kind, city, limit: n }) => {
    const q = [...new Set(words(query ?? ""))];
    const hits = data.orgs.filter((o) => (!kind || o.kind === kind) && (!city || o.city === city))
      .map((o) => ({ o, score: q.filter((w) => words(`${o.name} ${o.summary} ${o.subkind} ${o.fact.text}`).some((x) => x.startsWith(w))).length }))
      .filter((h) => q.length === 0 || h.score > 0).sort((a, b) => b.score - a.score || a.o.id.localeCompare(b.o.id));
    return text({ total: hits.length, orgs: hits.slice(0, n ?? 10).map((h) => orgItem(h.o)) });
  });

  server.registerTool("get_org", {
    title: "One Space Peak organisation",
    description: `One organisation's full record: kind, city, located point and precision, its sourced fact and every source with its read date. Find the id with search_orgs. ${LABELS}`,
    inputSchema: z.object({ id: id.describe("The organisation id, such as 'uccs'") }),
    annotations: READ_ONLY,
  }, async ({ id: want }) => {
    const o = data.orgs.find((x) => x.id === want);
    return o ? text({ ...o, read: latestRead(o) }) : missing("organisation", "search_orgs");
  });

  server.registerTool("list_claims", {
    title: "Space Peak claims register",
    description: `Claims the thesis makes about a peak or the region, from 02_substance/claims_register.md, filtered by series letter and status. read is the date the register last changed. ${LABELS}`,
    inputSchema: z.object({
      series: z.string().regex(/^[A-Z]$/).optional().describe("One series letter, such as 'S' for summits or 'R' for the region"),
      status: z.enum(CLAIM_STATUSES).optional(), limit,
    }),
    annotations: READ_ONLY,
  }, async ({ series, status, limit: n }) => {
    const rows = data.claims.filter((c) => (!series || c.series === series) && (!status || c.status === status));
    return text({ total: rows.length, claims: rows.slice(0, n ?? 10).map((c) => claimItem(c, data.generated)) });
  });

  server.registerTool("get_claim", {
    title: "One Space Peak claim",
    description: `One claim from the register by id, with its status, source and notes. ${LABELS}`,
    inputSchema: z.object({ id: z.string().regex(/^[A-Z]-\d{1,4}$/).describe("The claim id, such as 'S-01'") }),
    annotations: READ_ONLY,
  }, async ({ id: want }) => {
    const c = data.claims.find((x) => x.id === want);
    return c ? text(claimItem(c, data.generated)) : missing("claim", "list_claims");
  });

  server.registerTool("get_metrics", {
    title: "Space Peak metrics",
    description: "Counts from the open data: organisations by kind and city, and claims by status. A count of verified claims is not a claim itself.",
    inputSchema: z.object({}),
    annotations: READ_ONLY,
  }, async () => text(data.metrics ?? { error: "metrics unavailable" }));

  server.registerTool("region_info", {
    title: "The Space Peak region",
    description: `The Colorado Startups region loop around Colorado Springs and Fountain: its name, roads and source, with the region claims (series R). Give lat and lon to learn whether a point is inside the loop. The loop is a proposal, not a legal line or a launch site. ${LABELS}`,
    inputSchema: z.object({ lat: z.number().min(-90).max(90).optional(), lon: z.number().min(-180).max(180).optional() }),
    annotations: READ_ONLY,
  }, async ({ lat, lon }) => {
    if (!data.loop) return { ...text({ error: "region unavailable" }), isError: true };
    const { ring, ...loop } = data.loop;
    const point = lat !== undefined && lon !== undefined ? { inside_loop: inside([lon, lat], ring) } : {};
    const claims = data.claims.filter((c) => c.series === "R").slice(0, MAX).map((c) => claimItem(c, data.generated));
    return text({ ...loop, ...point, claims });
  });

  return server;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") return env.ASSETS ? env.ASSETS.fetch(request) : new Response(null, { status: 404 });
    // DNS-rebinding rule: the Host must be the site, a workers.dev preview or localhost (wrangler dev),
    // and a browser Origin must be that same host or the site's own. Claude Code sends no Origin.
    const host = url.hostname;
    if (![...SITE_HOSTS, ...localhostAllowedHostnames()].includes(host) && !host.endsWith(".workers.dev"))
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Host not allowed" } }, { status: 403 });
    const rejected = originValidationResponse(request, [...SITE_HOSTS, host]);
    if (rejected) return rejected;
    // JSON-RPC 2.0: invalid JSON is -32700. The SDK's 2025 fallback answers -32600, so check here.
    // Only a body whose declared length is within the cap is read; the SDK answers 413 past it.
    const length = Number(request.headers.get("Content-Length") ?? NaN);
    if (request.method === "POST" && length <= MAX_BODY) {
      try {
        JSON.parse(await request.clone().text());
      } catch {
        return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
      }
    }
    try {
      const data = await loadData(env.ASSETS);
      return await createMcpHandler(() => buildServer(data), {
        legacy: "stateless", responseMode: "json", maxRequestBodySize: MAX_BODY,
        onerror: (err) => console.error(JSON.stringify({ msg: "mcp", err: err.message })),
      }).fetch(request);
    } catch (err) {
      console.error(JSON.stringify({ msg: "mcp failed", err: String(err) }));
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "unavailable" } }, { status: 503 });
    }
  },
};
