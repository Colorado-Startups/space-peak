// Fetches every source URL in data/orgs/*.yaml. On demand only, never in CI: node scripts/check-sources.mjs [dir]
// Fails on a non-2xx status, a network error, or a redirect that leaves the source's domain.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const dir = process.argv[2] ?? fileURLToPath(new URL("../data/orgs/", import.meta.url));
const bare = (host) => host.toLowerCase().replace(/^www\./, "");
// The same site, or a subdomain of it either way: example.gov to www.example.gov or maps.example.gov.
const sameSite = (a, b) => bare(a) === bare(b) || bare(a).endsWith(`.${bare(b)}`) || bare(b).endsWith(`.${bare(a)}`);

async function check(url) {
  const start = new URL(url);
  let at = start;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(at, { redirect: "manual", headers: { "user-agent": "spacepeak-source-check" }, signal: AbortSignal.timeout(20_000) });
    await res.body?.cancel();
    if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
      at = new URL(res.headers.get("location"), at);
      if (!sameSite(at.hostname, start.hostname)) return `redirects to another domain: ${at.href}`;
      continue;
    }
    return res.ok ? null : `HTTP ${res.status}`;
  }
  return "more than 5 redirects";
}

const urls = new Map();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  const org = parse(readFileSync(join(dir, file), "utf8"));
  for (const source of org.sources ?? []) urls.set(source.url, [...(urls.get(source.url) ?? []), `${org.id}/${source.id}`]);
}

let failed = 0;
for (const [url, refs] of urls) {
  const problem = await check(url).catch((err) => `fetch failed: ${err.cause?.code ?? err.message}`);
  if (problem) failed++;
  console.log(`${problem ? "FAIL" : "ok  "} ${url} (${refs.join(", ")})${problem ? `: ${problem}` : ""}`);
}
console.log(`${urls.size} source URLs, ${failed} failed`);
process.exit(failed ? 1 : 0);
