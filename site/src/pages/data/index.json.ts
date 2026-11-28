// /data/index.json: every built data file with its media type, JSON Schema and sha256.
import { serveIndex } from "../../lib/data/serve";
export const GET = serveIndex;
