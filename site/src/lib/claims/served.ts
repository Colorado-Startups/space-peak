// The register rows the site serves. Paul, 2026-11-27: the site never shows the Blanca Peak or Crestones
// exclusions (issue #199). The register keeps those rows; build.ts serves only the rows kept here, so
// /data/claims.json, /data/metrics.json and every /mcp tool leave them out. A new row stays out the same way.
import type { ClaimRow } from "./parse";

// Each name the register gives the two places: the Site values "Blanca Peak" and "Crestones / Sand Dunes",
// the map pin Crestone Peak, and Sisnaajini, Blanca Peak's Navajo name, in its spaced and Tsis- spellings.
// A space, underscore or hyphen may join a name's words, and a name may not end a longer word.
const UNSHOWN = /(?<![a-z])(blanca|crestones?|sand[\s_-]*dunes?|t?sis[\s_-]*naa?s?j)/i;

/** A cell's text with its accents dropped, so "Sis Naajiní" reads as "Sis Naajini". */
const plain = (cell: string) => cell.normalize("NFKD").replace(/\p{M}/gu, "");

/** The rows to serve, in register order: every row that names neither place in any of its cells. */
export function servedClaims(rows: readonly ClaimRow[]): ClaimRow[] {
  return rows.filter((row) => !Object.values(row).some((cell: string) => UNSHOWN.test(plain(cell))));
}
