// Every page in the built dist/, found by walking it, so a new page is covered with no edit here.
// Each opens at 1280 and 375 px and runs axe with the WCAG 2.0 A and AA, 2.1 AA and 2.2 AA tags.
// At 375 px the page also must not scroll sideways.
// These feed the Quality page's tests.axe_routes and tests.e2e_routes.
// Shaped like coloradostartups.org's site/e2e/routes-axe.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";

const DIST = join(import.meta.dirname, "..", "dist");
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// @axe-core/playwright types `page` from its peer playwright-core, which npm resolved to a newer
// copy than @playwright/test's own. It uses only the types, so the cast is safe at runtime.
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

// dist/index.html is "/", dist/about/index.html is "/about/", dist/404.html is "/404.html".
function routes(): string[] {
  if (!existsSync(DIST)) throw new Error(`No build at ${DIST}. Run \`npm run build\` first.`);
  const found = readdirSync(DIST, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".html"))
    .map((file) => file.split(sep).join("/"))
    .map((file) => (file === "index.html" ? "/" : file.endsWith("/index.html") ? `/${file.slice(0, -"index.html".length)}` : `/${file}`))
    .sort();
  if (found.length === 0) throw new Error(`No pages in ${DIST}.`);
  return found;
}

const ROUTES = routes();

// The pages the site has today, named so a reader and the Quality page's route metrics can see them.
// The walk above still covers a page added later; this catches a walk that misses one.
const PAGES = ["/", "/404.html", "/about/", "/ai/", "/guide/", "/launch/", "/map/"];

test("the walk finds every page the site has", () => {
  expect(ROUTES).toEqual(expect.arrayContaining(PAGES));
});

// A path no page serves gets the 404 page, with a 404 status, and that page passes axe too.
test("an unknown path gets the not-found page, which passes axe", async ({ page }) => {
  const response = await page.goto("/no-such-page/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  const results = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

for (const width of [1280, 375]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const route of ROUTES) {
      test(`${route} passes axe${width === 375 ? " and fits the screen" : ""}`, async ({ page }) => {
        const response = await page.goto(route);
        expect(response?.status(), `${route} is a built page`).toBe(200);
        const results = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(TAGS).analyze();
        const violations = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
        expect(violations).toEqual([]);
        if (width === 375) {
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(overflow, `${route} scrolls sideways by ${overflow} px`).toBeLessThanOrEqual(0);
        }
      });
    }
  });
}
