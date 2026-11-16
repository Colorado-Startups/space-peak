import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Issue #60: styles use tokens only. Token files are the one place a raw hex or px may live.
const SITE = fileURLToPath(new URL("../../", import.meta.url));
const TOKEN_FILES = ["src/styles/tokens.css", "src/styles/space-peak.css"];
const read = (p: string) => readFileSync(join(SITE, p), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(css|astro)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

// The CSS in a file: all of a .css file, or the <style> blocks and style="" attributes of an .astro file.
function cssOf(path: string, text: string): string {
  const css = path.endsWith(".css")
    ? text
    : [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|style="([^"]*)"/g)].map((m) => m[1] ?? m[2]).join("\n");
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function problems(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) out.push(`raw hex ${m[0]}`);
  for (const m of css.matchAll(/\b\d*\.?\d+px\b/g)) out.push(`raw px ${m[0]}`);
  for (const m of css.matchAll(/font-size:\s*([^;}]+)/g))
    if (!/^var\(--t-step--?\d\)$/.test(m[1].trim())) out.push(`font size off the scale: ${m[1].trim()}`);
  if (/\bfont:/.test(css)) out.push("font shorthand hides the size");
  for (const m of css.matchAll(/@media([^{]*)\{/g))
    for (const u of m[1].matchAll(/\d*\.?\d+([a-z%]+)/g)) if (u[1] !== "rem") out.push(`media query unit ${u[0]}`);
  if (/outline:\s*(none|0)\b/.test(css)) out.push("focus ring removed");
  return out;
}

const files = walk(join(SITE, "src"))
  .map((f) => relative(SITE, f))
  .filter((f) => !TOKEN_FILES.includes(f));

describe("css scan", () => {
  it("finds each kind of problem in a bad sample", () => {
    const bad = "a{color:#fff;margin:4px;font-size:1.1rem;outline:none}@media (min-width: 600px){b{font:12px x}}";
    expect(problems(bad)).toEqual([
      "raw hex #fff",
      "raw px 4px",
      "raw px 600px",
      "raw px 12px",
      "font size off the scale: 1.1rem",
      "font shorthand hides the size",
      "media query unit 600px",
      "focus ring removed",
    ]);
    expect(cssOf("x.astro", '<a href="#main" style="color:#000">x</a>')).toBe("color:#000");
  });

  it("scans every stylesheet and component", () => {
    expect(files).toEqual(expect.arrayContaining(["src/styles/base.css", "src/styles/index.css", "src/layouts/Base.astro"]));
  });

  it.each(files)("%s uses tokens only", (f) => {
    expect(problems(cssOf(f, read(f)))).toEqual([]);
  });

  it("every type step used exists in tokens.css", () => {
    const tokens = read("src/styles/tokens.css");
    for (const f of files)
      for (const m of cssOf(f, read(f)).matchAll(/var\((--t-step--?\d)\)/g)) expect(tokens, `${f} ${m[1]}`).toContain(`${m[1]}:`);
  });

  it("base.css has a focus ring, a skip link and a reduced-motion guard", () => {
    const base = read("src/styles/base.css");
    expect(base).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--line-bold\) solid var\(--c-focus\)/);
    expect(base).toMatch(/min-height:\s*var\(--size-tap\)/);
    expect(base).toMatch(/\.skip-link:focus\s*\{\s*transform:\s*none/);
    expect(base).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none !important;[^}]*transition:\s*none !important/);
    const layout = read("src/layouts/Base.astro");
    expect(layout).toMatch(/<a class="skip-link" href="#main">/);
    expect(layout).toContain('<main id="main">');
  });

  it("loads Aileron for display and Atkinson Hyperlegible for body through the Fonts API", () => {
    const config = read("astro.config.mjs");
    expect(config).toMatch(/name: "Aileron", cssVariable: "--font-display", provider: fontProviders\.fontsource\(\)/);
    expect(config).toMatch(/name: "Atkinson Hyperlegible", cssVariable: "--font-body", provider: fontProviders\.fontsource\(\)/);
    const layout = read("src/layouts/Base.astro");
    for (const v of ["--font-display", "--font-body"]) expect(layout).toContain(`<Font cssVariable="${v}"`);
  });

  it("text-dim is neutral grey, not blue", () => {
    const hex = read("src/styles/space-peak.css").match(/--c-text-dim:\s*#([0-9A-Fa-f]{6})/)![1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(r === g && g === b).toBe(true);
  });
});
