// Step 29 (issue #147): the live map's controls and its opening. The pan pad, zoom and the 3D terrain toggle are real
// buttons in one group, in Tab order after the map. The map opens on the globe and flies once to the region; under
// prefers-reduced-motion it opens on the region and never flies, and MapLibre skips the buttons' easing too.
import type { IControl, Map as MapLibre } from "maplibre-gl";
import { TERRAIN, type Region } from "./region";

/** The opening flight. The site's guideline, not a test: motion runs once and under 1.5 s. */
export const FLY_MS = 1400;
const GLOBE_ZOOM = 1.5; // The whole Earth in the frame.
const PADDING = 24; // The same padding live.client.ts fits the region with, so both openings end in one place.
const RELIEF = "sp-terrain-3d"; // MapLibre warns when hillshade and terrain share a source, so terrain gets a twin.
const TILT = 60; // Terrain reads as 3D only from a tilted camera; turning it off levels the camera again.

type Button = [area: string, label: string, text: string, act: (map: MapLibre, step: number) => unknown];
const PAD: Button[] = [
  ["n", "Move north", "↑", (m, s) => m.panBy([0, -s])],
  ["w", "Move west", "←", (m, s) => m.panBy([-s, 0])],
  ["e", "Move east", "→", (m, s) => m.panBy([s, 0])],
  ["s", "Move south", "↓", (m, s) => m.panBy([0, s])],
  ["in", "Zoom in", "+", (m) => m.zoomIn()],
  ["out", "Zoom out", "−", (m) => m.zoomOut()],
];

/** Call right after `new Map`, before its first frame. `frame` carries the camera, projection and terrain for the tests. */
export function controls(map: MapLibre, region: Region, frame: HTMLElement): void {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [[w, s], [e, n]] = region.bounds;
  if (!still) map.jumpTo({ center: [(w + e) / 2, (s + n) / 2], zoom: GLOBE_ZOOM });
  const camera = () => {
    const c = map.getCenter();
    frame.dataset.camera = `${c.lng.toFixed(4)} ${c.lat.toFixed(4)} ${map.getZoom().toFixed(2)}`;
  };
  map.on("moveend", camera);
  map.once("style.load", () => map.setProjection({ type: "globe" }));
  map.once("load", () => {
    camera();
    frame.dataset.projection = String(map.getProjection()?.type);
    map.addControl(group(map, frame), "top-right");
    if (!still) map.fitBounds(region.bounds, { padding: PADDING, duration: FLY_MS });
  });
}

function group(map: MapLibre, frame: HTMLElement): IControl {
  const box = Object.assign(document.createElement("div"), { className: "sp-controls" });
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Map controls");
  const button = ([area, label, text, act]: Button) => {
    const b = Object.assign(document.createElement("button"), { type: "button", textContent: text, title: label });
    b.setAttribute("aria-label", label);
    b.style.gridArea = area;
    b.addEventListener("click", () => act(map, Math.round(Math.min(frame.clientWidth, frame.clientHeight) / 4)));
    return b;
  };
  const terrain = button(["t", "3D terrain", "3D", () => {
    const on = !map.getTerrain();
    if (on && !map.getSource(RELIEF)) map.addSource(RELIEF, { ...TERRAIN });
    map.setTerrain(on ? { source: RELIEF, exaggeration: 1.5 } : null);
    map.easeTo({ pitch: on ? TILT : 0 });
  }]);
  terrain.setAttribute("aria-pressed", "false");
  map.on("terrain", () => {
    const on = Boolean(map.getTerrain());
    terrain.setAttribute("aria-pressed", String(on));
    frame.dataset.terrain = on ? "on" : "off";
  });
  box.append(...PAD.map(button), terrain);
  return { onAdd: () => box, onRemove: () => box.remove() };
}
