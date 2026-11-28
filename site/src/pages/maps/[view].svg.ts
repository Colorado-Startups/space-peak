// GET /maps/region.svg and /maps/south.svg: the build-time drawing (lib/map/draw.ts), the map's form
// until a visitor asks for the live map.
import { loadMapData } from "../../lib/map/data";
import { drawMap, VIEWS, type View } from "../../lib/map/draw";

/** One route per drawn view in VIEWS. */
export function getStaticPaths() {
  return Object.keys(VIEWS).map((view) => ({ params: { view } }));
}

/** That view's drawing, as image/svg+xml. */
export async function GET({ params }: { params: { view: string } }) {
  return new Response(drawMap(await loadMapData(), params.view as View), { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
