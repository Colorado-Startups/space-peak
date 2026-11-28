import type { APIRoute } from "astro";
import { SCHEMAS } from "../../../lib/data/build";
import { serve } from "../../../lib/data/serve";

export const getStaticPaths = () => Object.keys(SCHEMAS).map((name) => ({ params: { name } }));
export const GET: APIRoute = ({ params }) => serve(`schemas/${params.name}.json`)();
