// Every snippet the home teaser and /ai/ show, built from the site's canonical origin.
// Each shape is the one its app's docs give, read on READ; the PR for issue #131 quotes them.
export const SERVER = "spacepeak"; // The name the server gives itself in site/worker/mcp.ts.
export const READ = "2026-11-27";
export const DOCS = [
  ["Claude", "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"],
  ["Claude Code", "https://code.claude.com/docs/en/mcp"],
  ["OpenCode", "https://opencode.ai/docs/mcp-servers"],
  ["OpenCode 1", "https://opencode.ai/v1/docs/mcp-servers/"],
] as const;

/** Adding a custom connector on claude.ai, in the app's own menu names. */
export const CLAUDE_STEPS = [
  "Customize › Connectors › + Add › Add custom connector",
  "Name it Space Peak, paste the URL › Continue",
  "Check the detected settings › Continue",
  "Authentication: No sign in › Add",
];

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function snippets(site: URL | string) {
  const at = (path: string) => new URL(path, site).href;
  const mcp = at("/mcp");
  return {
    site: at("/"),
    llms: at("/llms.txt"),
    mcp,
    catalog: at("/data/catalog.json"),
    claudeCode: `claude mcp add --transport http ${SERVER} ${mcp}`,
    opencode: `opencode mcp add ${SERVER} --url ${mcp}`,
    // OpenCode 2 lists servers under mcp.servers. OpenCode 1's flat map, with enabled, still loads in 2 (opencode.ai/docs/migrate-v1).
    opencodeV2: json({ mcp: { servers: { [SERVER]: { type: "remote", url: mcp } } } }),
    opencodeV1: json({ mcp: { [SERVER]: { type: "remote", url: mcp, enabled: true } } }),
  };
}
