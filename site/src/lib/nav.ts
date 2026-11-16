// Every planned link. A link renders only once its page file exists under src/pages/.
export type NavLink = { href: string; label: string };

export const NAV: readonly NavLink[] = [
  { href: "/map/", label: "Map" },
  { href: "/guide/", label: "Guide" },
  { href: "/launch/", label: "Launch" },
  { href: "/ai/", label: "Use it with your AI" },
  { href: "/about/", label: "About" },
];

const PAGES = Object.keys(import.meta.glob("../pages/**/*.astro"));

/** /map/ is served by pages/map.astro or pages/map/index.astro. */
export function pageExists(href: string, pages: readonly string[] = PAGES): boolean {
  const path = href.replace(/^\/|\/$/g, "");
  const files = path ? [`../pages/${path}.astro`, `../pages/${path}/index.astro`] : ["../pages/index.astro"];
  return files.some((f) => pages.includes(f));
}

export function liveLinks(pages: readonly string[] = PAGES): NavLink[] {
  return NAV.filter((link) => pageExists(link.href, pages));
}
