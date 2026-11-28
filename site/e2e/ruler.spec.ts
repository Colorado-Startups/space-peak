// Home section 5's altitude ruler (issue #140) in a real browser: still under reduced motion; otherwise it waits off
// screen and rises once it scrolls into view. The 1.5 s limit is our own guideline, so it warns and never fails
// (Paul, 2026-11-28).
import { expect, test } from "@playwright/test";

const LIMIT_MS = 1500;
const endTimes = () =>
  [...document.querySelectorAll(".ruler-rise, .ruler-labels")].flatMap((el) => el.getAnimations()).map((a) => Number(a.effect?.getComputedTiming().endTime));

test("the ruler stays still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const ruler = page.locator("figure.ruler");
  await ruler.scrollIntoViewIfNeeded();
  await expect(ruler).toHaveAttribute("data-rise", "");
  expect(await page.evaluate(endTimes)).toEqual([]);
});

test("the ruler rises once it is in view", async ({ page }) => {
  await page.goto("/");
  const ruler = page.locator("figure.ruler");
  await expect(ruler).toHaveAttribute("data-rise", "wait");
  await ruler.scrollIntoViewIfNeeded();
  await expect(ruler).toHaveAttribute("data-rise", "go");
  const ends = await page.evaluate(endTimes);
  expect(ends.length).toBeGreaterThan(0);
  const longest = Math.max(...ends);
  if (longest > LIMIT_MS) console.warn(`[ruler] the motion ends at ${longest} ms; the guideline is ${LIMIT_MS} ms.`);
});
