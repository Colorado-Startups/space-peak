import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chipFor, figureView, sourceOf } from "../../src/components/figure";
import { allClaims, STATUSES, type ClaimRow, type ClaimStatus } from "../../src/lib/claims/parse";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const row = (status: ClaimStatus, source = ""): ClaimRow => ({
  id: "X-01", series: "X", section: "Fixture", site: "Test Peak", claim: "Elevation 1 ft", status, source, notes: "",
});

describe("<Figure>", () => {
  it("throws on an unknown claim ID, so the build fails", () => {
    expect(() => figureView("Z-999")).toThrow(/no row Z-999/);
  });

  it("reads S-04 from the register", () => {
    const fig = figureView("S-04");
    expect(fig).toMatchObject({ id: "S-04", value: "Elevation 14,047 ft", label: "Culebra Peak", status: "unverified" });
    expect(figureView("S-04", "14,047 ft").value).toBe("14,047 ft");
  });

  it.each(STATUSES)("maps %s to its own chip, whose word is the status", (status) => {
    const fig = figureView("X-01", undefined, () => row(status));
    expect(fig.chip).toEqual({ word: status, className: `figure-chip figure-chip--${status}` });
    expect(read("src/styles/figure.css")).toContain(`.figure-chip--${status} {`);
  });

  it("every unverified figure in the register carries the word", () => {
    const unverified = allClaims().filter((c) => c.status === "unverified");
    expect(unverified.length).toBeGreaterThan(0);
    for (const c of unverified) expect(figureView(c.id).chip.word).toBe("unverified");
    expect(read("src/styles/figure.css")).toMatch(/\.figure-chip--unverified \{[^}]*repeating-linear-gradient\([^)]*--co-yellow/);
  });

  it("renders the chip word as text, not colour alone", () => {
    expect(read("src/components/Figure.astro")).toMatch(/<span class=\{fig\.chip\.className\}[^>]*>\{fig\.chip\.word\}<\/span>/);
    expect(chipFor("open").word).toBe("open");
  });

  it("links a source that has a URL, and leaves plain text plain", () => {
    expect(sourceOf("NASA, Earth Atmosphere Model, https://www.grc.nasa.gov/a.html, read 2026-11-16")).toEqual({
      text: "NASA, Earth Atmosphere Model, read 2026-11-16",
      url: "https://www.grc.nasa.gov/a.html",
    });
    expect(sourceOf("GNIS 192423")).toEqual({ text: "GNIS 192423" });
    expect(sourceOf("`data/estimates/q-01.yaml`")).toEqual({ text: "data/estimates/q-01.yaml" });
    expect(sourceOf("")).toBeUndefined();
  });
});
