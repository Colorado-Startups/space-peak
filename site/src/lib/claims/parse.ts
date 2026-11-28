// The one reading of 02_substance/claims_register.md for the site. The register wins over this file.
// 04_tools/space_peak_claims.py --json reads the same tables, and test/unit/claims-parse.test.ts
// asserts both give equal rows. Change both together.
import registerText from "../../../../02_substance/claims_register.md?raw";

export const STATUSES = ["unverified", "verified", "corrected", "unverifiable", "open"] as const;
export type ClaimStatus = (typeof STATUSES)[number];

export interface ClaimRow {
  id: string;
  series: string;
  section: string;
  site?: string;
  claim: string;
  status: ClaimStatus;
  source: string;
  notes: string;
}

const CLAIM_COLUMNS = ["id", "claim", "status", "source", "notes"];
const ID_RE = /^([A-Z])-\d+$/;
const HEADING_RE = /^##\s+(.+?)\s*$/;

const splitCells = (line: string) => line.replace(/^\|+|\|+$/g, "").split("|").map((c) => c.trim());
const isStatus = (s: string): s is ClaimStatus => (STATUSES as readonly string[]).includes(s);

/** The lower-cased names when a table row is a claims-table header, else null. */
function claimHeader(cells: string[]): string[] | null {
  const names = cells.map((c) => c.toLowerCase());
  return CLAIM_COLUMNS.every((col) => names.includes(col)) ? names : null;
}

/** One claims-table row under its header. Throws on a bad row. */
function claimRow(line: string, header: string[], section: string, seen: Set<string>): ClaimRow {
  const cells = splitCells(line);
  if (cells.length !== header.length)
    throw new Error(`claims row has ${cells.length} cells, header has ${header.length}: ${line}`);
  const cell = Object.fromEntries(header.map((name, i) => [name, cells[i]]));
  const idMatch = ID_RE.exec(cell.id);
  if (!idMatch || seen.has(cell.id)) throw new Error(`bad or duplicate claim id: ${cell.id}`);
  seen.add(cell.id);
  const status = cell.status.replace(/^`+|`+$/g, "");
  if (!isStatus(status)) throw new Error(`${cell.id}: unknown status ${cell.status}`);
  const site = "site" in cell ? { site: cell.site } : {};
  const { claim, source, notes } = cell;
  return { id: cell.id, series: idMatch[1], section, ...site, claim, status, source, notes };
}

/** Every row of every table whose header has ID, Claim, Status, Source and Notes. Throws on a bad row. */
export function parseRegister(text: string): ClaimRow[] {
  const rows: ClaimRow[] = [];
  const seen = new Set<string>();
  let section = "";
  let header: string[] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = HEADING_RE.exec(line);
    if (heading) section = heading[1];
    if (heading || !line.startsWith("|")) header = null;
    else if (!header) header = claimHeader(splitCells(line));
    else if (!/^[|\-: ]+$/.test(line)) rows.push(claimRow(line, header, section, seen));
  }
  return rows;
}

let byId: Map<string, ClaimRow> | undefined;

/** Every claim in the register, in register order. */
export function allClaims(): ClaimRow[] {
  byId ??= new Map(parseRegister(registerText).map((row) => [row.id, row]));
  return [...byId.values()];
}

/** One claim by ID, such as "S-04". Throws on an ID the register does not have. */
export function getClaim(id: string): ClaimRow {
  allClaims();
  const row = byId!.get(id);
  if (!row) throw new Error(`claims register has no row ${id}`);
  return row;
}
