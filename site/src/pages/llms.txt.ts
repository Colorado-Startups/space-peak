// GET /llms.txt (llmstxt.org, read 2026-11-27): an H1, a blockquote, then H2 lists of links, Optional last.
import type { APIRoute } from "astro";
import { buildFiles, mediaType, SCHEMAS } from "../lib/data/build";
import { liveLinks, type NavLink } from "../lib/nav";
import { HOME, SUMMARY, twinPath, url } from "../lib/twins";

const REPO = "https://github.com/Colorado-Startups/space-peak";
const SCHEMA_OF: Record<string, string> = { "orgs.csv": "orgs-csv-row", "orgs.geojson": "orgs-geojson" };
const link = (label: string, href: string, note: string) => `- [${label}](${href}): ${note}`;

/** The /data/ files: the built set (its names do not depend on the data), plus the manifest and the map layer. */
export const dataFiles = () => ["index.json", ...buildFiles([], [], "").keys(), "map.geojson"].filter((p) => !p.startsWith("schemas/"));

export function llmsTxt(links: NavLink[] = liveLinks()): string {
  const schemaNote = (p: string) => {
    const name = SCHEMA_OF[p] ?? p.replace(/\.json$/, "");
    return name in SCHEMAS ? `, schema ${url(`/data/schemas/${name}.json`)}` : "";
  };
  const sections: [string, string[]][] = [
    ["Pages", [HOME, ...links.map((l) => ({ href: l.href, title: l.label }))].map((p) => link(p.title, url(twinPath(p.href)), `Markdown twin of ${url(p.href)}`))],
    ["Open data", dataFiles().map((p) => link(p, url(`/data/${p}`), `${mediaType(p)}${schemaNote(p)}`))],
    ["Schemas", Object.keys(SCHEMAS).map((n) => link(`${n}.json`, url(`/data/schemas/${n}.json`), "JSON Schema 2020-12"))],
    ["Tools", [
      link("MCP server", url("/mcp"), "Model Context Protocol server for this site, served by the Worker"),
      link("API catalog", url("/.well-known/api-catalog"), "RFC 9727 linkset of the MCP server and the data"),
    ]],
    ["Optional", [
      link("Source repository", REPO, "the site, the data and the claims register"),
      link("Concept brief", `${REPO}/blob/main/02_substance/Space-Peak-Concept-Brief.md`, "the speculative thesis the site comes from"),
      link("CC0 1.0 licence", "https://creativecommons.org/publicdomain/zero/1.0/", "for what Colorado Startups made here; others' work keeps its own terms"),
    ]],
  ];
  return [`# ${HOME.title}`, "", `> ${SUMMARY}`, "", ...sections.flatMap(([title, lines]) => [`## ${title}`, "", ...lines, ""])].join("\n");
}

export const GET: APIRoute = () => new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
