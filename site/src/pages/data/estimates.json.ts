// /data/estimates.json: plain JSON for the odds section. Estimates are opinions, so no schema.org markup here or anywhere.
import type { APIRoute } from "astro";
import { allEstimates } from "../../lib/estimates/schema";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(allEstimates(), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
