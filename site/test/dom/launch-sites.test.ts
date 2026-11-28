// Issue #139: /launch/ tours exactly the brief's ranked three, in its order, plus Pikes Peak as the name and
// headquarters. Every figure carries its register status. Blanca Peak and the Crestones / Great Sand Dunes
// appear only as permanent exclusions, with the row that says why and no siting language.
import { existsSync, readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allClaims, getClaim } from "../../src/lib/claims/parse";
import { launch, parseLaunch, placesOf, rowsOf } from "../../src/lib/launch/data";
import { TOUR } from "../../src/lib/map/data";
import { DIST_DIR } from "./pages";

const RANKED = ["Greenhorn / Wet Mtns", "Culebra Peak", "Spanish Peaks"]; // the brief's "Honest ranking", best first
const EXCLUDED = { "Blanca Peak": ["S-20"], "Crestones / Sand Dunes": ["S-18"] };
// The repo's own exclusion check went with the hard lines (MASTER_PLAN, Decision 2026-11-16), so the words live here.
const SITING = /\b(build|bor(e|ed|ing)|tunnel|launch|fir(e|es|ed|ing)|lane|muzzle|portal|sit(e|es|ed|ing)|candidate|rank|propos|option|best|ideal|perfect)\w*/i;
const data = launch();
const { sites, risks } = data;
const yaml = readFileSync(new URL("../../../data/launch.yaml", import.meta.url), "utf8");

describe("data/launch.yaml, the tour", () => {
  it("ranks exactly the brief's three in its order, then Pikes Peak as headquarters", () => {
    expect(sites.ranked.map((p) => p.site)).toEqual(RANKED);
    expect(sites.headquarters.site).toBe("Pikes Peak");
  });

  it("shows every S- and G- row of each toured place, with the brief's veto, and its summit is the map's", () => {
    for (const p of [...sites.ranked, sites.headquarters]) {
      const want = allClaims().filter((r) => r.site === p.site && ["S", "G"].includes(r.series)).map((r) => r.id);
      expect(rowsOf(p).sort()).toEqual(want.sort());
      expect(p.veto?.length, `${p.name} shows the brief's veto`).toBeGreaterThan(0);
    }
    const summits = [...sites.ranked, sites.headquarters].map((p) => getClaim(p.claims.find((id) => id.startsWith("G-"))!).claim);
    summits.forEach((claim, i) => expect(claim.startsWith(`${TOUR[i]},`)).toBe(true));
  });

  it("gives each exclusion only the row that says why", () => {
    expect(Object.fromEntries(sites.exclusions.map((p) => [p.site, p.claims]))).toEqual(EXCLUDED);
  });

  it("fails on a row of another site, and on a fourth ranked site", () => {
    expect(() => parseLaunch(yaml.replace("[S-01,", "[S-04,"))).toThrow(/S-04 is a row of "Culebra Peak"/);
    expect(() => parseLaunch(yaml.replace("  headquarters:", "    - { name: Pikes, site: Pikes Peak, claims: [G-05] }\n  headquarters:"))).toThrow();
  });

  it("treats this test's siting words as siting words", () => {
    for (const s of ["the best site", "bore the peak", "a firing lane", "launch from it"]) expect(s).toMatch(SITING);
    expect("Sisnaajini, sacred to the Navajo").not.toMatch(SITING);
  });
});

const file = path.join(DIST_DIR, "launch", "index.html");
const ready = existsSync(file);

describe.skipIf(!ready && !process.env.CI)("the built /launch/ tour", () => {
  const doc = new JSDOM(ready ? readFileSync(file, "utf8") : "").window.document;
  const section = doc.querySelector("section[aria-labelledby='sites']") ?? doc.createElement("section"); // runs even when skipped
  const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const ranked = [...section.querySelectorAll("ol.sites-ranked > li")];
  const hq = section.querySelector(".site-card--hq");
  const block = section.querySelector(".exclusions");

  it("shows exactly three ranked sites in the brief's order, and Pikes Peak outside the ranking", () => {
    expect(ranked.map((li) => li.getAttribute("data-site"))).toEqual(RANKED);
    expect(hq?.getAttribute("data-site")).toBe("Pikes Peak");
    expect(text(hq)).toMatch(/headquarters, not a candidate/);
    expect(hq?.closest("ol")).toBeNull();
  });

  it("gives every figure in the tour and the risks its register status, as a chip word", () => {
    const figures = [...doc.querySelectorAll("section[aria-labelledby='sites'] .figure, section[aria-labelledby='risks'] .figure")];
    expect(figures.length).toBe(placesOf(data).flatMap(rowsOf).length + risks.flatMap((r) => r.claims).length);
    for (const f of figures) {
      const row = getClaim(f.getAttribute("data-claim")!);
      expect(f.getAttribute("data-status")).toBe(row.status);
      expect(f.querySelector(".figure-chip")?.textContent).toBe(row.status);
    }
  });

  it("names both exclusions in one block, with no siting language, and nowhere else on the tour", () => {
    expect(text(block)).toMatch(/Blanca Peak/);
    expect(text(block)).toMatch(/Crestones \/ Great Sand Dunes/);
    expect(text(block)).not.toMatch(SITING);
    expect([...block!.querySelectorAll(".figure")].map((f) => f.getAttribute("data-claim"))).toEqual(Object.values(EXCLUDED).flat());
    for (const card of [...ranked, hq]) expect(text(card)).not.toMatch(/Blanca|Crestone|Sand Dunes|Sisnaajini/);
  });

  it("locates the tour on the map's own drawing", () => {
    expect(section.querySelector("img[src='/maps/south.svg']")?.getAttribute("alt")).toContain(TOUR.join(", "));
  });
});
