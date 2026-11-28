import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getClaim } from "../../src/lib/claims/parse";
import { allEstimates, estimateTag, parseEstimate, registerId } from "../../src/lib/estimates/schema";

const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const rules = JSON.parse(readFileSync(repo("04_tools/space_peak_rules.json"), "utf8"));

// q-01 as approved, and the same file as the draft it was before Paul's approval.
const APPROVED_BY = "estimator: By Claude, approved by Paul";
const DRAFT_BY = "estimator: Draft by Claude for Paul's review";
const approved = readFileSync(repo("data/estimates/q-01.yaml"), "utf8");
const draft = approved.replace(APPROVED_BY, DRAFT_BY).replace(/^approved: true\napproved_on: .*$/m, "approved: false");

describe("estimates", () => {
  const estimates = allEstimates();

  it("reads every estimate, and warns under 5", () => {
    if (estimates.length < 5) console.warn(`[estimates] guideline: ${estimates.length} estimates, at least 5 suggested`);
  });

  it("gives each estimate an open Q row whose note matches its approval, and cites only rows the register has", () => {
    expect(rules.claim_series.terms).toContain("Q");
    for (const e of estimates) {
      const row = getClaim(registerId(e));
      // A Q row stays open until its question resolves; approval changes only its note.
      expect(row.status).toBe("open");
      // The note carries the estimate file's own date, so the row's figure has a date beside it.
      expect(row.notes).toBe(e.approved ? `estimate of ${e.date}, approved by Paul ${e.approved_on}` : `draft estimate of ${e.date}, awaiting approval`);
      for (const id of e.claims) expect(() => getClaim(id)).not.toThrow();
    }
  });

  it('tags an unapproved estimate "draft estimate", and an approved one "estimate" without "draft"', () => {
    expect(estimateTag({ approved: false })).toBe("draft estimate");
    expect(estimateTag({ approved: true })).toBe("estimate");
    expect(estimateTag(parseEstimate("q-01.yaml", draft))).toBe("draft estimate");
    expect(estimateTag(parseEstimate("q-01.yaml", approved))).toBe("estimate");
    for (const e of estimates.filter((x) => x.approved)) expect(estimateTag(e), e.id).not.toMatch(/draft/);
  });

  it("accepts a draft and an approved estimate, each with its own estimator", () => {
    expect(parseEstimate("q-01.yaml", draft)).toMatchObject({ approved: false, estimator: "Draft by Claude for Paul's review" });
    expect(parseEstimate("q-01.yaml", draft)).not.toHaveProperty("approved_on");
    expect(parseEstimate("q-01.yaml", approved)).toMatchObject({ approved: true, approved_on: "2026-11-27", estimator: "By Claude, approved by Paul" });
  });

  it("rejects an approval without its date, an estimator that does not match, and a draft with an approval date", () => {
    expect(() => parseEstimate("q-01.yaml", approved.replace(/^approved_on: .*\n?/m, ""))).toThrow();
    expect(() => parseEstimate("q-01.yaml", approved.replace("approved_on: 2026-11-27", "approved_on: 27 November"))).toThrow();
    expect(() => parseEstimate("q-01.yaml", approved.replace(APPROVED_BY, DRAFT_BY))).toThrow();
    expect(() => parseEstimate("q-01.yaml", draft.replace(DRAFT_BY, APPROVED_BY))).toThrow();
    expect(() => parseEstimate("q-01.yaml", `${draft.trimEnd()}\napproved_on: 2026-11-27\n`)).toThrow();
  });

  it("rejects a certainty and a mismatched filename, and needs sources", () => {
    expect(() => parseEstimate("q-01.yaml", approved.replace("p: 0.07", "p: 1"))).toThrow();
    expect(() => parseEstimate("q-09.yaml", approved)).toThrow(/filename/);
    expect(() => parseEstimate("q-01.yaml", approved.replace(/^sources:[\s\S]*?(?=^estimator:)/m, ""))).toThrow();
  });
});
