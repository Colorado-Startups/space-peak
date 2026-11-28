import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allClaims, getClaim, parseRegister } from "../../src/lib/claims/parse";

const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const REGISTER = repo("02_substance/claims_register.md");

// The Python checker's own reading of a register, run isolated (-I) as CI runs it.
const pythonDump = (register: string) =>
  spawnSync("python3", ["-I", repo("04_tools/space_peak_claims.py"), "--json", "--register", register], { encoding: "utf8" });

const fixture = (text: string) => {
  const path = join(mkdtempSync(join(tmpdir(), "claims-")), "register.md");
  writeFileSync(path, text);
  return path;
};

const table = (status: string) =>
  `## Fixture\n\n| ID | Claim | Status | Source | Notes |\n| --- | --- | --- | --- | --- |\n| X-01 | A claim | ${status} | | |\n`;

describe("claims register parser", () => {
  it("gives the same rows as the Python checker, for every row", () => {
    const python = pythonDump(REGISTER);
    expect(python.status, python.stderr).toBe(0);
    const rows = parseRegister(readFileSync(REGISTER, "utf8"));
    expect(rows.length).toBeGreaterThan(50);
    expect(rows).toEqual(JSON.parse(python.stdout));
    expect(allClaims()).toEqual(rows);
  });

  it("types a row with its series, section and site", () => {
    const s01 = { id: "S-01", series: "S", section: "Site table claims", site: "Greenhorn / Wet Mtns", claim: "Elevation about 12,300 ft" };
    expect(getClaim("S-01")).toEqual({ ...s01, status: "unverified", source: "", notes: "" });
    expect(getClaim("P-01")).not.toHaveProperty("site");
  });

  it("throws on an unknown id", () => {
    expect(() => getClaim("X-99")).toThrow(/no row X-99/);
  });

  it("throws on a bad status, as the Python checker exits 3", () => {
    expect(parseRegister(table("`verified`"))[0].status).toBe("verified");
    expect(() => parseRegister(table("`confirmed`"))).toThrow(/unknown status/);
    const python = pythonDump(fixture(table("`confirmed`")));
    expect(python.status).toBe(3);
    expect(python.stderr + python.stdout).toMatch(/unknown status/);
  });
});
