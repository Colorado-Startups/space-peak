// Vitest loads CSS imports empty, so these pass tokens.css's text in; the build reads it through ?raw,
// and a token it lacks there throws, which fails the build.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokenValue } from "../../src/lib/tokens";

const CSS = readFileSync(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");

describe("tokenValue", () => {
  it("reads --size-wrap from tokens.css", () => expect(tokenValue("--size-wrap", CSS)).toMatch(/^\d+px$/));
  it("reads the exact name, not one that ends with it", () =>
    expect(tokenValue("--wrap", ":root { --size-wrap: 1px; --wrap: 2px; }")).toBe("2px"));
  it("throws on a token the file lacks", () => expect(() => tokenValue("--no-such-token", CSS)).toThrow("tokens.css has no --no-such-token"));
});
