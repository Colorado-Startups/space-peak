// The live map's places: the organisations and the four tour summits (the three ranked and Pikes Peak) from
// /data/map.geojson, each org's sourced fact from /data/orgs.json. One symbol layer draws them in the key's shapes and
// colours; a click opens a popup, and each item in the list twin (#places) gets a "Show on map" button, so a keyboard
// reaches every place. A popup is plain words: the name, the kind, one sentence and a source link.
import type { Map as LiveMap } from "maplibre-gl";
import { KINDS, type Kind } from "../../../lib/orgs/kinds";

type PlaceKind = Kind | "summit";
export type Place = { kind: PlaceKind; name: string; at: [number, number]; lines: string[]; url: string; source: string };
type Feature = { geometry: { coordinates: [number, number] }; properties: Record<string, any> };
type Org = { id: string; fact: { text: string; source: string }; sources: { id: string; url: string; publisher: string }[] };

const ORDER: PlaceKind[] = [...KINDS, "summit"];
const LABEL: Record<Kind, string> = { command_base: "Command or base", institution: "University or institution", company: "Company or startup" };
/** The tokens map.css paints the key with, so the live map and the drawing's key agree. */
const INK: Record<PlaceKind, string> = { command_base: "--co-web-primary", institution: "--co-tree-green", company: "--co-purple", summit: "--c-text" };
const CSS = `.sp-popup{font:var(--t-step--1)/1.4 var(--font-body);color:var(--c-text);padding-inline-end:var(--s-6)}
.sp-popup>div+div{margin-top:var(--s-3);padding-top:var(--s-3);border-top:var(--line-hair) solid var(--c-rule)}
.sp-popup strong{display:block}.sp-popup p{margin:0 0 var(--s-1)}.sp-popup p:first-of-type{color:var(--c-text-dim)}
.maplibregl-popup-close-button{font-size:var(--t-step-1);color:var(--c-text)}
.sp-show{font:inherit;border:var(--line-hair) solid var(--c-border);border-radius:var(--r-chisel);background:var(--c-ground);color:var(--c-text);padding-inline:var(--s-3);cursor:pointer}`;

/** Pure: every summit and org in map.geojson, in its order, with the lines and source its popup shows. */
export function placesOf(fc: { features: Feature[] }, orgs: Org[]): Place[] {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  return fc.features.flatMap((f): Place[] => {
    const [p, at] = [f.properties, f.geometry.coordinates];
    if (p.layer === "summit") {
      const where = `${at[1].toFixed(5)} N, ${(-at[0]).toFixed(5)} W`;
      // Pikes Peak gives the project its name and its headquarters; the other three are the ranked summits.
      const kind = p.name === "Pikes Peak" ? "Name and headquarters" : "Summit";
      return [{ kind: "summit", name: p.name, at, url: p.source_url, source: "USGS", lines: [kind, `USGS records its summit at ${where}.`] }];
    }
    if (p.layer !== "org") return [];
    const o = byId.get(p.id);
    const s = o?.sources.find((x) => x.id === o.fact.source);
    if (!o || !s) throw new Error(`orgs.json has no sourced fact for ${p.id}`);
    return [{ kind: p.kind, name: p.name, at, url: s.url, source: s.publisher, lines: [LABEL[p.kind as Kind], o.fact.text] }];
  });
}

/** One marker at 24 css px: the drawing's square, diamond, circle and outlined triangle. */
function icon(doc: Document, kind: PlaceKind, ink: string, ground: string) {
  const r = Math.ceil(devicePixelRatio || 1);
  const c = Object.assign(doc.createElement("canvas"), { width: 24 * r, height: 24 * r });
  const g = c.getContext("2d")!;
  g.scale(r, r);
  g.beginPath();
  if (kind === "command_base") g.rect(6, 6, 12, 12);
  else if (kind === "company") g.arc(12, 12, 6, 0, 2 * Math.PI);
  else for (const [x, y] of kind === "institution" ? [[12, 4], [20, 12], [12, 20], [4, 12]] : [[12, 3], [20, 17], [4, 17]]) g.lineTo(x!, y!);
  g.closePath();
  g.lineJoin = "round";
  const stroke = (w: number, s: string) => Object.assign(g, { lineWidth: w, strokeStyle: s }).stroke();
  if (kind === "summit") {
    stroke(5, ground); // a halo, so the outline reads over relief
    stroke(2.5, ink);
  } else {
    Object.assign(g, { fillStyle: ink }).fill();
    stroke(1.5, ground);
  }
  return [g.getImageData(0, 0, c.width, c.height), { pixelRatio: r }] as const;
}

function card(doc: Document, p: Place): HTMLElement {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]>) => Object.assign(doc.createElement(tag), props);
  const el = doc.createElement("div");
  el.append(make("strong", { textContent: p.name, tabIndex: -1 }), ...p.lines.map((t) => make("p", { textContent: t })), make("a", { href: p.url, textContent: `Source: ${p.source}` }));
  return el;
}

/** After the live map's first draw: the places layer, its popups and the list's buttons. A failure leaves the map as it was. */
export async function addPlaces(map: LiveMap, lib: typeof import("maplibre-gl"), frame: HTMLElement): Promise<void> {
  const doc = frame.ownerDocument;
  const get = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: HTTP ${r.status}`))));
  let places: Place[];
  try {
    const [fc, data] = await Promise.all([get("/data/map.geojson"), get("/data/orgs.json")]);
    places = placesOf(fc, data.orgs);
  } catch (err) {
    console.error("live map places:", err);
    return void (frame.dataset.places = "failed");
  }
  const css = getComputedStyle(doc.documentElement);
  const [ink, ground] = [(k: PlaceKind) => css.getPropertyValue(INK[k]).trim(), css.getPropertyValue("--c-ground").trim()];
  for (const k of ORDER) map.addImage(`sp-${k}`, ...icon(doc, k, ink(k), ground));
  const features = places.map((p, i) => ({ type: "Feature" as const, id: i + 1, geometry: { type: "Point" as const, coordinates: p.at }, properties: { kind: p.kind, name: p.name } }));
  map.addSource("sp-places", { type: "geojson", data: { type: "FeatureCollection", features } });
  map.addLayer({ id: "sp-places", type: "symbol", source: "sp-places", layout: { "icon-image": ["concat", "sp-", ["get", "kind"]], "icon-allow-overlap": true, "icon-ignore-placement": true } });
  // Summit names need the base style's glyphs; a base with none (as in the e2e stub) shows the triangles and popups only.
  const font = map.getStyle().layers.map((l) => (l.layout as Record<string, unknown> | undefined)?.["text-font"]).find(Array.isArray);
  if (map.getStyle().glyphs && font) map.addLayer({
    id: "sp-summit-names", type: "symbol", source: "sp-places", filter: ["==", ["get", "kind"], "summit"],
    layout: { "text-field": ["get", "name"], "text-font": font as string[], "text-size": 14, "text-anchor": "right", "text-offset": [-1.2, 0] },
    paint: { "text-color": ink("summit"), "text-halo-color": ground, "text-halo-width": 2 },
  });
  doc.head.append(Object.assign(doc.createElement("style"), { textContent: CSS }));

  let popup: InstanceType<typeof lib.Popup> | undefined;
  // Focus goes to the first name. Escape or the close button hands it back to the button that opened the popup.
  const show = (list: Place[], opener?: HTMLElement) => {
    popup?.remove();
    const body = Object.assign(doc.createElement("div"), { className: "sp-popup" });
    body.append(...list.map((p) => card(doc, p)));
    const open = (popup = new lib.Popup({ focusAfterOpen: false, maxWidth: "20rem" }).setLngLat(list[0]!.at).setDOMContent(body).addTo(map));
    open.getElement().querySelector(".maplibregl-popup-close-button")?.setAttribute("aria-label", "Close");
    open.getElement().addEventListener("keydown", (e) => void (e.key === "Escape" && open.remove()));
    open.on("close", () => void (opener && (!doc.activeElement || doc.activeElement === doc.body) && opener.focus()));
    body.querySelector("strong")?.focus();
  };
  // Several orgs share a campus point, so a click lists every place under the pointer.
  map.on("click", "sp-places", (e) => {
    const ids = new Set(e.features?.map((f) => f.id));
    show(places.filter((_, i) => ids.has(i + 1)));
  });
  map.on("mouseenter", "sp-places", () => void (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "sp-places", () => void (map.getCanvas().style.cursor = ""));
  const byKey = new Map(places.map((p) => [`${p.kind} ${p.name}`, p]));
  for (const li of doc.querySelectorAll<HTMLElement>("#places li[data-kind]")) {
    const p = byKey.get(`${li.dataset.kind} ${li.dataset.name}`);
    if (!p) continue;
    const b = Object.assign(doc.createElement("button"), { type: "button", className: "sp-show", textContent: "Show on map" });
    b.setAttribute("aria-label", `Show on map: ${p.name}`);
    b.addEventListener("click", () => (map.jumpTo({ center: p.at }), show([p], b)));
    li.append(b);
  }
  // For a reader and for e2e/map-places.spec.ts: how many distinct places of each kind drew, once the map is still.
  map.on("idle", () => {
    const drawn = new Set(map.queryRenderedFeatures({ layers: ["sp-places"] }).map((f) => f.id));
    frame.dataset.places = ORDER.map((k) => `${k}:${places.filter((p, i) => p.kind === k && drawn.has(i + 1)).length}`).join(" ");
  });
}
