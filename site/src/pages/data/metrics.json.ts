// /data/metrics.json: counts of organisations by kind and city, and claims by status.
import { serve } from "../../lib/data/serve";
export const GET = serve("metrics.json");
