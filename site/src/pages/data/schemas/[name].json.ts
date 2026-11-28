import type { APIRoute } from "astro";
import { SCHEMAS } from "../../../lib/data/build";
import { serve } from "../_files";

/** One route per JSON Schema in SCHEMAS. */
export const getStaticPaths = () => Object.keys(SCHEMAS).map((name) => ({ params: { name } }));
/** That schema, as built. */
export const GET: APIRoute = ({ params }) => serve(`schemas/${params.name}.json`)();
