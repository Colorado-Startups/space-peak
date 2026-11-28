// Issue #153: a figure shows its value and, when its register row has a source, one small "source" link.
// No status chip, title, claim ID or read date is in view. A page that shows an unconfirmed figure says so once.
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { UNPROVEN, UNPROVEN_NOTE, figureView, sourceUrl } from "../../src/components/figure";
import { getClaim, type ClaimRow, type ClaimStatus } from "../../src/lib/claims/parse";
import { buildMapData } from "../../src/lib/map/data";
import { DIST_DIR, builtPages, distExists } from "../dom/pages";

const row = (status: ClaimStatus, source = ""): ClaimRow => ({
  id: "X-01", series: "X", section: "Fixture", site: "Test Peak", claim: "Elevation 1 ft", status, source, notes: "",
});

/** Problems with the figures on one page; empty is a pass. */
function figureProblems(html: string): string[] {
  const doc = new JSDOM(html).window.document;
  const figures = [...doc.querySelectorAll(".figure")];
  const out: string[] = [];
  for (const f of figures) {
    const id = f.getAttribute("data-claim") ?? "";
    const text = f.textContent ?? "";
    const want = sourceUrl(getClaim(id));
    const links = [...f.querySelectorAll("a")];
    if (f.querySelector(".figure-chip, [title]") || f.hasAttribute("title")) out.push(`${id} shows a chip or a title`);
    if (text.includes(id) || /\bread \d{4}/.test(text)) out.push(`${id} shows its claim ID or a read date`);
    const linked = links.length === 1 && links[0].getAttribute("href") === want && links[0].textContent === "source";
    if (want ? !linked : links.length > 0) out.push(want ? `${id} does not link "source" to ${want}` : `${id} links a source its row has not`);
  }
  const notes = [...doc.querySelectorAll("[data-unproven-note]")];
  const want = figures.some((f) => UNPROVEN.includes(getClaim(f.getAttribute("data-claim") ?? "").status)) ? 1 : 0;
  if (notes.length !== want) out.push(`${notes.length} unproven notes, want ${want}`);
  for (const n of notes) if (n.textContent !== UNPROVEN_NOTE) out.push(`the note says "${n.textContent}"`);
  return out;
}

describe("figureView", () => {
  it("throws on an unknown claim ID, so the build fails", () => {
    expect(() => figureView("Z-999")).toThrow(/no row Z-999/);
  });

  it("reads S-04 from the register, and lets a page reword the value", () => {
    expect(figureView("S-04")).toEqual({ id: "S-04", value: "Elevation 14,047 ft", href: undefined });
    expect(figureView("S-04", "14,047 ft").value).toBe("14,047 ft");
  });
});

describe("sourceUrl", () => {
  it("takes the first URL in the Source cell, and nothing from an empty cell or a file path", () => {
    expect(sourceUrl(row("verified", "NASA, Earth Atmosphere Model, https://www.grc.nasa.gov/a.html, read 2026-11-16"))).toBe("https://www.grc.nasa.gov/a.html");
    expect(sourceUrl(row("unverified"))).toBeUndefined();
    expect(sourceUrl(row("open", "`data/estimates/q-01.yaml`"))).toBeUndefined();
  });

  it("follows the row a source cites, as I-05 cites P-03", () => {
    expect(getClaim("I-05").source).toMatch(/^Per P-03:/);
    expect(sourceUrl(getClaim("I-05"))).toBe(sourceUrl(getClaim("P-03")));
    expect(sourceUrl(getClaim("P-03"))).toMatch(/^https:\/\/openstax\.org\//);
  });

  it("gives a G row its summit's GNIS query and an R row the loop file, the links the map uses", () => {
    const { loop, summits } = buildMapData([]);
    for (const s of summits) expect(sourceUrl(getClaim(s.register)), s.register).toBe(s.source_url);
    for (const id of ["R-03", "R-04", "R-05"]) expect(sourceUrl(getClaim(id)), id).toBe(loop.source_url);
  });

  it("counts unverified and unverifiable as not yet confirmed", () => expect([...UNPROVEN]).toEqual(["unverified", "unverifiable"]));
});

describe("the figure check", () => {
  const fig = (id: string, link = "") => `<span class="figure" data-claim="${id}"><span class="figure-value">v</span>${link}</span>`;
  const source = (id: string) => `<a class="figure-source" href="${sourceUrl(getClaim(id))}">source</a>`;
  const note = `<p data-unproven-note>${UNPROVEN_NOTE}</p>`;
  const page = (...parts: string[]) => `<!doctype html><main>${parts.join("")}</main>`;
  const GOOD = page(note, fig("S-04"), fig("P-01", source("P-01")));

  it("passes a page with its note, an unconfirmed figure and a sourced one", () => expect(figureProblems(GOOD)).toEqual([]));
  it("passes a page of confirmed figures with no note", () => expect(figureProblems(page(fig("P-01", source("P-01"))))).toEqual([]));
  it.each([
    ["a status chip", GOOD.replace(">v<", `>v</span><span class="figure-chip">unverified<`), /S-04 shows a chip/],
    ["a claim ID title", GOOD.replace('data-claim="S-04"', 'data-claim="S-04" title="Claim S-04"'), /S-04 shows a chip or a title/],
    ["a read date", GOOD.replace(">v<", ">v, read 2026-11-16<"), /S-04 shows its claim ID or a read date/],
    ["a sourced figure with no link", page(note, fig("S-04"), fig("P-01")), /P-01 does not link "source"/],
    ["a source link the row has not", page(note, fig("S-04", source("P-01"))), /S-04 links a source its row has not/],
    ["no note beside an unconfirmed figure", page(fig("S-04")), /0 unproven notes, want 1/],
    ["the note twice", page(note, note, fig("S-04")), /2 unproven notes, want 1/],
    ["a note with no unconfirmed figure", page(note, fig("P-01", source("P-01"))), /1 unproven notes, want 0/],
  ])("flags %s (known bad)", (_name, html, problem) => {
    expect(figureProblems(html).join("\n")).toMatch(problem);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[figure] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("figures on every built page", () => {
  const pages = ready ? builtPages() : [];
  it("finds figures to check", () => expect(pages.some((p) => p.html.includes('class="figure"'))).toBe(true));
  it.each(pages.map((p) => [p.route, p.html] as const))("%s shows each figure plainly, and says once if any is unconfirmed", (_route, html) => {
    expect(figureProblems(html)).toEqual([]);
  });
});
