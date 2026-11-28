// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIELDS, OUT, serialize, subset } from "../../../scripts/resources/pull.mjs";
import { BUCKETS, amount, host, noteText, type Resource } from "../../src/lib/resources";
import { init } from "../../src/scripts/guide-filter.client";
import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

// Paths from the repo root. jsdom replaces URL, so build them with node:path, not new URL().
const path = (p: string) => join(SITE_DIR, "..", p);
const read = (p: string) => readFileSync(path(p), "utf8");
const lock = JSON.parse(read("data/resources.lock.json"));
const data: { checked: string; rows: Resource[] } = JSON.parse(read(OUT));

describe("the locked catalog", () => {
  it("pins startup-credits catalog/programs.json by commit and sha256", () => {
    expect(lock).toMatchObject({ repo: "Colorado-Startups/startup-credits", path: "catalog/programs.json", license: "CC0-1.0" });
    expect(lock.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(lock.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("the lock's sha256 matches the stored data, which is in the pull's own layout", () => {
    expect(Object.keys(lock.outputs)).toEqual([OUT]);
    expect(createHash("sha256").update(readFileSync(path(OUT))).digest("hex")).toBe(lock.outputs[OUT]);
    expect(serialize(data)).toBe(read(OUT));
  });

  it("every program has a name, a provider, a bucket and an https link, and no id repeats or is also left out", () => {
    expect(data.rows.length).toBeGreaterThan(0);
    for (const r of data.rows) {
      expect(Object.keys(r), r.id).toEqual(FIELDS);
      expect(r.program.trim(), r.id).not.toBe("");
      expect(r.provider.trim(), r.id).not.toBe("");
      expect(BUCKETS, r.id).toContain(r.bucket);
      expect(new URL(r.link).protocol, r.id).toBe("https:");
    }
    const ids = data.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of lock.left_out) expect(ids, l.id).not.toContain(l.id);
  });

  it("the pull keeps only https rows and the shown fields", () => {
    const row = { ...data.rows[0], source: "https://example.com", requirements: ["x"] };
    expect(Object.keys(subset({ checked: "2026-11-12", rows: [row] }).rows[0])).toEqual(FIELDS);
    expect(() => subset({ checked: "2026-11-12", rows: [{ ...row, link: "http://example.com" }] })).toThrow(/https/);
  });
});

describe("labels", () => {
  const r = (credit_first: number | null, credit_max: number | null, computed = false) =>
    ({ credit_first, credit_max, credit_first_computed: computed, credit_max_computed: computed });
  it("states only the catalog's figure", () => {
    expect(amount(r(10000, 10000))).toBe("$10,000");
    expect(amount(r(1000, 5000))).toBe("Up to $5,000");
    expect(amount(r(null, 15000))).toBe("Up to $15,000");
    expect(amount(r(200000, null))).toBe("From $200,000");
    expect(amount(r(null, null))).toBe("No US dollar figure");
    expect(amount(r(960, 14400, true))).toBe("Up to $14,400, computed by the catalog");
    expect(host("https://www.runpod.io/startup-program")).toBe("runpod.io");
  });

  it("leaves a read date off a note, and keeps the rest of its words", () => {
    expect(noteText("At the Pro+ list price (kiro.dev/pricing, read 2026-11-02), that is $960")).toBe("At the Pro+ list price (kiro.dev/pricing), that is $960");
    expect(noteText("Per the provider, read 2026-11-12.")).toBe("Per the provider.");
    expect(noteText("Per the provider, read 2026-11-12")).toBe("Per the provider");
    expect(noteText("Read the terms first.")).toBe("Read the terms first.");
    for (const r of data.rows) expect(noteText(r.amount_note), r.id).not.toMatch(/\bread \d{4}-\d{2}-\d{2}/);
  });
});

describe("the build reads only the locked file", () => {
  const section = read("site/src/sections/guide/20-resources.astro");
  it("imports data/resources.json and its lock, and fetches nothing", () => {
    const imports = [...section.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
    expect(imports).toEqual(["../../../../data/resources.json", "../../../../data/resources.lock.json", "../../lib/resources"]);
    expect(section).not.toMatch(/\bfetch\(|import\(|raw\.githubusercontent/);
    expect(read("site/src/lib/resources.ts")).not.toMatch(/\bfetch\(|import /);
  });
});

describe("two filtered sections on one page", () => {
  it("each section keeps its own rows and its own query parameter", () => {
    document.body.innerHTML = `
      <section data-guide><a data-kind-chip="">All</a><a data-kind-chip="company">Co</a>
        <table><tr data-kind="company" data-text="acme"></tr><tr data-kind="institution" data-text="uccs"></tr></table></section>
      <section data-guide="need"><a data-kind-chip="">All</a><a data-kind-chip="incorporated">Inc</a>
        <form data-guide-search><input id="q2"></form><p data-guide-status></p>
        <table><tr data-kind="incorporated" data-text="aws gpu"></tr><tr data-kind="funded_or_partner" data-text="modal gpu"></tr></table></section>`;
    window.history.replaceState(null, "", "/guide/?need=incorporated");
    init(document);
    const hidden = () => [...document.querySelectorAll("tr")].map((t) => t.hidden);
    expect(hidden()).toEqual([false, false, false, true]);
    (document.querySelector("[data-guide='need'] [data-kind-chip='']") as HTMLAnchorElement).click();
    (document.querySelector("[data-kind-chip='company']") as HTMLAnchorElement).click();
    expect(window.location.search).toBe("?kind=company");
    expect(hidden()).toEqual([false, true, false, false]);
    const input = document.querySelector("input")!;
    input.value = "modal";
    input.dispatchEvent(new Event("input"));
    expect(hidden()).toEqual([false, true, true, false]);
    expect(document.querySelector("[data-guide-status]")!.textContent).toBe("Showing 1 of 2");
  });
});

// CI builds before it tests. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[resources] skipped: no build at ${DIST_DIR}. Run "npm run build" first.`);

describe.skipIf(!ready && !process.env.CI)("the built /guide/ credits table", () => {
  const html = ready ? (builtPages().find((p) => p.route === "/guide/")?.html ?? "") : "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  it("renders every locked program with its link, shown with no script", () => {
    const rows = doc.querySelectorAll("[aria-labelledby='guide-resources'] tbody tr");
    expect(rows.length).toBe(data.rows.length);
    for (const r of data.rows) {
      const row = doc.getElementById(`credit-${r.id}`);
      expect(row, r.id).not.toBeNull();
      expect(row!.hasAttribute("hidden"), r.id).toBe(false);
      expect(row!.querySelector("th")!.textContent).toBe(r.program);
      expect(row!.querySelector(`a[href="${r.link}"]`), r.id).not.toBeNull();
    }
  });

  it("names the catalog, at the pinned commit, as the source", () => {
    const url = `https://github.com/${lock.repo}/blob/${lock.commit}/${lock.path}`;
    expect(doc.querySelector(`[aria-labelledby='guide-resources'] a[href="${url}"]`)).not.toBeNull();
  });

  it("shows no read date, even behind a press (issue #153)", () => {
    expect(doc.querySelector("[aria-labelledby='guide-resources']")?.textContent).not.toMatch(/\bread \d{4}-\d{2}-\d{2}/);
  });
});
