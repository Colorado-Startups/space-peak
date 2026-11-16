import { defineConfig, devices } from "@playwright/test";

// Browser tests over the built static site in dist/, shaped like
// Colorado-Startups/coloradostartups.org's site/playwright.config.ts.
// CI runs them in the standard job after `npm run build`; nothing runs them on this Mac.
//
// The web server only serves dist/: it does not build, so CI builds once.
// 127.0.0.1, not localhost, so the listening socket and the probed address agree on IPv4.
// Port 3321 is in this Mac account's block (managed Mac policy, Ports). It is strict:
// serve-dist.mjs exits if the port is taken, and reuseExistingServer is off, so a
// run never tests some other server's pages.
const PORT = 3321;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node scripts/serve-dist.mjs --port ${PORT} --host ${HOST}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
