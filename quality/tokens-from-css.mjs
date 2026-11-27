// The site's design tokens as a Design Tokens Format JSON file, for the Quality page's design collector
// (Git Crafter quality/collectors/site/site-scan.mjs readTokens), which reads JSON or YAML, not CSS.
// Reads the custom properties of each CSS file in order, a later file winning, as the cascade does.
// Writes { color: { name: { $value: "#hex" } }, "font-size": { "t-step-N": { $value: "1rem" } } }.
// Usage: node quality/tokens-from-css.mjs out.json site/src/styles/tokens.css site/src/styles/space-peak.css
import { readFileSync, writeFileSync } from "node:fs";

const [out, ...files] = process.argv.slice(2);
if (!out || !files.length) {
  console.error("usage: node quality/tokens-from-css.mjs <out.json> <tokens.css>...");
  process.exit(2);
}

const props = new Map();
for (const file of files) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) props.set(m[1], m[2].trim());
}

// A var(--x) chain followed to its value; a loop or a missing name gives null.
function resolve(value, seen = new Set()) {
  const m = /^var\(--([\w-]+)\)$/.exec(value);
  if (!m) return value;
  if (seen.has(m[1]) || !props.has(m[1])) return null;
  return resolve(props.get(m[1]), seen.add(m[1]));
}

const color = {};
const size = {};
for (const [name, raw] of props) {
  const value = resolve(raw);
  if (value && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)) color[name] = { $type: "color", $value: value };
  if (value && name.startsWith("t-step") && /^[\d.]+(rem|px)$/.test(value)) size[name] = { $type: "dimension", $value: value };
}
if (!Object.keys(color).length || !Object.keys(size).length) {
  console.error(`no hex colors or --t-step-* sizes in ${files.join(", ")}`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify({ color, "font-size": size }, null, 1) + "\n");
console.log(`${out}: ${Object.keys(color).length} colors, ${Object.keys(size).length} type steps from ${files.join(", ")}`);
