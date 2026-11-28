// The world's launch count beside the /launch/ cadence calculator: register row E-02, read at build time.
// The count lives only in the row's claim, so a register edit moves the page. A claim without one fails the build.
// The client script never imports this file, which keeps the register text out of the browser bundle.
import { getClaim, type ClaimRow } from "../claims/parse";

export interface BusyYear {
  count: number;
  year: number;
}

// A whole number, with thousands commas or none, that does not sit inside a longer run of digits and commas.
const COUNT_RE = /(?<![\d,])(\d{1,3}(?:,\d{3})+|\d+) orbital launch attempts in (\d{4})\b/;

/** The count and its year in a claim such as "259 orbital launch attempts in 2024".
 *  Throws when the claim has no such count, or when the count is below 1. */
export function busyYear(row: ClaimRow = getClaim("E-02")): BusyYear {
  const m = COUNT_RE.exec(row.claim);
  if (!m) throw new Error(`${row.id}: the claim names no "N orbital launch attempts in YYYY": ${row.claim}`);
  const count = Number(m[1].replace(/,/g, ""));
  if (count < 1) throw new Error(`${row.id}: the launch count must be 1 or more, got ${m[1]}`);
  return { count, year: Number(m[2]) };
}
