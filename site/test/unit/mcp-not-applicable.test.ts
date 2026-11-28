// The MCP conformance checks e2e/mcp-not-applicable.json marks not applicable, held to the server itself:
// each must need a capability, a tool or a schema keyword that /mcp truly lacks. The Worker answers here
// with no ASSETS binding, so it serves its six tools over empty data; capabilities and tool schemas do not
// depend on the data.
import { describe, expect, it } from "vitest";
import list from "../../e2e/mcp-not-applicable.json" with { type: "json" };
import worker from "../../worker/mcp";

const VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientInfo": { name: "spacepeak-unit", version: "1.0.0" },
  "io.modelcontextprotocol/clientCapabilities": {},
};

async function call(method: string): Promise<any> {
  const res = await worker.fetch(new Request("http://localhost/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": VERSION, "Mcp-Method": method },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { _meta: META } }),
  }), {});
  expect(res.status, `${method}: HTTP ${res.status}`).toBe(200);
  return (await res.json()).result;
}

type Tool = { name: string; inputSchema: { properties?: Record<string, Record<string, unknown>> } };

describe("MCP checks marked not applicable", async () => {
  const { capabilities } = await call("server/discover");
  const tools: Tool[] = (await call("tools/list")).tools;

  it("declares a tool list that never changes", () => {
    expect(capabilities.tools).toEqual({ listChanged: false });
    expect(tools.map((t) => t.name).sort()).toEqual(["get_claim", "get_metrics", "get_org", "list_claims", "region_info", "search_orgs"]);
  });

  it("names each check once, with what it needs and why", () => {
    const ids = list.checks.map((c) => c.check);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of list.checks) {
      expect(c.check).toMatch(/^[a-z0-9-]+(:[a-z0-9-]+)?$/);
      expect(c.needs).toMatch(/^(tool|capability|schema):\S/);
      expect(c.why.trim().length, c.check).toBeGreaterThan(10);
    }
  });

  it.each(list.checks)("$check needs $needs, which /mcp lacks", ({ needs }) => {
    const [kind, name] = [needs.slice(0, needs.indexOf(":")), needs.slice(needs.indexOf(":") + 1)];
    if (kind === "tool") expect(tools.map((t) => t.name)).not.toContain(name);
    if (kind === "schema") expect(tools.filter((t) => Object.values(t.inputSchema.properties ?? {}).some((p) => name in p)).map((t) => t.name)).toEqual([]);
    if (kind === "capability") {
      const [top, ...rest] = name.split(".");
      const held = rest.length ? capabilities[top]?.[rest.join(".")] : capabilities[top];
      expect(held, `server/discover declares ${name}`).toBeUndefined();
    }
  });
});
