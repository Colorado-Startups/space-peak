// The logic behind <Figure claim="S-04" />: one claims-register row turned into what the page shows.
// The register wins over this file; getClaim throws on an unknown ID, so a bad ID fails the build.
import { getClaim, type ClaimRow, type ClaimStatus } from "../lib/claims/parse";

export interface FigureView {
  id: string;
  value: string;
  label: string;
  status: ClaimStatus;
  chip: { word: ClaimStatus; className: string };
  source?: { text: string; url?: string };
}

const URL_RE = /https?:\/\/[^\s,;)]+/;

/** The chip for a status. Its text is always the status word, so colour never carries it alone. */
export const chipFor = (status: ClaimStatus) => ({ word: status, className: `figure-chip figure-chip--${status}` });

/** Source text and its first URL, if any. The URL leaves the text so it is not read twice. */
export function sourceOf(source: string): FigureView["source"] {
  const raw = source.replace(/`/g, "").trim();
  if (!raw) return undefined;
  const url = URL_RE.exec(raw)?.[0];
  const text = url ? raw.replace(url, "").replace(/\s*,\s*,/g, ",").replace(/^[\s,;]+|[\s,;]+$/g, "") : raw;
  return url ? { text: text || url, url } : { text };
}

/** Value, status, source and label for a claim ID. `value` overrides the register's wording. */
export function figureView(id: string, value?: string, lookup: (id: string) => ClaimRow = getClaim): FigureView {
  const row = lookup(id);
  return {
    id: row.id,
    value: value ?? row.claim,
    label: row.site || row.section,
    status: row.status,
    chip: chipFor(row.status),
    source: sourceOf(row.source),
  };
}
