import type { APIRoute } from "astro";
import { allEstimates } from "../../lib/estimates/schema";

// Plain JSON for the odds section. Estimates are opinions, so no schema.org markup here or anywhere.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(allEstimates(), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
