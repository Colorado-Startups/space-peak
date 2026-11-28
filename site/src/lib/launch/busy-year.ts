// The world's launch count beside the /launch/ cadence calculator: register row E-02, read at build time.
// The count lives only in the row's claim, so a register edit moves the page. A claim without one fails the build.
// The client script never imports this file, which keeps the register text out of the browser bundle.
import { getClaim, type ClaimRow } from "../claims/parse";

export interface BusyYear {
  count: number;
  year: number;
}

const COUNT_RE = /\b(\d[\d,]*) orbital launch attempts in (\d{4})\b/;

/** The count and its year in a claim such as "259 orbital launch attempts in 2024". Throws when the claim has none. */
export function busyYear(row: ClaimRow = getClaim("E-02")): BusyYear {
  const m = COUNT_RE.exec(row.claim);
  if (!m) throw new Error(`${row.id}: the claim names no "N orbital launch attempts in YYYY": ${row.claim}`);
  return { count: Number(m[1].replace(/,/g, "")), year: Number(m[2]) };
}
