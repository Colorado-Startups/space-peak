// The logic behind <Figure claim="S-04" />: one claims-register row turned into what the page shows.
// A visitor sees the value and, when the row has a source, a small "source" link. The status stays in the
// register and /data/claims.json. getClaim throws on an unknown ID, so a bad ID fails the build.
import { getClaim, type ClaimRow, type ClaimStatus } from "../lib/claims/parse";
import { buildMapData } from "../lib/map/data";

export interface FigureView {
  id: string;
  value: string;
  href?: string;
}

/** A page that shows a figure with one of these statuses carries UNPROVEN_NOTE, once (issue #153). */
export const UNPROVEN: readonly ClaimStatus[] = ["unverified", "unverifiable"];
export const UNPROVEN_NOTE = "Figures without a source link are not yet confirmed.";

const URL_RE = /https?:\/\/[^\s,;)]+/;
const CITES_RE = /^Per ([A-Z]-\d+)\b/;

// G and R rows cite their register section's one source, not a URL of their own. The map layer
// (03_deliverables/map/space_peak_map.geojson) carries each one's link: a summit's GNIS query, the loop's file.
const { loop, summits } = buildMapData([]);
const SECTION_URL: Record<string, (id: string) => string | undefined> = {
  G: (id) => summits.find((s) => s.register === id)?.source_url,
  R: () => loop.source_url,
};

/** A row's source link: the first URL in its Source cell, else the row it cites ("Per P-03"), else its section's. */
export function sourceUrl(row: ClaimRow, lookup: (id: string) => ClaimRow = getClaim): string | undefined {
  const source = row.source.replace(/`/g, "").trim();
  if (!source) return undefined;
  const cited = CITES_RE.exec(source)?.[1];
  return URL_RE.exec(source)?.[0] ?? (cited ? sourceUrl(lookup(cited), lookup) : SECTION_URL[row.series]?.(row.id));
}

/** Value and source link for a claim ID. `value` overrides the register's wording. */
export function figureView(id: string, value?: string, lookup: (id: string) => ClaimRow = getClaim): FigureView {
  const row = lookup(id);
  return { id: row.id, value: value ?? row.claim, href: sourceUrl(row, lookup) };
}
