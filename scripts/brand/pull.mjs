// Pulls Space Peak's art and tokens from the brand release pinned in brand.lock.json,
// after Colorado-Startups/coloradostartups.org scripts/brand/pull.mjs. Each download
// must match the release table's sha256; the outputs are committed, and their
// sha256 goes in the lock's "outputs" for site/test/unit/brand.test.ts.
// tokens.css ships its light :root block only. The webp sizes keep the image
// metadata, which carries the AI-made label and photo credit.
// Run: node scripts/brand/pull.mjs. Exit 0 written, 1 a hash mismatch, 3 could not pull.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ART = "site/public/art";
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** The light :root block of the brand's tokens.css, with no dark-theme rules. */
export function lightOnly(css) {
  const end = css.indexOf("\n}\n");
  if (end < 0 || !css.slice(0, end).includes(":root {")) throw new Error("tokens.css: no :root block");
  return `${css.slice(0, end)}\n}\n`;
}

// Each locked source: where it goes and how. `widths` resizes to webp with sharp.
export const PLAN = {
  "dist/tokens.css": { out: "site/src/styles/tokens.css", css: true },
  "dist/crests/space-peak-512.png": { out: `${ART}/crest-{w}.webp`, widths: [96, 192, 384] },
  "dist/places/springs.jpg": { out: `${ART}/springs-{w}.webp`, widths: [720, 1440] },
  "dist/clips/space.webm": { out: `${ART}/space.webm` },
  "dist/clips/space.mp4": { out: `${ART}/space.mp4` },
  "dist/social/space-peak.jpg": { out: `${ART}/space-peak.jpg` },
  "dist/logo/favicon.ico": { out: "site/public/favicon.ico" },
};

async function pull() {
  const { default: sharp } = await import("sharp");
  const lockFile = join(ROOT, "brand.lock.json");
  const lock = JSON.parse(readFileSync(lockFile, "utf8"));
  const outputs = {};
  const write = (path, buf) => {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), buf);
    outputs[path] = sha256(buf);
  };
  for (const [src, plan] of Object.entries(PLAN)) {
    const want = lock.files[src];
    const url = `https://raw.githubusercontent.com/${lock.repo}/${lock.tag}/${src}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha256(buf) !== want) { console.error(`brand: ${src}: sha256 is not the lock's ${want}`); process.exit(1); }
    if (plan.css) write(plan.out, Buffer.from(lightOnly(buf.toString("utf8"))));
    else if (!plan.widths) write(plan.out, buf);
    else for (const w of plan.widths) {
      const quality = w <= 720 ? 70 : 80; // springs-720 stays under 60 KB (issue #48)
      write(plan.out.replace("{w}", w), await sharp(buf).resize({ width: w }).keepMetadata().webp({ quality }).toBuffer());
    }
    console.log(`brand: ${src} ok (${lock.tag})`);
  }
  writeFileSync(lockFile, `${JSON.stringify({ ...lock, outputs }, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  pull().catch((e) => { console.error(`brand: ${e.message}`); process.exit(3); });
}
