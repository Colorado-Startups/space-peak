// Pulls the founder credit programs /guide/ shows from the startup-credits catalog pinned in
// data/resources.lock.json, after scripts/brand/pull.mjs. The download must match the lock's sha256.
// Each program's link is fetched here, at pull time, never in CI; a link that does not answer 2xx is left
// out and named in the lock's "left_out". The subset goes to data/resources.json, one program per line,
// and its sha256 to the lock's "outputs" for site/test/dom/resources.test.ts. The build reads only that file.
// Run: node scripts/resources/pull.mjs. Exit 0 written, 1 a hash mismatch, 3 could not pull.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCK = "data/resources.lock.json";
export const OUT = "data/resources.json";
// The catalog fields the guide shows, in this order.
export const FIELDS = ["id", "program", "provider", "bucket", "credit_first", "credit_first_computed", "credit_max", "credit_max_computed", "amount_note", "covers", "link", "checked"];
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** The guide's subset of a catalog: its date and each row's FIELDS, in the catalog's order. */
export function subset(catalog) {
  const rows = catalog.rows.map((row) => {
    if (!/^https:\/\//.test(row.link)) throw new Error(`${row.id}: link is not https`);
    return Object.fromEntries(FIELDS.map((f) => [f, row[f]]));
  });
  return { checked: catalog.checked, rows };
}

/** One program per line, so a changed program is a one-line diff. */
export function serialize(data) {
  const rows = data.rows.map((r) => `    ${JSON.stringify(r)}`).join(",\n");
  return `{\n  "checked": ${JSON.stringify(data.checked)},\n  "rows": [\n${rows}\n  ]\n}\n`;
}

// null when the link answers 2xx within 10 redirects, else the problem. Sign-up links often pass through a
// sign-in page on another host, so a redirect may leave the domain (Kiro's takes 6 hops).
async function problem(url) {
  let at = new URL(url);
  for (let hop = 0; hop <= 10; hop++) {
    const res = await fetch(at, { redirect: "manual", headers: { "user-agent": "spacepeak-link-check" }, signal: AbortSignal.timeout(20_000) });
    await res.body?.cancel();
    if (res.status >= 300 && res.status < 400 && res.headers.has("location")) { at = new URL(res.headers.get("location"), at); continue; }
    return res.ok ? null : `HTTP ${res.status}`;
  }
  return "more than 10 redirects";
}

async function pull() {
  const lock = JSON.parse(readFileSync(join(ROOT, LOCK), "utf8"));
  const url = `https://raw.githubusercontent.com/${lock.repo}/${lock.commit}/${lock.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha256(buf) !== lock.sha256) { console.error(`resources: ${lock.path}: sha256 is not the lock's ${lock.sha256}`); process.exit(1); }
  const data = subset(JSON.parse(buf.toString("utf8")));
  const left_out = [];
  for (const row of data.rows) {
    const why = await problem(row.link).catch((e) => `fetch failed: ${e.cause?.code ?? e.message}`);
    console.log(`${why ? "LEFT OUT" : "ok      "} ${row.id} ${row.link}${why ? `: ${why}` : ""}`);
    if (why) left_out.push({ id: row.id, link: row.link, problem: why });
  }
  data.rows = data.rows.filter((r) => !left_out.some((l) => l.id === r.id));
  const text = serialize(data);
  writeFileSync(join(ROOT, OUT), text);
  const links_checked = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
  writeFileSync(join(ROOT, LOCK), `${JSON.stringify({ ...lock, links_checked, left_out, outputs: { [OUT]: sha256(text) } }, null, 2)}\n`);
  console.log(`resources: ${data.rows.length} programs written, ${left_out.length} left out (${lock.commit.slice(0, 7)})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  pull().catch((e) => { console.error(`resources: ${e.message}`); process.exit(3); });
}
