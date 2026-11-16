// The map as one standalone SVG, drawn at build time: the form the map takes until a visitor asks for the
// live map. Fixed viewBoxes, one projection, text only at the two type steps, colours from tokens.css.
import { readFileSync } from "node:fs";
import type { Kind } from "../orgs/kinds";
import type { MapData } from "./data";
/** --t-step--1 and --t-step-0 (0.9375rem and 1.125rem) in px. */
export const [SMALL_PX, NAME_PX] = [15, 18];
// Equirectangular at 38 N, the tour's middle latitude: one projection, each view a fixed box on it.
const COS = Math.cos((38 * Math.PI) / 180);
export const VIEWS = {
  region: { west: -105.15, east: -104.55, south: 38.6, north: 39.05, width: 800 },
  south: { west: -105.9, east: -104.1, south: 36.95, north: 39.15, width: 800 },
} as const;
export type View = keyof typeof VIEWS;
// Read from disk: Vitest blanks a CSS import, even ?raw. Astro and Vitest both run in site/.
const COLOR: Record<string, string> = {};
for (const [, name, hex] of readFileSync(`${process.cwd()}/src/styles/tokens.css`, "utf8").matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) COLOR[name!] ??= hex!;
function color(name: string): string {
  if (!COLOR[name]) throw new Error(`styles/tokens.css has no six-digit hex for --${name}`);
  return COLOR[name];
}
/** command_base blue square, institution green diamond, company purple circle. */
const KIND_TOKEN: Record<Kind, string> = { command_base: "co-web-primary", institution: "co-tree-green", company: "co-purple" };
const n = (v: number) => String(Math.round(v * 10) / 10);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function frame(view: View) {
  const v = VIEWS[view];
  const k = v.width / ((v.east - v.west) * COS);
  const xy = ([lon, lat]: readonly [number, number]) => [(lon - v.west) * COS * k, (v.north - lat) * k] as const;
  const inside = ([lon, lat]: readonly [number, number]) => lon > v.west && lon < v.east && lat > v.south && lat < v.north;
  return { width: v.width, height: Math.round((v.north - v.south) * k), xy, inside };
}

function mark(kind: Kind, x: number, y: number, label: string): string {
  const paint = `fill="${color(KIND_TOKEN[kind])}" stroke="${color("c-ground")}" stroke-width="1.5" data-kind="${kind}"><title>${esc(label)}</title>`;
  if (kind === "command_base") return `<rect x="${n(x - 6)}" y="${n(y - 6)}" width="12" height="12" ${paint}</rect>`;
  if (kind === "institution") return `<path d="M${n(x)} ${n(y - 8)}L${n(x + 8)} ${n(y)}L${n(x)} ${n(y + 8)}L${n(x - 8)} ${n(y)}Z" ${paint}</path>`;
  return `<circle cx="${n(x)}" cy="${n(y)}" r="6" ${paint}</circle>`;
}

/** One view as a standalone SVG string. The same data always gives the same bytes. */
export function drawMap(data: MapData, view: View): string {
  const { width: w, height: h, xy, inside } = frame(view);
  const [ink, dim, teal] = [color("c-text"), color("c-text-dim"), color("c-community")];
  const text = (x: number, y: number, px: number, body: string, extra = "") =>
    `<text x="${n(x)}" y="${n(y)}" font-family="system-ui, sans-serif" font-size="${px}" ${extra} stroke="${color("c-ground")}" stroke-width="4" paint-order="stroke">${esc(body)}</text>`;
  const pts = data.loop.ring.map(xy);
  const xs = pts.map((p) => p[0]);
  const summits = data.summits.filter((s) => inside(s.at));
  const orgs = data.orgs.filter((o) => inside(o.at));
  const title = view === "region" ? "Map of the Colorado Startups region loop and Pikes Peak" : "Map of the four summits on the Space Peak tour";
  const desc = `${data.loop.name}: a loop of ${data.loop.roads.join(", ")}. It is not a launch site. Summits, each speculative: ${summits.map((s) => s.summit).join(", ")}. Organisations shown: ${orgs.length}.`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="map-title map-desc">`,
    `<title id="map-title">${esc(title)}</title><desc id="map-desc">${esc(desc)}</desc><rect width="${w}" height="${h}" fill="${color("c-surface")}"/>`,
    `<path d="M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z" fill="${teal}" fill-opacity="0.18" stroke="${teal}" stroke-width="3" stroke-linejoin="round" data-layer="loop"/>`,
    text((Math.min(...xs) + Math.max(...xs)) / 2, Math.max(...pts.map((p) => p[1])) + 24, SMALL_PX, "Colorado Startups region", `text-anchor="middle" fill="${ink}"`),
  ];
  for (const s of summits) {
    const [x, y] = xy(s.at);
    out.push(
      `<g data-layer="summit" data-register="${s.register}"><path d="M${n(x)} ${n(y - 9)}L${n(x + 8)} ${n(y + 5)}L${n(x - 8)} ${n(y + 5)}Z" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`,
      text(x - 14, y, NAME_PX, s.summit, `text-anchor="end" fill="${ink}"`),
      text(x - 14, y + 18, SMALL_PX, "speculative", `text-anchor="end" font-style="italic" fill="${dim}"`),
      `</g>`,
    );
  }
  for (const o of orgs) out.push(mark(o.kind, ...xy(o.at), o.name));
  out.push(text(w - 8, h - 8, SMALL_PX, "Summits: USGS GNIS. Loop: US Census Bureau. CC0, spacepeak.co", `text-anchor="end" fill="${dim}"`), `</svg>`);
  return out.join("");
}
