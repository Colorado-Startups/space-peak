// /data/claims.json: every row of the claims register, served from build.ts.
import { serve } from "../../lib/data/serve";
export const GET = serve("claims.json");
