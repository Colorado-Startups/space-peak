// /ai/ aims to fit one 1280 by 800 screen with its Copy buttons shown (issue #131). test/dom/ai.test.ts covers copying.
// 800 px is a 13-inch laptop at 1280 px wide; the header alone takes 163 px of it.
// The screen is a guideline: past it the spec warns and passes (issue #154).
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("/ai/ shows its Copy buttons, and warns when it runs past one screen at 1280 px", async ({ page }) => {
  await page.goto("/ai/");
  await expect(page.locator("button[data-copy]:not([data-pending])")).toHaveCount(8);
  const bottom = await page.evaluate(() => document.querySelector("main")!.getBoundingClientRect().bottom);
  if (bottom > 800) console.warn(`[ai] guideline: /ai/ main ends at ${Math.round(bottom)} px, one 800 px screen suggested`);
});
