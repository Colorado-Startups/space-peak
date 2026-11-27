// GET <path>index.md: the Markdown twin of each live page (lib/twins.ts). The home page's twin is /index.md.
import type { APIRoute } from "astro";
import { loadMapData } from "../../lib/map/data";
import { twins } from "../../lib/twins";

let built: Promise<Map<string, string>> | undefined;
const all = () => (built ??= loadMapData().then((data) => twins(data)));
const param = (path: string) => path.replace(/^\/|\/?index\.md$/g, "") || undefined;

export const getStaticPaths = async () => [...(await all()).keys()].map((path) => ({ params: { path: param(path) } }));
export const GET: APIRoute = async ({ params }) =>
  new Response((await all()).get(`/${params.path ? `${params.path}/` : ""}index.md`)!, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
