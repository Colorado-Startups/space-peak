// The hero's flight arc as one inline SVG, drawn at build time over springs-*.webp.
// The viewBox is the 720 x 360 painting, so a point here is a pixel of springs-720.webp.
// A mask wipes the arc in from the summit; hero.css animates the mask's transform only.
import { readFileSync } from "node:fs";

export const VIEW = { width: 720, height: 360 } as const;
/** Pikes Peak's summit in the painting. */
export const SUMMIT = [372, 30] as const;
/** The star, in the clear sky above the griffin. */
export const STAR = [668, 16] as const;
const STAR_R = 10;

// Read from disk, as lib/map/draw.ts does: Vitest blanks a CSS import. Astro and Vitest both run in site/.
const COLOR: Record<string, string> = {};
for (const [, name, hex] of readFileSync(`${process.cwd()}/src/styles/tokens.css`, "utf8").matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) COLOR[name!] ??= hex!;
function color(name: string): string {
  if (!COLOR[name]) throw new Error(`styles/tokens.css has no six-digit hex for --${name}`);
  return COLOR[name];
}

const n = (v: number) => String(Math.round(v * 10) / 10);

/** A five-point star centred on STAR, point up. */
function starPoints(): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? STAR_R : STAR_R * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${n(STAR[0] + r * Math.cos(a))},${n(STAR[1] + r * Math.sin(a))}`;
  }).join(" ");
}

/** The arc: up off the summit, then a long flat bend to the star. Same input, same bytes. */
export function arcPath(): string {
  const [sx, sy] = SUMMIT;
  const [ex, ey] = STAR;
  return `M${n(sx)} ${n(sy)}C${n(sx + 38)} ${n(sy - 24)} ${n(sx + 150)} ${n(sy - 26)} ${n(ex - STAR_R - 2)} ${n(ey)}`;
}

/** The decorative overlay. aria-hidden: the image's alt carries the meaning. */
export function drawHero(): string {
  const { width: w, height: h } = VIEW;
  const [pink, white] = [color("c-region-space-peak"), color("c-ground")];
  const wipeX = SUMMIT[0] - 12;
  return [
    `<svg class="hero-arc" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">`,
    `<mask id="hero-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">`,
    `<rect class="hero-wipe" x="${wipeX}" y="0" width="${w - wipeX}" height="${h}" fill="${white}"/></mask>`,
    `<g mask="url(#hero-reveal)" fill="none" stroke-linecap="round">`,
    `<path d="${arcPath()}" stroke="${white}" stroke-opacity="0.7" stroke-width="6" vector-effect="non-scaling-stroke"/>`,
    `<path d="${arcPath()}" stroke="${pink}" stroke-width="3" vector-effect="non-scaling-stroke" data-layer="arc"/></g>`,
    `<polygon class="hero-star" points="${starPoints()}" fill="${white}" data-layer="star"/>`,
    `</svg>`,
  ].join("");
}
