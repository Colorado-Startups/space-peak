// /robots.txt: every crawler may read every page, with a Content-Signal line (contentsignals.org).
// The sitemap index comes from @astrojs/sitemap.
import type { APIRoute } from "astro";

export const ROBOTS = [
  "User-agent: *",
  "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
  "Allow: /",
  "",
  "Sitemap: https://spacepeak.co/sitemap-index.xml",
  "",
].join("\n");

/** GET /robots.txt, as plain text. */
export const GET: APIRoute = () =>
  new Response(ROBOTS, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
