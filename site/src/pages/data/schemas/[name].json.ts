import type { APIRoute } from "astro";
import { SCHEMAS } from "../../../lib/data/build";
import { serve } from "../_files";

export const getStaticPaths = () => Object.keys(SCHEMAS).map((name) => ({ params: { name } }));
export const GET: APIRoute = ({ params }) => serve(`schemas/${params.name}.json`)();
