import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://spacepeak.co",
  output: "static",
  trailingSlash: "always", // wrangler.jsonc html_handling is auto-trailing-slash
  // This Mac account's port block (managed Mac policy, Ports); strictPort exits instead of moving on.
  server: { port: 3320 },
  vite: { server: { strictPort: true } },
  integrations: [sitemap()],
  // Fonts API (docs.astro.build/en/guides/fonts, read 2026-11-16): files download at build and ship from this origin.
  fonts: [
    { name: "Aileron", cssVariable: "--font-display", provider: fontProviders.fontsource(), weights: [700], styles: ["normal"], subsets: ["latin"], fallbacks: ["sans-serif"] },
    { name: "Atkinson Hyperlegible", cssVariable: "--font-body", provider: fontProviders.fontsource(), weights: [400, 700], styles: ["normal"], subsets: ["latin"], fallbacks: ["sans-serif"] },
  ],
});
