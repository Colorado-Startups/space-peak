import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLAUDE_STEPS, DOCS, snippets } from "../../src/lib/ai/connect";
import { SCHEMAS } from "../../src/lib/data/build";
import { buildMapData } from "../../src/lib/map/data";
import { liveLinks } from "../../src/lib/nav";
import { DOCS_READ, twinPath, twins } from "../../src/lib/twins";
import { dataFiles, GET, llmsTxt } from "../../src/pages/llms.txt";

const SITE = "https://spacepeak.co";
const txt = llmsTxt();
const catalog = JSON.parse(readFileSync(new URL("../../public/.well-known/api-catalog", import.meta.url), "utf8"));
const links = [...txt.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]);
const catalogUrls: string[] = catalog.linkset.flatMap((set: Record<string, unknown>) =>
  [set.anchor, ...Object.values(set).filter(Array.isArray).flat().map((l) => (l as { href: string }).href)]);
const mapData = buildMapData([]);

describe("llms.txt", () => {
  it("follows llmstxt.org: H1, blockquote, then H2 lists of [name](url): notes, Optional last", async () => {
    const lines = txt.split("\n");
    expect(lines.slice(0, 3)).toEqual(["# Space Peak", "", expect.stringMatching(/^> .*Colorado Startups region for Colorado Springs and Fountain.*speculative/)]);
    const h2 = lines.filter((l) => l.startsWith("## "));
    expect(h2).toEqual(["## Pages", "## Open data", "## Schemas", "## Tools", "## Optional"]);
    expect(lines.filter((l) => l.startsWith("#")).length).toBe(h2.length + 1);
    for (const l of lines.slice(lines.indexOf("## Pages"))) expect(l).toMatch(/^(|## .+|- \[[^\]]+\]\(https:\/\/[^)\s]+\): .+)$/);
    expect(txt).not.toMatch(/—|\s–\s/);
    expect((await GET({} as Parameters<typeof GET>[0])).headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("links every twin, every /data/ file, every schema, /mcp and the CC0 licence", () => {
    for (const path of twins(mapData).keys()) expect(links).toContain(`${SITE}${path}`);
    for (const p of dataFiles()) expect(links).toContain(`${SITE}/data/${p}`);
    for (const n of Object.keys(SCHEMAS)) expect(links).toContain(`${SITE}/data/schemas/${n}.json`);
    expect(links).toEqual(expect.arrayContaining([`${SITE}/mcp`, "https://creativecommons.org/publicdomain/zero/1.0/"]));
  });
});

describe("Markdown twins", () => {
  it("twins the home page and each live page, each an H1 with the open-data footer", () => {
    const all = twins(mapData, [{ href: "/map/", label: "Map" }, { href: "/about/", label: "About" }]);
    expect([...all.keys()]).toEqual(["/index.md", "/map/index.md", "/about/index.md"]);
    for (const body of all.values()) expect(body).toMatch(/^# .+\n[\s\S]*## Open data\n[\s\S]*CC0/);
    expect(all.get("/map/index.md")).toContain("## Summits (speculative)");
    expect([...twins(mapData).keys()]).toEqual(["/", ...liveLinks().map((l) => l.href)].map(twinPath));
  });

  // The /ai/ twin and the /ai/ page share lib/ai/connect.ts, so an AI reading the twin gets every snippet.
  const ai = twins(mapData).get("/ai/index.md")!;
  const s = snippets(SITE);
  const fences = (lang: string) => [...ai.matchAll(new RegExp(`^\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\`$`, "gm"))].map((m) => m[1]);

  it("/ai/ twin holds every URL, command, Claude step and doc link the page shows", () => {
    expect(ai).toMatch(/^# Use it with your AI\n\n> Free\. No key\. Read-only\. CC0\.\n/);
    expect(ai.match(/^## .+$/gm)).toEqual(["## Any chat", "## Claude", "## Claude Code", "## OpenCode", `## Docs (read ${DOCS_READ})`, "## Open data"]);
    expect(readFileSync(new URL("../../src/lib/ai/connect.ts", import.meta.url), "utf8")).toContain(`read on ${DOCS_READ}`);
    for (const u of [s.llms, s.site, s.mcp, s.catalog]) expect(ai).toContain(u);
    CLAUDE_STEPS.forEach((step, i) => expect(ai).toContain(`\n${i + 1}. ${step}\n`));
    for (const [name, href] of DOCS) expect(ai).toContain(`- [${name}](${href})`);
    expect(fences("bash")).toEqual([s.claudeCode, s.opencode]);
    expect(ai).not.toContain("Read the full page at");
    expect(ai).not.toMatch(/—|\s–\s/);
  });

  it("/ai/ twin holds both OpenCode configs, and each fenced json block parses", () => {
    const blocks = fences("json");
    expect(blocks).toEqual([s.opencodeV2, s.opencodeV1]);
    expect(blocks.map((b) => JSON.parse(b))).toEqual([JSON.parse(s.opencodeV2), JSON.parse(s.opencodeV1)]);
    expect(ai.match(/^```/gm)).toHaveLength(2 * (blocks.length + 2));
  });
});

describe("API catalog (RFC 9727)", () => {
  it("is a linkset anchored at its well-known URI, listing /mcp and the data with every schema", () => {
    expect(catalog.linkset[0].anchor).toBe(`${SITE}/.well-known/api-catalog`);
    expect(catalog.linkset[0].item.map((i: { href: string }) => i.href)).toEqual([`${SITE}/mcp`, `${SITE}/data/index.json`]);
    for (const n of Object.keys(SCHEMAS)) expect(catalogUrls).toContain(`${SITE}/data/schemas/${n}.json`);
    expect(catalogUrls).toContain(`${SITE}/llms.txt`);
  });
});

// CI builds before it tests. /mcp is served by the Worker, not the static build.
const dist = new URL("../../dist/", import.meta.url);
describe.runIf(existsSync(dist))("in the build", () => {
  it.each([["llms.txt", links], ["api-catalog", catalogUrls]] as const)("every %s link on spacepeak.co resolves", (_, urls) => {
    const paths = urls.filter((u) => u.startsWith(`${SITE}/`) && u !== `${SITE}/mcp`).map((u) => new URL(u).pathname);
    const file = (p: string) => new URL(`.${p.endsWith("/") ? `${p}index.html` : p}`, dist);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => !existsSync(file(p)))).toEqual([]);
  });
});
