// The register rows the site serves. Paul, 2026-11-27: the site never shows the Blanca Peak or Crestones
// exclusions (issue #199). The register keeps those rows; build.ts serves only the rows kept here, so
// /data/claims.json, /data/metrics.json and every /mcp tool leave them out. A new row stays out the same way.
import type { ClaimRow } from "./parse";

// Each name the register gives the two places: the Site values "Blanca Peak" and "Crestones / Sand Dunes",
// the map pin Crestone Peak, and Sisnaajini, Blanca Peak's Navajo name.
const UNSHOWN = /\b(blanca|crestones?|sand dunes|sisnaaj)/i;

/** The rows to serve, in register order: every row that names neither place in any of its cells. */
export function servedClaims(rows: readonly ClaimRow[]): ClaimRow[] {
  return rows.filter((row) => !Object.values(row).some((cell) => UNSHOWN.test(cell)));
}
