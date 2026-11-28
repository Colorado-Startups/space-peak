// @vitest-environment jsdom
// Issue #138: the cadence calculator on /launch/. Minutes between shots give launches a year, as arithmetic
// under the page's speculative lead. The brief's interval (P-08) and the world's dated launch count (E-02) are figures.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getClaim } from "../../src/lib/claims/parse";
import { busyYear } from "../../src/lib/launch/busy-year";
import {
  BRIEF_MINUTES, BRIEF_STOP, MIN_SHARE, STOPS, cadenceView, formatCount, init, launchesPerYear, minutesAt, shares,
} from "../../src/scripts/cadence.client";
import { DIST_DIR } from "./pages";

const LAST = STOPS.length - 1;
const WORLD = 250; // a round count for the arithmetic tests; the page reads its own from E-02
const share = (root: ParentNode, key: string) => root.querySelector<HTMLElement>(`[data-cadence-bar='${key}']`)!.style.getPropertyValue("--share");
const move = (input: HTMLInputElement, stop: number) => {
  input.value = String(stop);
  input.dispatchEvent(new Event("input"));
};

describe("the cadence arithmetic", () => {
  it("divides a year's 525,600 minutes by the interval, rounded, across the slider's range", () => {
    expect(launchesPerYear(STOPS[0])).toBe(105_120); // 5 minutes, the low end
    expect(launchesPerYear(BRIEF_MINUTES)).toBe(8_760);
    expect(launchesPerYear(1_440)).toBe(365);
    expect(launchesPerYear(STOPS[LAST])).toBe(183); // 2,880 minutes, the high end: 182.5 rounds up
    expect(launchesPerYear(7)).toBe(75_086); // 75,085.7 rounds up
    expect(launchesPerYear(1)).toBe(525_600);
  });

  it("refuses an interval that is not above zero", () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => launchesPerYear(bad)).toThrow(RangeError);
  });

  it("maps slider stops to minutes, in order, clamped at both ends", () => {
    expect([STOPS[0], minutesAt(BRIEF_STOP), STOPS[LAST]]).toEqual([5, 60, 2_880]);
    expect([minutesAt(-3), minutesAt(99), minutesAt(Number.NaN)]).toEqual([5, 2_880, 5]);
    expect([...STOPS]).toEqual([...STOPS].sort((a, b) => a - b));
  });

  it("scales both bars to the larger, keeping a sliver visible", () => {
    expect(shares(8_760, WORLD)).toEqual({ rate: 100, world: 2.9 });
    expect(shares(183, WORLD)).toEqual({ rate: 73.2, world: 100 });
    expect(shares(105_120, WORLD).world).toBe(MIN_SHARE);
  });

  it("keeps the brief's interval equal to its register row", () => {
    expect(getClaim("P-08").claim).toMatch(/once an hour/);
    expect(BRIEF_MINUTES).toBe(60);
  });
});

describe("the world's launch count, read from E-02", () => {
  const row = getClaim("E-02");

  it("comes from the row's claim, so the number lives only in the register (issue #198)", () => {
    const { count, year } = busyYear();
    expect(Number.isInteger(count) && count > 0 && Number.isInteger(year)).toBe(true);
    expect(row.claim).toContain(`${count} orbital launch attempts in ${year}`);
  });

  it("reads a count with thousands commas", () => {
    expect(busyYear({ ...row, claim: "The world made 1,024 orbital launch attempts in 2031" })).toEqual({ count: 1_024, year: 2_031 });
  });

  it("fails the build on a claim without a dated count", () => {
    expect(() => busyYear({ ...row, claim: "About 250 rocket launches worldwide in a busy year" })).toThrow(/E-02: the claim names no/);
  });
});

describe("the cadence script on a fixture", () => {
  it("shows the slider and moves the interval, the result, its spoken value and the bars live", () => {
    document.body.innerHTML = `<div data-cadence data-cadence-world="${WORLD}"><b data-cadence-minutes>60</b><output><b data-cadence-result>8,760</b></output>
      <p data-cadence-slider hidden><input type="range" min="0" max="${LAST}" value="${BRIEF_STOP}"></p>
      <span data-cadence-bar="rate"></span><span data-cadence-bar="world"></span></div>`;
    init(document);
    const input = document.querySelector("input")!;
    const text = (sel: string) => document.querySelector(sel)!.textContent;
    expect(document.querySelector<HTMLElement>("[data-cadence-slider]")!.hidden).toBe(false);
    expect([input.getAttribute("aria-valuetext"), text("[data-cadence-result]"), share(document, "rate"), share(document, "world")])
      .toEqual(["60 minutes", "8,760", "100", "2.9"]);
    move(input, LAST);
    expect([input.getAttribute("aria-valuetext"), text("[data-cadence-minutes]"), text("[data-cadence-result]"), share(document, "rate"), share(document, "world")])
      .toEqual(["2,880 minutes", "2,880", "183", "73.2", "100"]);
  });

  it("keeps the static text and the hidden slider when the world count is missing", () => {
    document.body.innerHTML = `<div data-cadence><p data-cadence-slider hidden><input type="range" min="0" max="${LAST}" value="${BRIEF_STOP}"></p></div>`;
    init(document);
    expect(document.querySelector<HTMLElement>("[data-cadence-slider]")!.hidden).toBe(true);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const file = path.join(DIST_DIR, "launch", "index.html");
const ready = existsSync(file);
if (!ready && !process.env.CI) console.warn(`[cadence] skipped: no ${file}. Run "npm run build" first.`);

describe.skipIf(!ready && !process.env.CI)("the built /launch/ cadence section", () => {
  const doc = new DOMParser().parseFromString(ready ? readFileSync(file, "utf8") : "", "text/html");
  const section = doc.querySelector("section[aria-labelledby='cadence']"); // the body runs even when skipped
  const q = (sel: string) => section?.querySelector(sel) ?? null;
  const world = busyYear();
  const view = cadenceView(BRIEF_STOP, world.count);

  it("sits under the page's speculative lead, with no note of its own (issue #153)", () => {
    expect(section!.hasAttribute("aria-describedby")).toBe(false);
    expect(section!.textContent).not.toMatch(/forecast|the brief/i);
    expect(doc.querySelector("main .launch-lead .hatch-tag")?.textContent).toBe("speculative");
  });

  it("renders the brief's interval and its result as static text, with the slider hidden until the script runs", () => {
    expect(q("[data-cadence-minutes]")?.textContent).toBe("60");
    expect(q("output")?.textContent).toBe("8,760 launches a year");
    expect(q("[data-cadence-slider]")?.hasAttribute("hidden")).toBe(true);
    const input = q("input[type='range']");
    expect(["value", "max", "aria-valuetext"].map((a) => input?.getAttribute(a))).toEqual([String(BRIEF_STOP), String(LAST), "60 minutes"]);
    expect(["rate", "world"].map((k) => q(`[data-cadence-bar='${k}']`)?.getAttribute("style"))).toEqual([`--share: ${view.share.rate}`, `--share: ${view.share.world}`]);
  });

  it("labels the slider and announces the result politely", () => {
    const input = q("input[type='range']")!;
    expect(doc.querySelector(`label[for='${input.id}']`)?.textContent).toBe("minutes between shots");
    expect(["aria-live", "for"].map((a) => q("output")?.getAttribute(a))).toEqual(["polite", input.id]);
  });

  it("shows P-08 and E-02 through Figure, with no status chip, and no other register figure", () => {
    const figures = [...section!.querySelectorAll(".figure")];
    expect(figures.map((f) => f.getAttribute("data-claim"))).toEqual(["P-08", "E-02"]);
    expect(section!.querySelectorAll(".figure-chip")).toHaveLength(0);
  });

  it("dates the world's count, links its source, and hands the same count to the script (issue #198)", () => {
    const e02 = q(".figure[data-claim='E-02']");
    expect(e02?.querySelector(".figure-value")?.textContent).toBe(`${formatCount(world.count)} in ${world.year}`);
    const href = e02?.querySelector(".figure-source")?.getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
    expect(getClaim("E-02").source).toContain(href!); // the link is the row's own source
    expect(q("[data-cadence]")?.getAttribute("data-cadence-world")).toBe(String(world.count));
  });

  it("keeps outside a figure only the arithmetic's own numbers, in the one place marked as arithmetic", () => {
    const walker = doc.createTreeWalker(section!, NodeFilter.SHOW_TEXT);
    const loose: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\d/.test(n.textContent!) && !n.parentElement!.closest(".figure")) loose.push(n.textContent!.trim());
    expect(loose).toEqual(["525,600", "60", "8,760", "5", "2,880"]);
    expect([...doc.querySelectorAll("[data-arithmetic]")]).toEqual([q("[data-cadence]")]);
  });

  it("works on the built markup: every hook the script needs is there", () => {
    document.body.innerHTML = section!.outerHTML;
    init(document);
    move(document.querySelector<HTMLInputElement>("#cadence-minutes")!, 0);
    expect(document.querySelector("output")!.textContent).toBe("105,120 launches a year");
    expect([share(document, "rate"), share(document, "world")]).toEqual(["100", String(MIN_SHARE)]);
  });
});
