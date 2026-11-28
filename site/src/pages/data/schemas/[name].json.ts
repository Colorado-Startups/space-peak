// /data/schemas/<name>.json: the JSON Schema of each data file, one route per schema in build.ts.
import type { APIRoute } from "astro";
import { SCHEMAS } from "../../../lib/data/build";
import { serve } from "../../../lib/data/serve";

/** One route per JSON Schema in SCHEMAS. */
export const getStaticPaths = () => Object.keys(SCHEMAS).map((name) => ({ params: { name } }));
/** That schema, as built. */
export const GET: APIRoute = ({ params }) => serve(`schemas/${params.name}.json`)();
