// /data/catalog.json: the schema.org DataCatalog of every open data file, served from build.ts.
import { serve } from "../../lib/data/serve";
export const GET = serve("catalog.json");
