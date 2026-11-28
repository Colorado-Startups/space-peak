// Issue #124: data/launch.yaml holds structure and claim IDs only, and a claim the register lacks fails the build.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getClaim } from "../../src/lib/claims/parse";
import { launch, markOf, parseLaunch } from "../../src/lib/launch/data";

const file = readFileSync(new URL("../../../data/launch.yaml", import.meta.url), "utf8");
const make = (claim: string, label = "Portal") => `profile:\n  - { at: portal, label: ${label}, claim: ${claim} }\nmake_or_break: [P-06]\n`;

describe("data/launch.yaml", () => {
  it("parses, and every claim it cites is a register row", () => {
    const data = launch();
    expect(data.profile.length).toBeGreaterThan(0);
    for (const id of [...data.profile.map((e) => e.claim), ...data.make_or_break]) expect(getClaim(id).id).toBe(id);
  });

  it("fails on a claim the register does not have", () => {
    expect(() => parseLaunch(make("Z-999"))).toThrow(/no row Z-999/);
    expect(() => parseLaunch(make("I-02").replace("[P-06]", "[P-99]"))).toThrow(/no row P-99/);
  });

  it("holds no bare number: digits appear only in claim IDs", () => {
    expect(file.replace(/^#.*$/gm, "").replace(/\b[A-Z]-\d+\b/g, "")).not.toMatch(/\d/);
    expect(() => parseLaunch(make("I-02", "'9,000 ft'"))).toThrow(/no bare number/);
  });

  it("marks each point once, and only points the drawing has", () => {
    expect(() => parseLaunch(make("I-02").replace("make_or_break", "  - { at: portal, label: Again, claim: I-05 }\nmake_or_break"))).toThrow(/once/);
    expect(() => parseLaunch(make("I-02").replace("at: portal", "at: summit"))).toThrow();
  });

  it("letters the key from A", () => expect([0, 1, 5].map(markOf)).toEqual(["A", "B", "F"]));
});
