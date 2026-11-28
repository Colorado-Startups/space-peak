// Issue #131: each snippet in the shape its app's docs give (read 2026-11-27), on the canonical origin.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SERVER, snippets } from "../../src/lib/ai/connect";

const s = snippets("https://spacepeak.co");
const remote = { type: "remote", url: "https://spacepeak.co/mcp" };

describe("AI snippets", () => {
  it("use the origin they are given", () => {
    expect([s.site, s.llms, s.mcp, s.catalog]).toEqual(
      ["https://spacepeak.co/", "https://spacepeak.co/llms.txt", "https://spacepeak.co/mcp", "https://spacepeak.co/data/catalog.json"]);
    expect(snippets(new URL("https://example.test/")).mcp).toBe("https://example.test/mcp");
  });

  it("commands match the documented shapes", () => {
    // code.claude.com/docs/en/mcp: claude mcp add --transport http <name> <url>
    expect(s.claudeCode.split(" ")).toEqual(["claude", "mcp", "add", "--transport", "http", SERVER, s.mcp]);
    // opencode.ai/docs/mcp-servers: opencode mcp add <name> --url <url>
    expect(s.opencode.split(" ")).toEqual(["opencode", "mcp", "add", SERVER, "--url", s.mcp]);
  });

  it("both OpenCode configs parse, in their documented shapes", () => {
    expect(JSON.parse(s.opencodeV2)).toEqual({ mcp: { servers: { [SERVER]: remote } } });
    expect(JSON.parse(s.opencodeV1)).toEqual({ mcp: { [SERVER]: { ...remote, enabled: true } } });
  });

  it("name the server as the Worker names itself", () => {
    expect(readFileSync(new URL("../../worker/mcp.ts", import.meta.url), "utf8")).toContain(`{ name: "${SERVER}"`);
  });
});
