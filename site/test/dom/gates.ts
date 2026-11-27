import { ORIGIN } from "./pages";

// Pure checks over one page's HTML. Each returns its problems; empty is a pass.
// Limits mirror Git Crafter v7.0.2 Quality metrics, so CI fails first.
export const WORDS_LIMIT = 50; // usability.words_before_action
export const WEIGHT_LIMIT = 1600 * 1024; // design.total_bytes, 1600 KiB

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

export function basicsProblems(html: string): string[] {
  const doc = parse(html);
  const out: string[] = [];
  if (!doc.documentElement.getAttribute("lang")?.trim()) out.push("no lang on <html>");
  // An SVG <title> names a drawing, not the page, so only titles outside <svg> count.
  const titles = [...doc.querySelectorAll("title")].filter((t) => !t.closest("svg"));
  if (titles.length !== 1 || !titles[0].textContent?.trim()) out.push(`${titles.length} <title>, want one with text`);
  const h1s = doc.querySelectorAll("h1").length;
  if (h1s !== 1) out.push(`${h1s} <h1>, want one`);
  if (!doc.querySelector("meta[name='description']")?.getAttribute("content")?.trim()) out.push("no meta description");
  const canonical = doc.querySelector("link[rel='canonical']")?.getAttribute("href") ?? "";
  if (!canonical.startsWith(`${ORIGIN}/`)) out.push(`canonical "${canonical}" is not on ${ORIGIN}/`);
  return out;
}

/** Internal href, src and srcset URLs, resolved to site-root paths without query or hash. */
export function internalRefs(html: string, route: string): string[] {
  const doc = parse(html);
  const raw: string[] = [];
  for (const el of doc.querySelectorAll("[href], [src], [srcset]")) {
    for (const attr of ["href", "src"]) if (el.hasAttribute(attr)) raw.push(el.getAttribute(attr)!.trim());
    const srcset = el.getAttribute("srcset");
    if (srcset) raw.push(...srcset.split(",").map((c) => c.trim().split(/\s+/)[0]));
  }
  const base = new URL(route, ORIGIN);
  const refs = raw
    .filter((ref) => ref && !ref.startsWith("#") && !/^[a-z][a-z0-9+.-]*:/i.test(ref) && !ref.startsWith("//"))
    .map((ref) => decodeURIComponent(new URL(ref, base).pathname));
  return [...new Set(refs)];
}

/** The dist file a site path serves, or null. Mirrors trailing-slash static hosting. */
export function resolveRef(ref: string, exists: (rel: string) => boolean): string | null {
  const rel = ref.replace(/^\//, "");
  const candidates = ref.endsWith("/") ? [`${rel}index.html`] : [rel, `${rel}/index.html`, `${rel}.html`];
  return candidates.find((c) => c && exists(c)) ?? null;
}

export function brokenRefs(html: string, route: string, exists: (rel: string) => boolean): string[] {
  return internalRefs(html, route).filter((ref) => resolveRef(ref, exists) === null);
}

const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);
const ACTION = "a[href], button, input:not([type='hidden']), select, textarea";

/** Visible words in <main> before its first link, button or field; null when there is no <main>. */
export function wordsBeforeAction(html: string): number | null {
  const main = parse(html).querySelector("main");
  if (!main) return null;
  let words = 0;
  const walk = (node: Node): boolean => {
    if (node.nodeType === 3) {
      words += (node.textContent ?? "").split(/\s+/).filter(Boolean).length;
      return false;
    }
    if (node.nodeType !== 1) return false;
    const el = node as Element;
    if (el.matches(ACTION)) return true;
    if (SKIP.has(el.tagName) || el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return false;
    return Array.from(el.childNodes).some(walk);
  };
  Array.from(main.childNodes).some(walk);
  return words;
}

const EXECUTABLE = new Set(["", "module", "text/javascript", "application/javascript"]);

/** Inline executable scripts, which the CSP `script-src 'self'` blocks. JSON-LD is data and allowed. */
export function inlineScripts(html: string): string[] {
  return Array.from(parse(html).querySelectorAll("script:not([src])"))
    .filter((el) => EXECUTABLE.has((el.getAttribute("type") ?? "").toLowerCase()) && el.textContent?.trim())
    .map((el) => el.textContent!.trim().slice(0, 60));
}

export function imageProblems(html: string): string[] {
  return Array.from(parse(html).querySelectorAll("img")).flatMap((img) => {
    const missing = ["alt", "width", "height"].filter((a) => !img.hasAttribute(a));
    return missing.length ? [`${img.getAttribute("src") ?? "<img>"} lacks ${missing.join(", ")}`] : [];
  });
}

const WEIGHED = /\.(css|m?js|png|jpe?g|gif|webp|avif|svg|ico)$/i;

/** HTML bytes plus every CSS, JS and image file the page references, each counted once. */
export function pageWeight(html: string, route: string, size: (rel: string) => number, exists: (rel: string) => boolean): number {
  const files = internalRefs(html, route)
    .map((ref) => resolveRef(ref, exists))
    .filter((file): file is string => file !== null && WEIGHED.test(file));
  return Buffer.byteLength(html) + [...new Set(files)].reduce((sum, file) => sum + size(file), 0);
}
