// @vitest-environment jsdom
// Home sections 3 and 4 and their photos (step 32, issue #123): counts equal the data, links resolve,
// pipeline orgs stand on their own sourced words, photos carry credit and source, word budgets hold.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { KINDS } from "../../src/lib/orgs/kinds";
import { readKind } from "../../src/scripts/guide-filter.client";
import { brokenRefs } from "./gates";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const PHOTOS_DIR = path.join(SITE_DIR, "src", "assets", "photos");
const ORGS_DIR = path.join(SITE_DIR, "..", "data", "orgs");
const BUDGET = { kinds: 15, pipeline: 30 }; // about 15 and about 30 words, issue #123
const STEPS = ["learn", "build", "launch", "fly", "defend"];
const dom = (html: string) => new DOMParser().parseFromString(html, "text/html");

type Photo = { file: string; sha256: string; id: string; caption: string; alt: string; source_url: string; credit: string; no_endorsement: string; terms_url: string };
const photoFiles = existsSync(PHOTOS_DIR) ? readdirSync(PHOTOS_DIR).filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f)) : [];
const record = (file: string): Photo => JSON.parse(readFileSync(path.join(PHOTOS_DIR, file.replace(/\.[^.]+$/, ".json")), "utf8"));

/** Visible words, leaving out data (org names), photo credits, numerals and hidden marks. */
function words(el: Element): number {
  let n = 0;
  const walk = (node: Node) => {
    if (node.nodeType === 3) n += (node.textContent ?? "").split(/\s+/).filter((w) => w && !/^[\d.,:]+$/.test(w)).length;
    if (node.nodeType !== 1) return;
    const e = node as Element;
    if (e.matches("[data-names], [data-credit], [aria-hidden='true'], style, script")) return;
    e.childNodes.forEach(walk);
  };
  walk(el);
  return n;
}

describe("photo records", () => {
  it("holds up to 3 photos, each with a record", () => {
    expect(photoFiles.length).toBeLessThanOrEqual(3);
    for (const f of photoFiles) expect(existsSync(path.join(PHOTOS_DIR, f.replace(/\.[^.]+$/, ".json"))), `${f} record`).toBe(true);
  });

  it.each(photoFiles)("%s: sha256 matches, the source is NASA or the USGS, credit and no-endorsement lines are set", (f) => {
    const r = record(f);
    expect(r.file).toBe(f);
    expect(createHash("sha256").update(readFileSync(path.join(PHOTOS_DIR, f))).digest("hex")).toBe(r.sha256);
    for (const url of [r.source_url, r.terms_url]) expect(new URL(url).hostname, url).toMatch(/(^|\.)(nasa|usgs)\.gov$/);
    expect(r.credit.trim()).not.toBe("");
    expect(r.no_endorsement).toMatch(/endorse/i);
    expect(r.alt.trim()).not.toBe("");
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
const inCI = Boolean(process.env.CI);
if (!ready && !inCI) console.warn(`[home] skipped: no build at ${DIST_DIR}. Run "npm run build" first.`);

describe.skipIf(!ready && !inCI)("the built home page, sections 3 and 4", () => {
  const pages = ready ? builtPages() : [];
  const html = (route: string) => pages.find((p) => p.route === route)?.html ?? "";
  const home = dom(html("/"));
  const guide = dom(html("/guide/"));
  const kinds = home.querySelector("section.kinds")!;
  const pipeline = home.querySelector("section.pipeline")!;
  const orgs = readdirSync(ORGS_DIR).filter((f) => /\.ya?ml$/.test(f)).map((f) => parseYaml(readFileSync(path.join(ORGS_DIR, f), "utf8")));
  const open = orgs.filter((o) => o.status !== "closed");
  const exists = (rel: string) => existsSync(path.join(DIST_DIR, rel)) && statSync(path.join(DIST_DIR, rel)).isFile();

  it("renders both sections, in order, after the hero", () => {
    expect(kinds, "section.kinds").not.toBeNull();
    expect(pipeline, "section.pipeline").not.toBeNull();
    const order = [...home.querySelectorAll("main > section")].map((s) => s.className.split(" ")[0]);
    // Relative order only: other steps add their own home sections between and after these.
    expect(order[0]).toBe("hero");
    expect(order.indexOf("kinds")).toBeGreaterThan(0);
    expect(order.indexOf("pipeline")).toBe(order.indexOf("kinds") + 1);
  });

  it("counts per kind equal the data and the guide's chips, and each tile opens the guide on its kind", () => {
    for (const kind of KINDS) {
      const tile = kinds.querySelector<HTMLAnchorElement>(`a[data-kind-tile="${kind}"]`);
      const want = String(open.filter((o) => o.kind === kind).length);
      expect(tile?.dataset.count, kind).toBe(want);
      expect(tile!.querySelector(".kinds-n")!.textContent!.trim(), `${kind} shown`).toBe(want);
      expect(guide.querySelector(`[data-kind-chip="${kind}"]`)?.getAttribute("data-count"), `${kind} guide chip`).toBe(want);
      const href = new URL(tile!.getAttribute("href")!, "https://spacepeak.co/");
      expect(href.pathname).toBe("/guide/");
      expect(readKind(href.search, KINDS), `${kind} filter`).toBe(kind);
    }
  });

  it("every link and image in both sections resolves, and every #org- target is a guide row", () => {
    for (const section of [kinds, pipeline]) expect(brokenRefs(section.outerHTML, "/", exists)).toEqual([]);
    for (const a of pipeline.querySelectorAll<HTMLAnchorElement>("a[data-org]")) {
      expect(a.getAttribute("href")).toBe(`/guide/#org-${a.dataset.org}`);
      expect(guide.getElementById(`org-${a.dataset.org}`), a.dataset.org).not.toBeNull();
    }
  });

  it("lists the five steps; each org stands on its own words in the data, and an empty step says so", () => {
    const steps = [...pipeline.querySelectorAll<HTMLLIElement>("ol > li[data-step]")];
    expect(steps.map((s) => s.dataset.step)).toEqual(STEPS);
    for (const step of steps) {
      const links = [...step.querySelectorAll<HTMLAnchorElement>("a[data-org]")];
      if (links.length === 0) expect(step.querySelector("[data-step-none]"), `${step.dataset.step} says it has none`).not.toBeNull();
      for (const a of links) {
        const org = open.find((o) => o.id === a.dataset.org);
        expect(org, `${a.dataset.org} is an open org in data/orgs`).toBeDefined();
        expect([org.name, org.summary, org.fact.text].join(" ").toLowerCase(), a.dataset.org).toContain(a.dataset.says!.toLowerCase());
        expect(a.textContent!.trim()).toBe(org.name);
      }
    }
  });

  it("each photo shows its credit, source link and no-endorsement line, and loads lazily", () => {
    const figures = [...home.querySelectorAll("figure[data-photo]")];
    expect(figures.length).toBe(photoFiles.length);
    for (const f of photoFiles) {
      const r = record(f);
      const fig = home.querySelector(`figure[data-photo="${r.id}"]`);
      expect(fig, r.id).not.toBeNull();
      const img = fig!.querySelector("img")!;
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("alt")).toBe(r.alt);
      const caption = fig!.querySelector("figcaption")!.textContent!.replace(/\s+/g, " ");
      for (const line of [r.caption, r.credit, r.no_endorsement]) expect(caption, r.id).toContain(line);
      expect(fig!.querySelector(`figcaption a[href="${r.source_url}"]`), `${r.id} source link`).not.toBeNull();
    }
  });

  it("loads every image in both sections lazily, so the hero painting stays the LCP", () => {
    const imgs = [kinds, pipeline].flatMap((section) => [...section.querySelectorAll("img")]);
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) expect(img.getAttribute("loading"), img.getAttribute("src") ?? "<img>").toBe("lazy");
    expect(home.querySelector(".hero-art img")?.getAttribute("fetchpriority")).toBe("high");
  });

  it("holds the word budgets", () => {
    expect(words(kinds), "Who is here").toBeLessThanOrEqual(BUDGET.kinds);
    expect(words(pipeline), "Build, fly, defend").toBeLessThanOrEqual(BUDGET.pipeline);
  });
});
