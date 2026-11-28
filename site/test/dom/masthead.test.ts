// @vitest-environment jsdom
// Issue #94: the support line's exact words and order, the credits, the home word budgets (warnings) and the aerie loop's pause button.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DIST_DIR, SITE_DIR, builtPages, distExists } from "./pages";

const SUPPORT = "Supported by Colorado Startups and Colorado Compute";
const HREFS = ["https://coloradostartups.org", "https://coloradoai.us"];
const LOOP_JS = readFileSync(path.join(SITE_DIR, "public/js/aerie-loop.js"), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function supportProblems(scope: ParentNode | null): string[] {
  const line = scope?.querySelector("[data-support]");
  if (!line) return ["no support line"];
  const out: string[] = [];
  if (text(line) !== SUPPORT) out.push(`support reads "${text(line)}"`);
  const links = [...line.querySelectorAll("a")].map((a) => [text(a), a.getAttribute("href")]);
  if (JSON.stringify(links) !== JSON.stringify([["Colorado Startups", HREFS[0]], ["Colorado Compute", HREFS[1]]])) out.push(`links ${JSON.stringify(links)}`);
  if (line.querySelector("img, svg")) out.push("a logo in the support line");
  return out;
}

// Visible words per text node, as gates.ts wordsBeforeAction counts them: hidden, aria-hidden and script text skipped.
const SKIP = "script, style, template, noscript, [hidden], [aria-hidden='true']";
const visibleWords = (node: Node, skip = SKIP): number => node.nodeType === 3 ? (node.textContent ?? "").split(/\s+/).filter(Boolean).length
  : node.nodeType === 1 && !(node as Element).matches(skip) ? [...node.childNodes].reduce((sum, child) => sum + visibleWords(child, skip), 0) : 0;

describe("support line check", () => {
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
    document.body.innerHTML = `<figure data-loop><video muted loop></video><figcaption><button type="button" hidden>Play the loop</button></figcaption></figure>`;
    const video = document.querySelector("video")!;
    Object.defineProperty(video, "paused", { get: () => paused });
    video.play = () => { play(); paused = false; fire(video, "play"); return Promise.resolve(); };
    video.pause = () => { paused = true; fire(video, "pause"); };
    window.matchMedia = (() => ({ matches: reduce, addEventListener: () => {} })) as unknown as typeof window.matchMedia;
    new Function(LOOP_JS)();
    return { video, button: document.querySelector("button")! };
  }
  beforeEach(() => { paused = true; reduce = false; play.mockClear(); });
  it("shows its button, waits for the first scroll, then plays; the button pauses and resumes it", () => {
    const { button } = mount();
    expect(play).not.toHaveBeenCalled();
    expect(button.hidden).toBe(false);
    window.dispatchEvent(new Event("scroll"));
    expect(play).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe("Pause the loop");
    button.click();
    expect(paused).toBe(true);
    expect(button.textContent).toBe("Play the loop");
    button.click();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("never plays under reduced motion and keeps its button hidden", () => {
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
  it.each(pages.map((p) => [p.route, p.html] as const))("%s has the crest and support line in the header, and the credits", (_route, html) => {
    const doc = parse(html);
    expect(doc.querySelector("header img[src='/art/crest-96.webp']")?.getAttribute("srcset")).toContain("/art/crest-192.webp 2x");
    expect(supportProblems(doc.querySelector("header"))).toEqual([]);
    expect(text(doc.querySelector("footer [data-credits]"))).toMatch(/AI-made.*Source photo by Huttarl, CC BY 2\.5/);
    expect(text(doc.querySelector("footer"))).toContain("No cookies. No tracking.");
  });
  it("home: one <h1>, the plan's word budgets as warnings, the support line in get listed, the loop hidden until motion is allowed", () => {
    const doc = parse(pages.find((p) => p.route === "/")!.html);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    // Issue #153: the painting's credit is the footer's alone, not repeated under the hero.
    expect(text(doc.querySelector("main"))).not.toMatch(/Huttarl|CC BY/);
    // Plan budgets, guidelines that warn (issue #154): aerie 15 words beside the brand's lore line (its caption quote), get listed 20.
    const budgets = [
      ["section.aerie", visibleWords(doc.querySelector("section.aerie")!, `${SKIP}, figcaption > span`), 15],
      ["section.join", visibleWords(doc.querySelector("section.join")!), 20],
    ] as const;
    for (const [name, n, budget] of budgets) if (n > budget) console.warn(`[masthead] guideline: ${name} has ${n} words, about ${budget} suggested`);
    expect(supportProblems(doc.querySelector("section.join"))).toEqual([]);
    expect(doc.querySelector("[data-loop] video:not([autoplay])[preload='none']"), "no autoplay, preload none").not.toBeNull();
    expect(doc.querySelector("[data-loop] button[type='button']")?.hasAttribute("hidden")).toBe(true);
    expect(doc.querySelector("script[src='/js/aerie-loop.js']")).not.toBeNull();
  });
});
