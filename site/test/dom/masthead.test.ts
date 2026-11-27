// @vitest-environment jsdom
// Issue #94: the support line's exact words and order, the credits, and the aerie loop's pause button.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const SUPPORT = "Supported by Colorado Startups and Colorado Compute";
const HREFS = ["https://coloradostartups.org", "https://coloradoai.us"];
const LOOP_JS = readFileSync(path.join(SITE_DIR, "public/js/aerie-loop.js"), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function supportProblems(doc: Document): string[] {
  const line = doc.querySelector("[data-support]");
  if (!line) return ["no support line"];
  const out: string[] = [];
  if (text(line) !== SUPPORT) out.push(`support reads "${text(line)}"`);
  const links = [...line.querySelectorAll("a")].map((a) => [text(a), a.getAttribute("href")]);
  if (JSON.stringify(links) !== JSON.stringify([["Colorado Startups", HREFS[0]], ["Colorado Compute", HREFS[1]]])) out.push(`links ${JSON.stringify(links)}`);
  if (line.querySelector("img, svg")) out.push("a logo in the support line");
  return out;
}

describe("support line, from the component source", () => {
  it("has the exact words in order and two type-only links", () => {
    const src = readFileSync(path.join(SITE_DIR, "src/components/Support.astro"), "utf8").replace(/^---[\s\S]*?---/, "").replace(/<style[\s\S]*<\/style>/, "");
    expect(supportProblems(parse(src))).toEqual([]);
  });
  it("flags a swapped order (known bad)", () => {
    const bad = parse(`<p data-support>Supported by <a href="${HREFS[1]}">Colorado Compute</a> and <a href="${HREFS[0]}">Colorado Startups</a></p>`);
    expect(supportProblems(bad)).toHaveLength(2);
  });
});

describe("aerie loop script", () => {
  let paused: boolean;
  let reduce: boolean;
  const play = vi.fn();
  const fire = (video: HTMLVideoElement, type: string) => video.dispatchEvent(new Event(type));

  function mount() {
    document.body.innerHTML = `<figure data-loop><video muted loop></video><figcaption><button type="button">Play the loop</button></figcaption></figure>`;
    const video = document.querySelector("video")!;
    Object.defineProperty(video, "paused", { get: () => paused });
    video.play = () => { play(); paused = false; fire(video, "play"); return Promise.resolve(); };
    video.pause = () => { paused = true; fire(video, "pause"); };
    window.matchMedia = (() => ({ matches: reduce, addEventListener: () => {} })) as unknown as typeof window.matchMedia;
    new Function(LOOP_JS)();
    return { video, button: document.querySelector("button")! };
  }

  beforeEach(() => { paused = true; reduce = false; play.mockClear(); });

  it("waits for the first scroll, then plays; the button pauses it and scrolling does not restart it", () => {
    const { button } = mount();
    expect(play).not.toHaveBeenCalled();
    expect(button.hidden).toBe(false);
    window.dispatchEvent(new Event("scroll"));
    expect(play).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe("Pause the loop");
    button.click();
    expect(paused).toBe(true);
    expect(button.textContent).toBe("Play the loop");
    window.dispatchEvent(new Event("scroll"));
    expect(play).toHaveBeenCalledTimes(1);
    button.click();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("never plays under reduced motion and hides its button", () => {
    reduce = true;
    const { button } = mount();
    window.dispatchEvent(new Event("scroll"));
    button.click();
    expect(play).not.toHaveBeenCalled();
    expect(button.hidden).toBe(true);
  });
});

// CI's standard job builds before `npm test`. Locally a missing dist skips, with a reason.
const ready = distExists();
if (!ready && !process.env.CI) console.warn(`[masthead] built-page checks skipped: no build at ${DIST_DIR}.`);

describe.skipIf(!ready && !process.env.CI)("built pages", () => {
  const pages = ready ? builtPages() : [];
  it.each(pages.map((p) => [p.route, p.html] as const))("%s has the crest, support line and credits", (_route, html) => {
    const doc = parse(html);
    expect(doc.querySelector("header img[src='/art/crest-96.webp']")?.getAttribute("srcset")).toContain("/art/crest-192.webp 2x");
    expect(supportProblems(doc)).toEqual([]);
    expect(text(doc.querySelector("footer [data-credits]"))).toMatch(/AI-made.*Source photo by Huttarl, CC BY 2\.5/);
    expect(text(doc.querySelector("footer"))).toContain("No cookies. No tracking.");
  });
  it("home has the loop with a visible pause button and no autoplay", () => {
    const doc = parse(pages.find((p) => p.route === "/")!.html);
    const video = doc.querySelector("[data-loop] video")!;
    expect(video.hasAttribute("autoplay")).toBe(false);
    expect(video.getAttribute("preload")).toBe("none");
    const button = doc.querySelector("[data-loop] button[type='button']")!;
    expect(button.hasAttribute("hidden")).toBe(false);
    expect(text(button)).toBe("Play the loop");
    expect(doc.querySelector("script[src='/js/aerie-loop.js']")).not.toBeNull();
  });
});
