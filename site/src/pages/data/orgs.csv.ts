// /data/orgs.csv: the organisations as one CSV row each, served from build.ts.
import { serve } from "../../lib/data/serve";
export const GET = serve("orgs.csv");
