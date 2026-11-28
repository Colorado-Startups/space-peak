// The /launch/ cadence calculator (step 34): minutes between shots give launches a year.
// Arithmetic, not a forecast. The page works without it: the brief's interval and its result are static text,
// rendered at build time from cadenceView(), and the slider stays hidden.
// The world's count (register row E-02) arrives as data-cadence-world, set at build time by lib/launch/busy-year.ts.
export const MINUTES_A_YEAR = 525_600; // 365 days of 24 hours of 60 minutes

/** The slider's stops, in minutes between shots: five minutes to two days. Even steps would park an hour near one end. */
export const STOPS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440, 2880] as const;
/** The brief's once an hour: register row P-08, unverified. */
export const BRIEF_MINUTES = 60;
export const BRIEF_STOP = STOPS.indexOf(BRIEF_MINUTES);
/** The narrowest bar drawn, in percent, so a sliver still shows. */
export const MIN_SHARE = 0.5;

/** Launches a year at one shot every `minutes`, rounded. */
export function launchesPerYear(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) throw new RangeError(`minutes between shots must be above 0, got ${minutes}`);
  return Math.round(MINUTES_A_YEAR / minutes);
}

/** The stop a slider value names, clamped to the ends. */
export const minutesAt = (stop: number): number => STOPS[Math.min(STOPS.length - 1, Math.max(0, Math.round(stop) || 0))];

/** A whole number with thousands commas, as en-US writes it. */
export const formatCount = (n: number): string => new Intl.NumberFormat("en-US").format(n);

/** Each bar's width in percent of the larger of the two. `world` is the world's launches in a year. */
export function shares(launches: number, world: number): { rate: number; world: number } {
  const top = Math.max(launches, world);
  const pct = (n: number) => Math.max(MIN_SHARE, Math.round((n / top) * 1000) / 10);
  return { rate: pct(launches), world: pct(world) };
}

/** Everything the calculator shows for one slider stop, beside `world` launches a year. */
export function cadenceView(stop: number, world: number) {
  const minutes = minutesAt(stop);
  const launches = launchesPerYear(minutes);
  return { minutesText: formatCount(minutes), launchesText: formatCount(launches), share: shares(launches, world) };
}

// Writes only on a change, so the polite live region never repeats itself.
function put(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

/** Wires each [data-cadence] slider: it shows the slider, then sets the minutes, the launch count and the bars as it moves.
 *  A root without a world count above zero keeps its static text and its hidden slider. */
export function init(doc: Document): void {
  for (const root of doc.querySelectorAll<HTMLElement>("[data-cadence]")) {
    const input = root.querySelector<HTMLInputElement>("input[type='range']");
    const slider = root.querySelector<HTMLElement>("[data-cadence-slider]");
    const world = Number(root.dataset.cadenceWorld);
    if (!input || !slider || !(world > 0)) continue;
    const apply = () => {
      const view = cadenceView(Number(input.value), world);
      input.setAttribute("aria-valuetext", `${view.minutesText} minutes`);
      put(root.querySelector("[data-cadence-minutes]"), view.minutesText);
      put(root.querySelector("[data-cadence-result]"), view.launchesText);
      for (const key of ["rate", "world"] as const)
        root.querySelector<HTMLElement>(`[data-cadence-bar='${key}']`)?.style.setProperty("--share", String(view.share[key]));
    };
    input.addEventListener("input", apply);
    slider.hidden = false;
    apply(); // a restored form state may already have moved the slider
  }
}
