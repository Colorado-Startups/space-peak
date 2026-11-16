import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { checkFileId, orgSchema } from "../../src/lib/orgs/schema";

const dir = new URL("../fixtures/orgs/", import.meta.url);
// The options Astro's YAML loader uses (@astrojs/internal-helpers/yaml), so dates arrive as Date objects.
const load = (name: string) => parse(readFileSync(new URL(name, dir), "utf8"), { customTags: ["timestamp"], merge: true, schema: "core" });
const valid = readdirSync(new URL("valid/", dir)).filter((f) => f.endsWith(".yaml"));
const base = load("valid/example-command.yaml");
type Case = { path: string; patch: Record<string, unknown> };
const cases: Case[] = load("invalid.yaml");

describe("orgs schema", () => {
  it.each(valid)("accepts valid/%s, whose id equals its filename", (file) => {
    const data = load(`valid/${file}`);
    expect(orgSchema.safeParse(data).error).toBeUndefined();
    expect(checkFileId(`valid/${file}`, data)).toBe(file.replace(".yaml", ""));
  });

  it("keeps a YAML date as an ISO date string", () => {
    expect(base.sources[0].read).toBeInstanceOf(Date);
    expect(orgSchema.parse(base).sources[0].read).toBe("2026-11-01");
  });

  it.each(cases)("rejects a bad $path", ({ path, patch }) => {
    if (patch.summary === "{long}") patch.summary = "x".repeat(201);
    const result = orgSchema.safeParse({ ...base, ...patch });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain(path);
  });

  it("rejects a .yml file, so none is skipped in silence", () => {
    expect(() => checkFileId("orgs/example-command.yml", base)).toThrow(/use the \.yaml extension/);
  });

  it("rejects an id that differs from the filename", () => {
    expect(() => checkFileId("orgs/other-name.yaml", base)).toThrow(/must equal the filename "other-name"/);
  });
});
