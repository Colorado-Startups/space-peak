// The site's main tasks from / by keyboard alone. A step is one Enter on a link; the Tabs that reach it are not steps.
// Each finishes in MAX_STEPS or fewer (usability.task_clicks); all passing is usability.keyboard_task_share at 100%.
// A task whose page is not built yet is skipped and named in the log, never passed.
import { expect, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DIST = join(import.meta.dirname, "..", "dist");
const MAX_STEPS = 2;
const MAX_TABS = 150; // Tab presses per page before the walk stops.
export const TASKS: readonly { name: string; path: string }[] = [
  { name: "Reach the map", path: "/map/" },
  { name: "Reach the guide", path: "/guide/" },
  { name: "Reach the launch page", path: "/launch/" },
  { name: "Reach the AI guide", path: "/ai/" },
];
type Stop = { tabs: number; path: string };
// Tabs through a fresh load of `path`, listing each same-origin link reached, until focus leaves the page or wraps.
async function walk(page: Page, path: string): Promise<Stop[]> {
  await page.goto(path);
  const stops: Stop[] = [];
  for (let tabs = 1; tabs <= MAX_TABS; tabs++) {
    await page.keyboard.press("Tab");
    const now = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.hasAttribute("data-sp-walked")) return null;
      el.setAttribute("data-sp-walked", "");
      const href = el instanceof HTMLAnchorElement ? new URL(el.href, location.href) : null;
      const away = href && href.origin === location.origin && !(href.pathname === location.pathname && href.hash);
      return away ? (href?.pathname ?? "") : "";
    });
    if (now === null) break;
    if (now) stops.push({ tabs, path: now });
  }
  return stops;
}

// On a page just loaded, so focus starts at the top: Tab to the link `stop` names and press Enter on it.
async function follow(page: Page, stop: Stop): Promise<void> {
  for (let i = 0; i < stop.tabs; i++) await page.keyboard.press("Tab");
  const at = await page.evaluate(() => (document.activeElement instanceof HTMLAnchorElement ? new URL(document.activeElement.href).pathname : ""));
  expect(at, `Tab ${stop.tabs} focuses the link to ${stop.path}`).toBe(stop.path);
  await Promise.all([page.waitForURL((url) => url.pathname === stop.path), page.keyboard.press("Enter")]);
}

// The fewest Enter presses from / to `target`, up to MAX_STEPS (2), each made from one load of /; null when none reaches it.
async function stepsTo(page: Page, target: string): Promise<number | null> {
  const home = await walk(page, "/");
  const direct = home.find((s) => s.path === target);
  const hops = home.filter((s, i) => s.path !== "/" && home.findIndex((o) => o.path === s.path) === i);
  for (const hop of direct ? [] : hops) {
    const next = (await walk(page, hop.path)).find((s) => s.path === target);
    if (!next) continue;
    await page.goto("/");
    await follow(page, hop);
    await follow(page, next);
    return 2;
  }
  if (!direct) return null;
  await page.goto("/");
  await follow(page, direct);
  return 1;
}

test("the keyboard walk on / reaches its links", async ({ page }) => {
  expect((await walk(page, "/")).length, "Tab from the top of / reaches at least one same-origin link").toBeGreaterThan(0);
});

for (const task of TASKS) {
  test(`${task.name}: ${task.path} from / by keyboard in ${MAX_STEPS} steps or fewer`, async ({ page }) => {
    const built = existsSync(join(DIST, task.path, "index.html"));
    if (!built) console.log(`Skipped task "${task.name}": ${task.path} is not built yet`);
    test.skip(!built, `${task.path} is not built yet`);
    const steps = await stepsTo(page, task.path);
    expect(steps, `${task.name}: no keyboard path from / to ${task.path} in ${MAX_STEPS} steps`).not.toBeNull();
    expect(new URL(page.url()).pathname).toBe(task.path);
  });
}
