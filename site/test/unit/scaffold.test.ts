import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAV, liveLinks, pageExists } from "../../src/lib/nav";

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

describe("scaffold", () => {
  it("renders a nav link only once its page exists", () => {
    expect(pageExists("/")).toBe(true);
    expect(liveLinks([])).toEqual([]);
    expect(liveLinks(["../pages/map.astro"])).toEqual([NAV[0]]);
    expect(liveLinks(["../pages/map/index.astro"])).toEqual([NAV[0]]);
    expect(liveLinks(["../pages/guide/index.astro", "../pages/about.astro"]).map((l) => l.href)).toEqual(["/guide/", "/about/"]);
    expect(NAV.map((l) => l.href)).toEqual(["/map/", "/guide/", "/launch/", "/ai/", "/about/"]);
  });

  it("serves site/dist as static assets, runs the Worker only for /mcp, workers.dev and previews on", () => {
    const config = JSON.parse(read("wrangler.jsonc").replace(/^\s*\/\/.*$/gm, ""));
    expect(config).toMatchObject({ name: "spacepeak", workers_dev: true, preview_urls: true, previews: {} });
    expect(config.main).toBe("./site/worker/mcp.ts");
    // Asset requests are free; any other path in run_worker_first would spend the Free plan's invocations.
    const assets = { directory: "./site/dist", binding: "ASSETS", html_handling: "auto-trailing-slash", not_found_handling: "404-page", run_worker_first: ["/mcp"] };
    expect(config.assets).toEqual(assets);
  });

  it("pins every dependency exactly, on Node 26, one workspace and strict dev port 3320", () => {
    const site = JSON.parse(read("site/package.json"));
    for (const [name, v] of Object.entries({ ...site.dependencies, ...site.devDependencies }))
      expect(v, name).toMatch(/^\d+\.\d+\.\d+$/);
    expect(JSON.parse(read("package.json")).workspaces).toEqual(["site"]);
    expect(read(".nvmrc").trim()).toBe("26");
    expect(read("site/astro.config.mjs")).toMatch(/port: 3320[\s\S]*strictPort: true/);
  });
});
