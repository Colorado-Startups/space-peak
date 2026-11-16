import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://spacepeak.co",
  output: "static",
  trailingSlash: "always", // wrangler.jsonc html_handling is auto-trailing-slash
  // This Mac account's port block (managed Mac policy, Ports); strictPort exits instead of moving on.
  server: { port: 3320 },
  vite: { server: { strictPort: true } },
  integrations: [sitemap()],
});
