// /ai/ fits one 1280 by 800 screen with its Copy buttons shown, and a Copy press fills the clipboard (issue #131).
// 800 px is a 13-inch laptop at 1280 px wide; the header alone takes 163 px of it.
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("/ai/ fits one screen at 1280 px", async ({ page }) => {
  await page.goto("/ai/");
  await expect(page.locator("button[data-copy]:not([data-pending])")).toHaveCount(8);
  const bottom = await page.evaluate(() => document.querySelector("main")!.getBoundingClientRect().bottom);
  expect(bottom, "main's bottom edge, px").toBeLessThanOrEqual(800);
});

test("Copy puts the snippet on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ai/");
  const button = page.locator("button[data-copy='ai-claude-code']");
  await button.click();
  await expect(button).toHaveText("Copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(await page.locator("#ai-claude-code").textContent());
});
