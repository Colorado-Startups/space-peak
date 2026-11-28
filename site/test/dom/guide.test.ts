// @vitest-environment jsdom
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { KINDS } from "../../src/lib/orgs/kinds";
import { init, readKind, rowMatches } from "../../src/scripts/guide-filter.client";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const ORGS_DIR = path.join(SITE_DIR, "..", "data", "orgs");
const dom = (html: string) => new DOMParser().parseFromString(html, "text/html");

/** Every field in `doc` has a label: a <label for>, a wrapping <label>, or aria-label(ledby). */
function unlabeled(doc: Document): string[] {
  return [...doc.querySelectorAll("input:not([type='hidden']), select, textarea")]
    .filter((el) => !(el.id && doc.querySelector(`label[for="${el.id}"]`)) && !el.closest("label") &&
      !el.getAttribute("aria-label")?.trim() && !el.getAttribute("aria-labelledby"))
    .map((el) => el.outerHTML.slice(0, 60));
}

describe("guide filter on a fixture", () => {
  const fixture = `<section data-guide>
    <a href="/guide/" data-kind-chip="">All</a><a href="/guide/?kind=company" data-kind-chip="company">Companies</a>
    <a href="/guide/?kind=institution" data-kind-chip="institution">Institutions</a>
    <form data-guide-search hidden><label for="q">Search</label><input id="q"></form>
    <p data-guide-status></p><p data-guide-none hidden></p>
    <table><tbody><tr data-kind="company" data-text="acme fountain"></tr><tr data-kind="institution" data-text="uccs colorado springs"></tr></tbody></table>
  </section>`;

  it("reads ?kind=, ignoring an unknown kind", () => {
    expect(readKind("?kind=company", KINDS)).toBe("company");
    expect(readKind("?kind=moon", KINDS)).toBe("");
    expect(readKind("", KINDS)).toBe("");
  });

  it("matches kind and query together", () => {
    const row = { kind: "company", text: "acme fountain" };
    expect(rowMatches(row, "", "")).toBe(true);
    expect(rowMatches(row, "company", " Fount ")).toBe(true);
    expect(rowMatches(row, "institution", "")).toBe(false);
    expect(rowMatches(row, "", "pueblo")).toBe(false);
  });

  it("preselects ?kind=, shows the search field, and filters on a chip click and on typing", () => {
    document.body.innerHTML = fixture;
    window.history.replaceState(null, "", "/guide/?kind=company");
    init(document);
    const rows = [...document.querySelectorAll("tr")];
    const status = document.querySelector("[data-guide-status]")!;
    expect(document.querySelector("form")!.hidden).toBe(false);
    expect(rows.map((r) => r.hidden)).toEqual([false, true]);
    expect(status.textContent).toBe("Showing 1 of 2");
    expect(document.querySelector("[data-kind-chip='company']")!.getAttribute("aria-current")).toBe("true");

    (document.querySelector("[data-kind-chip='']") as HTMLAnchorElement).click();
    expect(window.location.search).toBe("");
    expect(rows.map((r) => r.hidden)).toEqual([false, false]);

    const input = document.querySelector("input")!;
    input.value = "nothing here";
    input.dispatchEvent(new Event("input"));
    expect(document.querySelector<HTMLElement>("[data-guide-none]")!.hidden).toBe(false);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
const inCI = Boolean(process.env.CI);
if (!ready && !inCI) console.warn(`[guide] skipped: no build at ${DIST_DIR}. Run "npm run build" first.`);

describe.skipIf(!ready && !inCI)("the built /guide/ page", () => {
  const pages = ready ? builtPages() : [];
  const html = (route: string) => pages.find((p) => p.route === route)?.html ?? "";
  const guide = dom(html("/guide/"));
  const files = existsSync(ORGS_DIR) ? readdirSync(ORGS_DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
  const orgs = files
    .map((f) => parseYaml(readFileSync(path.join(ORGS_DIR, f), "utf8")))
    .filter((o) => o.status !== "closed");

  it("is built", () => expect(html("/guide/")).not.toBe(""));

  it("counts per kind equal the data", () => {
    if (orgs.length === 0) {
      expect(guide.querySelector("[data-guide-empty]"), "empty state while orgs are added").not.toBeNull();
      return;
    }
    for (const kind of KINDS) {
      const chip = guide.querySelector(`[data-kind-chip="${kind}"]`);
      expect(chip?.getAttribute("data-count"), kind).toBe(String(orgs.filter((o) => o.kind === kind).length));
    }
    expect(guide.querySelectorAll("[aria-labelledby='guide-orgs'] tbody tr[data-kind]").length).toBe(orgs.length);
  });

  it("labels every field", () => expect(unlabeled(guide)).toEqual([]));

  it("reaches every organisation from / in 2 clicks: Guide in the nav, then its source link", () => {
    expect(dom(html("/")).querySelector("header nav a[href='/guide/']"), "Guide in the home nav").not.toBeNull();
    for (const org of orgs) {
      const row = guide.getElementById(`org-${org.id}`);
      expect(row, org.id).not.toBeNull();
      expect(row!.hasAttribute("hidden"), `${org.id} shows with no script`).toBe(false);
      const url = org.sources.find((s: { id: string }) => s.id === org.fact.source).url;
      expect(row!.querySelector(`a[href="${url}"]`), `${org.id} source link`).not.toBeNull();
    }
  });
});
