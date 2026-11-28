// /data/orgs.geojson: each organisation as a GeoJSON point, served from build.ts.
import { serve } from "../../lib/data/serve";
export const GET = serve("orgs.geojson");
