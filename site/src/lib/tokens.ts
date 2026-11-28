// A design token's value, read from tokens.css at build time, for the few places CSS cannot reach:
// an HTML attribute such as an image's sizes cannot hold var(--size-wrap).
import tokensCss from "../styles/tokens.css?raw";

/** The value tokens.css gives a custom property, such as "1180px" for --size-wrap. Throws when it gives none. */
export function tokenValue(name: `--${string}`, css: string = tokensCss): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = new RegExp(`(?:^|[\\s;{])${escaped}\\s*:\\s*([^;}]+)`).exec(css)?.[1].trim();
  if (!value) throw new Error(`tokens.css has no ${name}`);
  return value;
}
