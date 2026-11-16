import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Shaped like coloradostartups.org site/test/dom/pages.ts. These gates read the
// built site, so CI's standard job runs `npm run build` before `npm test`.
export const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DIST_DIR = path.join(SITE_DIR, "dist");
export const ORIGIN = "https://spacepeak.co";

export interface BuiltPage {
  /** Public route, e.g. "/", "/map/", "/404.html". */
  route: string;
  html: string;
}

function walkHtml(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

export const distExists = (): boolean => existsSync(DIST_DIR);

export function builtPages(): BuiltPage[] {
  return walkHtml(DIST_DIR)
    .map((file) => {
      const rel = path.relative(DIST_DIR, file).split(path.sep).join("/");
      const route = rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -10)}` : `/${rel}`;
      return { route, html: readFileSync(file, "utf8") };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}
