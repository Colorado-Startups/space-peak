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
// The /mcp Worker runs under `wrangler dev` over the same dist/, through the package's mcp script, which reads
// ../wrangler.jsonc. 3322 for the Worker, 3323 for its inspector (set in that script): both in this account's
// block, not vendor defaults. --infer-origin-from-routes=false keeps each request's own Host, so the
// conformance test's DNS-rebinding check reaches the Worker instead of seeing the spacepeak.co route.
const MCP_PORT = 3322;
export const MCP_URL = `http://${HOST}:${MCP_PORT}/mcp`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node scripts/serve-dist.mjs --port ${PORT} --host ${HOST}`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run mcp",
      env: { WRANGLER_SEND_METRICS: "false" },
      url: `http://${HOST}:${MCP_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
