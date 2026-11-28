// @vitest-environment jsdom
// Issue #131: one copy script for the home teaser and /ai/, the /ai/ nav link, and the DataCatalog JSON-LD on /ai/ only.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const COPY_JS = readFileSync(path.join(SITE_DIR, "public/js/copy.js"), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const SNIP = `<main><pre><code id="c">claude mcp add x</code></pre><button type="button" data-copy="c" data-pending>Copy</button></main>`;

describe("copy script", () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();
  beforeEach(() => {
    document.body.innerHTML = SNIP;
    writeText.mockReset().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("reveals each button, copies its code once per press, and says so", async () => {
    new Function(COPY_JS)();
    new Function(COPY_JS)(); // A second copy of the tag binds nothing twice.
    const button = document.querySelector("button")!;
    expect(button.hasAttribute("data-pending")).toBe(false);
    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledExactlyOnceWith("claude mcp add x");
    expect(document.querySelectorAll("[role='status']")).toHaveLength(1);
    expect(document.querySelector("[role='status']")!.textContent).toBe("Copied");
  });

  it("selects the code when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    new Function(COPY_JS)();
    const button = document.querySelector("button")!;
    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe("Selected"));
    expect(getSelection()?.toString()).toBe("claude mcp add x");
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[ai] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("built pages", () => {
  const pages = ready ? builtPages().map((p) => ({ ...p, doc: parse(p.html) })) : [];
  const graph = (doc: Document) => [...doc.querySelectorAll("script[type='application/ld+json']")].flatMap((s) => JSON.parse(s.textContent!)["@graph"]);

  it.each(pages.map((p) => [p.route, p.doc] as const))("%s links /ai/ in the nav; only /ai/ has the DataCatalog", (route, doc) => {
    expect(doc.querySelector("header nav a[href='/ai/']")?.textContent).toBe("Use it with your AI");
    expect(graph(doc).some((n) => n["@type"] === "DataCatalog")).toBe(route === "/ai/");
  });

  it.each(["/", "/ai/"])("%s loads the one copy script, and every snippet has its button", (route) => {
    const doc = pages.find((p) => p.route === route)!.doc;
    expect([...doc.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"))).toContain("/js/copy.js");
    expect(doc.querySelectorAll("script[src='/js/copy.js']")).toHaveLength(1);
    const codes = [...doc.querySelectorAll("pre > code")];
    expect(codes.length).toBeGreaterThanOrEqual(3);
    for (const code of codes) {
      expect(doc.querySelectorAll(`button[data-copy="${code.id}"][data-pending]`), code.id).toHaveLength(1);
      if (code.textContent!.startsWith("{")) expect(() => JSON.parse(code.textContent!), code.id).not.toThrow();
    }
    expect(doc.querySelectorAll("button[data-copy]")).toHaveLength(codes.length);
  });

  it("home: the teaser has 20 words or fewer and links to rows that exist on /ai/", () => {
    const teaser = pages.find((p) => p.route === "/")!.doc.querySelector("section.ai-teaser")!;
    expect(teaser.textContent!.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(20);
    const ai = pages.find((p) => p.route === "/ai/")!.doc;
    const hrefs = [...teaser.querySelectorAll("a")].map((a) => a.getAttribute("href")!);
    expect(hrefs).toEqual(["/ai/#chat", "/ai/#claude", "/ai/#opencode"]);
    for (const href of hrefs) expect(ai.getElementById(href.split("#")[1]), href).not.toBeNull();
  });
});
