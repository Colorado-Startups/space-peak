import type { APIRoute } from "astro";

// Content-Signal: contentsignals.org. The sitemap index comes from @astrojs/sitemap.
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
