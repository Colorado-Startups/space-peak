import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHEMAS } from "../../src/lib/data/build";
import { buildMapData } from "../../src/lib/map/data";
import { liveLinks } from "../../src/lib/nav";
import { twinPath, twins } from "../../src/lib/twins";
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
