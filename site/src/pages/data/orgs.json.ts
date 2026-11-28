// /data/orgs.json: every organisation's record, served from build.ts.
import { serve } from "../../lib/data/serve";
export const GET = serve("orgs.json");
