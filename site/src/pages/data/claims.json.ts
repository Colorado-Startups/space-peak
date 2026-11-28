// /data/claims.json: the claims register rows the site serves (lib/claims/served.ts), built by build.ts.
import { serve } from "../../lib/data/serve";
export const GET = serve("claims.json");
