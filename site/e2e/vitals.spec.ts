// Lab vitals for every page in dist/, one cold load each under Lighthouse's mobile settings: our numbers, not Google's.
// LAB and the LCP, CLS and TBT arithmetic copy Git Crafter's lab, quality/collectors/site/site-vitals.mjs at 8023bd46,
// so this fails before the Quality page's design.lcp_mobile, design.cls_mobile and usability.tbt_mobile do.
import { expect, test, type Browser } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";

const DIST = join(import.meta.dirname, "..", "dist");
// Lighthouse mobile: screenEmulation.mobile and throttling.mobileSlow4G as DevTools applies them.
// The window closes at the first 5 s with no long task after load, or at the cap.
const LAB = {
  viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75,
  cpuSlowdown: 4, latencyMs: 150 * 3.75, downloadKbps: 1.6 * 1024 * 0.9, uploadKbps: 750 * 0.9,
  quietMs: 5000, capMs: 45_000,
};
const GOAL = { lcpMs: 2500, cls: 0.1, tbtMs: 200 }; // The Quality page's goals.
type Shift = { startTime: number; value: number; hadRecentInput: boolean };
type Task = { startTime: number; duration: number };
type Obs = { fcp: number | null; lcp: number[]; shifts: Shift[]; tasks: Task[]; loadEnd: number; now: number };
// The same walk as routes-axe.spec.ts. Playwright forbids one spec importing another, so it is copied.
function routes(): string[] {
  if (!existsSync(DIST)) throw new Error(`No build at ${DIST}. Run \`npm run build\` first.`);
  const found = readdirSync(DIST, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".html"))
    .map((file) => file.split(sep).join("/"))
    .map((file) => (file === "index.html" ? "/" : file.endsWith("/index.html") ? `/${file.slice(0, -"index.html".length)}` : `/${file}`)).sort();
  if (found.length === 0) throw new Error(`No pages in ${DIST}.`);
  return found;
}

// CLS: the largest session window; a shift joins it under 1 s after its last shift and 5 s after its first.
// Chrome flags shifts after the emulated viewport applies as input (crbug.com/1302667); as Lighthouse does, those count until the first unflagged one.
function cls(shifts: Shift[]): number {
  let max = 0, value = 0, first = 0, last = 0, unflagged = false;
  for (const s of [...shifts].sort((a, b) => a.startTime - b.startTime)) {
    if (!s.hadRecentInput) unflagged = true;
    else if (unflagged) continue;
    if (value && s.startTime - last < 1000 && s.startTime - first < 5000) value += s.value;
    else [value, first] = [s.value, s.startTime];
    last = s.startTime;
    max = Math.max(max, value);
  }
  return max;
}

// TBT: each long task clipped to the window from FCP to `end`; the clipped part past 50 ms counts.
function tbt(tasks: Task[], start: number, end: number): number {
  let sum = 0;
  for (const t of tasks) {
    const stop = t.startTime + t.duration;
    if (t.duration < 50 || stop < start || t.startTime > end) continue;
    const clipped = Math.min(stop, end) - Math.max(t.startTime, start);
    if (clipped >= 50) sum += clipped - 50;
  }
  return sum;
}

// Runs in the page before its own scripts. Self-contained: Playwright serializes it.
function observeVitals() {
  const lab = { fcp: null as number | null, lcp: [] as number[], shifts: [] as Shift[], tasks: [] as Task[], observers: [] as [PerformanceObserver, (e: PerformanceEntry) => void][] };
  const watch = (type: string, take: (e: PerformanceEntry) => void) => {
    // A type this browser lacks leaves its list empty, and the test fails on it.
    try { const o = new PerformanceObserver((list) => list.getEntries().forEach(take)); o.observe({ type, buffered: true }); lab.observers.push([o, take]); } catch {}
  };
  watch("paint", (e) => { if (e.name === "first-contentful-paint") lab.fcp = e.startTime; });
  watch("largest-contentful-paint", (e) => lab.lcp.push(e.startTime));
  // Entry fields are prototype getters, so each is copied by name.
  watch("layout-shift", (e) => { const s = e as unknown as Shift; lab.shifts.push({ startTime: s.startTime, value: s.value, hadRecentInput: s.hadRecentInput }); });
  watch("longtask", (e) => lab.tasks.push({ startTime: e.startTime, duration: e.duration }));
  Object.defineProperty(window, "__spLab", { value: lab });
}

// Runs in the page: flushes the observers and returns what they saw so far.
function readVitals(): Obs | null {
  const lab = (window as unknown as { __spLab?: Obs & { observers: [PerformanceObserver, (e: PerformanceEntry) => void][] } }).__spLab;
  if (!lab) return null;
  for (const [o, take] of lab.observers) o.takeRecords().forEach(take);
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return { fcp: lab.fcp, lcp: lab.lcp, shifts: lab.shifts, tasks: lab.tasks, loadEnd: nav?.loadEventEnd ?? 0, now: performance.now() };
}

// One cold load in a fresh mobile context with network and CPU throttled through CDP.
async function measure(browser: Browser, url: string): Promise<Obs & { end: number; capped: boolean }> {
  const context = await browser.newContext({ viewport: LAB.viewport, deviceScaleFactor: LAB.deviceScaleFactor, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    const bytes = (kbps: number) => Math.floor((kbps * 1024) / 8); // DevTools takes bytes per second.
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: LAB.latencyMs, downloadThroughput: bytes(LAB.downloadKbps), uploadThroughput: bytes(LAB.uploadKbps) });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: LAB.cpuSlowdown });
    await page.addInitScript(observeVitals);
    const response = await page.goto(url, { waitUntil: "load", timeout: 90_000 });
    expect(response?.status(), `${url} is a built page`).toBe(200);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    for (;;) {
      const obs = await page.evaluate(readVitals);
      if (!obs) throw new Error("the lab observers did not start");
      const busyUntil = Math.max(obs.loadEnd, ...obs.tasks.map((t) => t.startTime + t.duration));
      const capped = obs.now >= LAB.capMs;
      if (obs.now - busyUntil >= LAB.quietMs || capped) return { ...obs, end: obs.now, capped };
      await page.waitForTimeout(Math.min(1000, LAB.quietMs - (obs.now - busyUntil)));
    }
  } finally { await context.close(); }
}

test.describe.configure({ mode: "serial" }); // One page at a time, so this file's loads do not slow each other.

for (const route of routes()) {
  test(`${route} meets LCP ${GOAL.lcpMs} ms, CLS ${GOAL.cls} and TBT ${GOAL.tbtMs} ms on Lighthouse mobile`, async ({ browser, baseURL }) => {
    test.setTimeout(150_000);
    const obs = await measure(browser, new URL(route, baseURL).href);
    expect(obs.fcp, `${route}: the lab saw no first-contentful-paint`).not.toBeNull();
    const lcp = obs.lcp.at(-1) ?? Infinity;
    const shift = cls(obs.shifts);
    const blocking = tbt(obs.tasks, obs.fcp ?? 0, obs.end);
    console.log(`${route}: LCP ${Math.round(lcp)} ms, CLS ${shift.toFixed(3)}, TBT ${Math.round(blocking)} ms${obs.capped ? `, window capped at ${LAB.capMs / 1000} s` : ""}`);
    expect.soft(lcp, `${route} LCP in ms; Infinity means no largest-contentful-paint`).toBeLessThanOrEqual(GOAL.lcpMs);
    expect.soft(shift, `${route} CLS`).toBeLessThanOrEqual(GOAL.cls);
    expect.soft(blocking, `${route} TBT in ms`).toBeLessThanOrEqual(GOAL.tbtMs);
  });
}
