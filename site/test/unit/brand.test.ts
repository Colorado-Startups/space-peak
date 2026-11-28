import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLAN, lightOnly } from "../../../scripts/brand/pull.mjs";

const path = (p: string) => new URL(`../../../${p}`, import.meta.url);
const read = (p: string) => readFileSync(path(p), "utf8");
const sha256 = (p: string) => createHash("sha256").update(readFileSync(path(p))).digest("hex");
const lock = JSON.parse(read("brand.lock.json"));

// WCAG 2 contrast ratio of two #RRGGBB colours.
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b2);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const token = (css: string, name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];

describe("brand pull", () => {
  it("pins Colorado-Startups/brand v4.4.0 and plans every locked file", () => {
    expect(lock).toMatchObject({ repo: "Colorado-Startups/brand", tag: "v4.4.0" });
    expect(Object.keys(lock.files).sort()).toEqual(Object.keys(PLAN).sort());
  });

  it("every committed output matches its sha256 in the lock", () => {
    expect(Object.keys(lock.outputs).length).toBe(11);
    for (const [p, want] of Object.entries(lock.outputs)) expect(sha256(p), p).toBe(want);
  });

  it("copies keep the release's hash; springs-720 over 60 KB or springs-680 over 30 KB warns", () => {
    for (const [src, plan] of Object.entries(PLAN as Record<string, { out: string; widths?: number[]; css?: boolean }>))
      if (!plan.widths && !plan.css) expect(lock.outputs[plan.out], src).toBe(lock.files[src]);
    for (const [file, kb] of [["springs-720", 60], ["springs-680", 30]] as const) {
      const size = statSync(path(`site/public/art/${file}.webp`)).size / 1024;
      if (size > kb) console.warn(`[brand] guideline: ${file}.webp is ${size.toFixed(1)} KB, about ${kb} KB suggested for LCP`);
    }
  });
});

describe("light only", () => {
  it("ships no dark-theme rules in any stylesheet", () => {
    for (const p of ["tokens", "space-peak", "base", "index"].map((n) => `site/src/styles/${n}.css`))
      expect(read(p), p).not.toMatch(/prefers-color-scheme|data-theme|color-scheme:\s*dark/);
  });

  it("lightOnly drops the dark blocks and refuses a file with no :root", () => {
    const css = ':root {\n  --a: #fff;\n}\n@media (prefers-color-scheme: dark) {\n}\n:root[data-theme="dark"] {\n}\n';
    expect(lightOnly(css)).toBe(":root {\n  --a: #fff;\n}\n");
    expect(() => lightOnly("body {}")).toThrow(/:root/);
  });
});

describe("Space Peak colours", () => {
  const sp = read("site/src/styles/space-peak.css");
  it("sets text black, pink with its ink, and the four kinds", () => {
    expect(token(sp, "--c-ink")).toBe("#000000");
    expect(sp).toContain("--c-text: var(--c-ink);");
    expect(token(sp, "--c-region-space-peak")).toBe("#C67273");
    expect(token(sp, "--c-on-region-space-peak")).toBe("#000A33");
    // Kinds alias the brand's --co-* tokens instead of repeating hex (#58 review).
    const tokens = read("site/src/styles/tokens.css");
    const brand = { blue: "co-blue", green: "co-tree-green", purple: "co-purple", yellow: "co-yellow" };
    for (const [k, co] of Object.entries(brand)) expect(sp).toContain(`--c-kind-${k}: var(--${co});`);
    expect(Object.values(brand).map((co) => token(tokens, `--${co}`))).toEqual(["#001970", "#245D38", "#6D3A5D", "#FFD100"]);
  });

  it("Base.astro imports index.css, and button text is ink on pink at 4.5:1 or better", () => {
    expect(read("site/src/layouts/Base.astro")).toMatch(/import "\.\.\/styles\/index\.css";(?![\s\S]*<style)/);
    const index = read("site/src/styles/index.css");
    const button = index.slice(index.indexOf(".button"));
    expect(button).toMatch(/background: var\(--c-region-space-peak\)/);
    expect(button).toMatch(/color: var\(--c-on-region-space-peak\)/);
    const ratio = contrast(token(sp, "--c-on-region-space-peak")!, token(sp, "--c-region-space-peak")!);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", "#C67273")).toBeLessThan(4.5); // why white text was wrong
  });
});
