// The /about/ page's facts in one file, so test/dom/about.test.ts checks each against the repo with no build.
export const REPO = "https://github.com/Colorado-Startups/space-peak";
const blob = (path: string) => `${REPO}/blob/main/${path}`;
const link = (text: string, href: string) => ({ text, href });
export type Link = { text: string; href: string };
export type Part = string | Link;

/** How a listing gets in. Each step links to the form or file that does it. */
export const STEPS: { label: Link; detail: Part[] }[] = [
  { label: link("Fill in the form", `${REPO}/issues/new?template=4-add-organisation.yml`), detail: ["Name, kind, city and one sourced fact"] },
  { label: link("Pull request", `${REPO}/tree/main/data/orgs`), detail: ["One YAML file in data/orgs/"] },
  {
    label: link("CI checks it", blob(".github/workflows/ci.yml")),
    detail: [link("Fields and sources", blob("site/src/lib/orgs/schema.ts")), ", then ", link("area, duplicates and source age", blob("site/src/lib/orgs/check.ts"))],
  },
  { label: link("A maintainer reviews", `${blob("CONTRIBUTING.md")}#who-decides`), detail: ["Reads the diff and ", link("checks the source", blob("scripts/check-sources.mjs"))] },
  { label: link("Merge", blob(".github/rulesets/protect-main.json")), detail: ["Only when the checks pass"] },
  { label: link("Live in the guide", "/guide/"), detail: [link("Cloudflare deploys main", blob("wrangler.jsonc"))] },
];

/** The outside hosts the Content-Security-Policy in site/public/_headers lets a page reach. */
export const HOSTS = [{ host: "tiles.openfreemap.org", name: "OpenFreeMap" }, { host: "tiles.mapterhorn.com", name: "Mapterhorn" }];
export const HEADERS = blob("site/public/_headers");
export const WORKERS_LOGS = "https://developers.cloudflare.com/workers/observability/logs/workers-logs/";
export const CLOUDFLARE_PRIVACY = "https://www.cloudflare.com/privacypolicy/";

export const ACCESS = {
  target: link("WCAG 2.2", "https://www.w3.org/TR/WCAG22/"),
  axe: link("Checks every page in CI", blob("site/e2e/routes-axe.spec.ts")),
  report: link("Report a problem", `${REPO}/issues/new?template=5-accessibility.yml`),
};

/** Licences and third-party credits. A `liveMap` row shows once components/map/LiveMap.astro exists.
 * README.md's License section links the same outside pages; test/dom/about.test.ts checks they match. */
export const CREDITS: { id: string; part: string; from: Part[]; terms: Part[]; liveMap?: true }[] = [
  { id: "content", part: "Words and data", from: ["Colorado Startups"], terms: [link("CC0 1.0", blob("LICENSE"))] },
  { id: "code", part: "Code", from: ["Colorado Startups"], terms: [link("CC0 1.0", blob("LICENSES/CC0-1.0.txt")), " or ", link("0BSD", blob("LICENSES/0BSD.txt"))] },
  { id: "photo", part: "The painting's source photo", from: ["Huttarl, edited. ", link("Art credits", "/art/NOTICE.md")], terms: [link("CC BY 2.5", "https://creativecommons.org/licenses/by/2.5/")] },
  { id: "aileron", part: "Aileron font", from: [link("Dot Colon", "https://www.dotcolon.net/fonts/aileron/")], terms: [link("CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/")] },
  {
    id: "atkinson", part: "Atkinson Hyperlegible font", from: [link("Braille Institute", "https://www.brailleinstitute.org/freefont/")],
    terms: [link("SIL OFL 1.1", "https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/OFL.txt")],
  },
  {
    id: "coc", part: "Code of Conduct", terms: [link("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/")],
    from: [link("Contributor Covenant 3.0", "https://www.contributor-covenant.org/version/3/0/"), ", adapted in ", link("CODE_OF_CONDUCT.md", blob("CODE_OF_CONDUCT.md"))],
  },
  {
    id: "tiles", part: "Live map tiles", liveMap: true, terms: ["Credited on the map"],
    from: [link("© OpenStreetMap contributors", "https://www.openstreetmap.org/copyright"), ", ", link("OpenMapTiles", "https://openmaptiles.org/"), ", ",
      link("OpenFreeMap", "https://openfreemap.org/"), ", ", link("Mapterhorn", "https://mapterhorn.com/attribution")],
  },
];
