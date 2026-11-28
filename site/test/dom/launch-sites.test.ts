// Issue #139: /launch/ tours exactly the brief's ranked three, in its order, plus Pikes Peak as the name and
// headquarters, each with its register rows and its Hurdles. Issue #153: plain labels, and no exclusions
// block; Blanca Peak and the Crestones / Great Sand Dunes are not shown. test/unit/figure.test.ts checks each figure.
import { existsSync, readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allClaims, getClaim } from "../../src/lib/claims/parse";
import { launch, parseLaunch, placesOf, rowsOf } from "../../src/lib/launch/data";
import { TOUR } from "../../src/lib/map/data";
import { DIST_DIR } from "./pages";

const RANKED = ["Greenhorn / Wet Mtns", "Culebra Peak", "Spanish Peaks"]; // the brief's "Honest ranking", best first
const data = launch();
const { sites, risks } = data;
const yaml = readFileSync(new URL("../../../data/launch.yaml", import.meta.url), "utf8");

describe("data/launch.yaml, the tour", () => {
  it("ranks exactly the brief's three in its order, then Pikes Peak as headquarters", () => {
    expect(sites.ranked.map((p) => p.site)).toEqual(RANKED);
    expect(sites.headquarters.site).toBe("Pikes Peak");
  });

  it("shows every S- and G- row of each toured place, with the brief's veto as Hurdles, and its summit is the map's", () => {
    for (const p of [...sites.ranked, sites.headquarters]) {
      const want = allClaims().filter((r) => r.site === p.site && ["S", "G"].includes(r.series)).map((r) => r.id);
      expect(rowsOf(p).sort()).toEqual(want.sort());
      expect(p.veto?.length, `${p.name} shows its Hurdles`).toBeGreaterThan(0);
    }
    const summits = [...sites.ranked, sites.headquarters].map((p) => getClaim(p.claims.find((id) => id.startsWith("G-"))!).claim);
    summits.forEach((claim, i) => expect(claim.startsWith(`${TOUR[i]},`)).toBe(true));
  });

  it("fails on a row of another site, on a fourth ranked site, and on an exclusions list", () => {
    expect(() => parseLaunch(yaml.replace("[S-01,", "[S-04,"))).toThrow(/S-04 is a row of "Culebra Peak"/);
    expect(() => parseLaunch(yaml.replace("  headquarters:", "    - { name: Pikes, site: Pikes Peak, claims: [G-05] }\n  headquarters:"))).toThrow();
    expect(() => parseLaunch(yaml.replace("  headquarters:", "  exclusions: []\n  headquarters:"))).toThrow(/exclusions/);
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

  it("shows exactly three ranked sites in the brief's order, and Pikes Peak outside the ranking", () => {
    expect(text(section.querySelector("#sites-ranking"))).toBe("Ranked, best first.");
    expect(ranked.map((li) => li.getAttribute("data-site"))).toEqual(RANKED);
    expect(hq?.getAttribute("data-site")).toBe("Pikes Peak");
    expect(text(hq?.querySelector(".site-tag") ?? null)).toBe("The name and headquarters");
    expect(hq?.closest("ol")).toBeNull();
  });

  it("shows every row of the tour and the risks as a figure, each place's veto under Hurdles", () => {
    const figures = [...doc.querySelectorAll("section[aria-labelledby='sites'] .figure, section[aria-labelledby='risks'] .figure")];
    expect(figures.map((f) => f.getAttribute("data-claim"))).toEqual([...placesOf(data).flatMap(rowsOf), ...risks.flatMap((r) => r.claims)]);
    for (const card of [...ranked, hq]) expect(text(card?.querySelector(".site-veto-label") ?? null)).toBe("Hurdles");
  });

  it("has no exclusions block, and names neither excluded site", () => {
    const main = doc.querySelector("main");
    expect(main?.querySelector(".exclusions, #exclusions")).toBeNull();
    expect(text(main)).not.toMatch(/exclusion|Blanca|Crestone|Sand Dunes|Sisnaajini|the brief|veto/i);
  });

  it("locates the tour on the map's own drawing", () => {
    expect(section.querySelector("img[src='/maps/south.svg']")?.getAttribute("alt")).toContain(TOUR.join(", "));
  });
});
