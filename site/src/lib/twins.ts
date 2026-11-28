// Markdown twins (llmstxt.org, read 2026-11-27): each live page also serves <path>index.md, built from the
// data the page draws, never from its HTML. A page without its own body below still gets a twin that links it.
import { CLAUDE_STEPS, DOCS, snippets } from "./ai/connect";
import { SITE } from "./data/build";
import type { MapData } from "./map/data";
import { liveLinks, type NavLink } from "./nav";

export const HOME = { href: "/", title: "Space Peak", description: "Colorado's hub for the future of space." };
export const SUMMARY =
  "Space Peak is the Colorado Startups region for Colorado Springs and Fountain. " +
  "Everything on it about a mass driver in a Colorado peak is speculative: a venture thesis, not an engineering proposal.";

/** /map/ is twinned at /map/index.md, the home page at /index.md. */
export const twinPath = (href: string) => `${href}index.md`;
/** The absolute spacepeak.co URL of a site path. */
export const url = (path: string) => `${SITE}${path}`;
const item = (label: string, path: string, note?: string) => `- [${label}](${url(path)})${note ? `: ${note}` : ""}`;
const section = (title: string, lines: string[]) => (lines.length ? [`## ${title}`, "", ...lines, ""] : []);
const fence = (lang: string, code: string) => [`\`\`\`${lang}`, code, "```", ""];
/** Every twin ends here. A page lists its own files first, so the twin keeps one Open data section. */
const footer = (data: string[] = []) => [
  ...section("Open data", [...data, item("Data manifest", "/data/index.json", "every file, its schema and sha256"), item("llms.txt", "/llms.txt", "the map of this site for language models")]),
  "Licence: CC0 1.0 for what Colorado Startups made here. Others' work keeps its own terms.",
  "",
];

function home(links: NavLink[]): string[] {
  return [`# ${HOME.title}`, "", `> ${HOME.description}`, "", SUMMARY, "", ...section("Pages", links.map((l) => item(l.label, twinPath(l.href)))), ...footer()];
}

/** The date DOCS was checked, from the comment in lib/ai/connect.ts. That file wins if they differ. */
export const DOCS_READ = "2026-11-27";

/** /ai/: the same snippets the page shows, from lib/ai/connect.ts. */
function ai(): string[] {
  const s = snippets(SITE);
  return [
    "# Use it with your AI",
    "",
    "> Free. No key. Read-only. CC0.",
    "",
    ...section("Any chat", ["Paste a link into any chat.", "", `- [${s.llms}](${s.llms})`, `- [${s.site}](${s.site})`]),
    ...section("Claude", [`Connector URL: \`${s.mcp}\``, "", ...CLAUDE_STEPS.map((step, i) => `${i + 1}. ${step}`)]),
    "## Claude Code",
    "",
    ...fence("bash", s.claudeCode),
    "## OpenCode",
    "",
    ...fence("bash", s.opencode),
    "opencode.json, OpenCode 2:",
    "",
    ...fence("json", s.opencodeV2),
    "opencode.json, OpenCode 1:",
    "",
    ...fence("json", s.opencodeV1),
    ...section(`Docs (read ${DOCS_READ})`, DOCS.map(([name, href]) => `- [${name}](${href})`)),
    ...footer([`- [Data catalog](${s.catalog}): the schema.org DataCatalog of every open data file`]),
  ];
}

function map({ loop, summits, orgs }: MapData): string[] {
  const kinds = [...new Set(orgs.map((o) => o.kind))].sort();
  return [
    "# Map",
    "",
    `> The ${loop.name}, the summits the brief tours and the organisations Space Peak features.`,
    "",
    `The loop follows ${loop.roads.join(", ")}. It is the website's region, not a launch site. Source: [${loop.source}](${loop.source_url}).`,
    "",
    ...section("Summits (speculative)", summits.map((s) => `- [${s.summit}](${s.source_url}): register ${s.register}, ${s.claims.map((c) => `${c.id} ${c.status}`).join(", ") || "no claims"}`)),
    ...kinds.flatMap((k) => section(`Organisations: ${k.replace("_", " ")}`, orgs.filter((o) => o.kind === k).map((o) => `- [${o.name}](${o.source_url})`))),
    ...section("Files", [item("Map layer (GeoJSON)", "/data/map.geojson"), item("Organisations (JSON)", "/data/orgs.json")]),
    ...footer(),
  ];
}

function fallback(link: NavLink): string[] {
  return [`# ${link.label}`, "", `> ${SUMMARY}`, "", `Read the full page at [${url(link.href)}](${url(link.href)}).`, "", ...footer()];
}

/** Every twin: its path to its Markdown body. The home page comes first, then each page liveLinks() returns. */
export function twins(mapData: MapData, links: NavLink[] = liveLinks()): Map<string, string> {
  const bodies: Record<string, () => string[]> = { "/map/": () => map(mapData), "/ai/": ai };
  const pages: [string, string[]][] = [
    [twinPath(HOME.href), home(links)],
    ...links.map((l): [string, string[]] => [twinPath(l.href), (bodies[l.href] ?? (() => fallback(l)))()]),
  ];
  return new Map(pages.map(([path, lines]) => [path, lines.join("\n")]));
}
