// The /data/ GET handlers (src/lib/data/serve.ts): each serves the file build.ts builds, with its media type.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { allClaims } from "../../src/lib/claims/parse";
import { buildFiles, indexJson, registerDate } from "../../src/lib/data/build";
import { orgSchema } from "../../src/lib/orgs/schema";

const dir = new URL("../fixtures/orgs/valid/", import.meta.url);
const orgs = readdirSync(dir)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => orgSchema.parse(parse(readFileSync(new URL(f, dir), "utf8"), { customTags: ["timestamp"], schema: "core" })));
vi.mock("astro:content", () => ({ getCollection: async () => orgs.map((data) => ({ data })) }));
const { serve, serveIndex } = await import("../../src/lib/data/serve");
const files = buildFiles(orgs, allClaims(), registerDate());

describe("the /data/ handlers", () => {
  it.each([
    ["orgs.csv", "text/csv"],
    ["orgs.json", "application/json"],
    ["orgs.geojson", "application/geo+json"],
  ])("%s serves the built file as %s", async (path, type) => {
    const res = await serve(path)();
    expect(res.headers.get("Content-Type")).toBe(`${type}; charset=utf-8`);
    expect(await res.text()).toBe(files.get(path));
  });

  it("index.json serves the index of every built file", async () => {
    const res = await serveIndex();
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(await res.text()).toBe(indexJson(files, registerDate()));
  });
});
