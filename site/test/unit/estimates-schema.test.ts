import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STATUSES, getClaim } from "../../src/lib/claims/parse";
import { allEstimates, estimateTag, parseEstimate, registerId } from "../../src/lib/estimates/schema";

const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const rules = JSON.parse(readFileSync(repo("04_tools/space_peak_rules.json"), "utf8"));
const good = readFileSync(repo("data/estimates/q-01.yaml"), "utf8");

describe("draft estimates", () => {
  const estimates = allEstimates();

  it("has 5 to 7 estimates, each valid", () => {
    expect(estimates.length).toBeGreaterThanOrEqual(5);
    expect(estimates.length).toBeLessThanOrEqual(7);
  });

  it("gives each estimate an open Q row and cites only rows the register has", () => {
    expect(rules.claim_series.terms).toContain("Q");
    for (const e of estimates) {
      const row = getClaim(registerId(e));
      expect(row.status).toBe("open");
      expect(row.notes).toBe("draft estimate, not yet approved");
      for (const id of e.claims) expect(() => getClaim(id)).not.toThrow();
    }
  });

  it('labels an open row "draft estimate", and any other status without "draft"', () => {
    expect(estimateTag("open")).toBe("draft estimate");
    for (const status of STATUSES.filter((s) => s !== "open")) {
      expect(estimateTag(status), status).not.toMatch(/draft/);
      expect(estimateTag(status), status).toMatch(/estimate/);
      expect(estimateTag(status), status).not.toBe(status);
    }
  });

  it("rejects an approved flag, a certainty and a mismatched filename", () => {
    expect(() => parseEstimate("q-01.yaml", good.replace("approved: false", "approved: true"))).toThrow();
    expect(() => parseEstimate("q-01.yaml", good.replace("p: 0.07", "p: 1"))).toThrow();
    expect(() => parseEstimate("q-09.yaml", good)).toThrow(/filename/);
    expect(() => parseEstimate("q-01.yaml", good.replace(/^sources:[\s\S]*?(?=^estimator:)/m, ""))).toThrow();
  });
});
