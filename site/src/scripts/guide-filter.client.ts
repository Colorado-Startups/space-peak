// The /guide/ filter: chips and a search field over each table in a [data-guide] section.
// The page works without it: the tables are full, the chips are plain links, the search fields stay hidden.
// A section's data-guide value names its query parameter: empty means ?kind= (organisations), "need" means ?need=.
export const KIND_PARAM = "kind";

/** The value a `?kind=` (or `?<param>=`) query names, or "" for all. An unknown value means all. */
export function readKind(search: string, kinds: readonly string[], param = KIND_PARAM): string {
  const kind = new URLSearchParams(search).get(param) ?? "";
  return kinds.includes(kind) ? kind : "";
}

/** A row shows when it has the chosen kind (or all) and its text holds the query. */
export function rowMatches(row: { kind: string; text: string }, kind: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (!kind || row.kind === kind) && (!q || row.text.includes(q));
}

export function init(doc: Document): void {
  const win = doc.defaultView;
  if (!win) return;
  for (const root of doc.querySelectorAll<HTMLElement>("[data-guide]")) initSection(root, win);
}

function initSection(root: HTMLElement, win: Window): void {
  const param = root.dataset.guide || KIND_PARAM;
  const rows = [...root.querySelectorAll<HTMLTableRowElement>("tr[data-kind]")];
  const chips = [...root.querySelectorAll<HTMLAnchorElement>("a[data-kind-chip]")];
  const kinds = chips.map((c) => c.dataset.kindChip ?? "").filter(Boolean);
  const form = root.querySelector<HTMLFormElement>("[data-guide-search]");
  const input = form?.querySelector("input") ?? null;
  const none = root.querySelector<HTMLElement>("[data-guide-none]");
  const status = root.querySelector<HTMLElement>("[data-guide-status]");
  let kind = readKind(win.location.search, kinds, param);

  // Hides each row the chosen kind and the query leave out, and returns how many still show.
  const showRows = () => {
    let shown = 0;
    for (const row of rows) {
      row.hidden = !rowMatches({ kind: row.dataset.kind ?? "", text: row.dataset.text ?? "" }, kind, input?.value ?? "");
      if (!row.hidden) shown++;
    }
    return shown;
  };
  const apply = () => {
    const shown = showRows();
    for (const chip of chips) {
      if ((chip.dataset.kindChip ?? "") === kind) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
    }
    if (none) none.hidden = shown > 0;
    if (status) status.textContent = `Showing ${shown} of ${rows.length}`;
  };

  for (const chip of chips) {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      kind = chip.dataset.kindChip ?? "";
      const url = new URL(win.location.href);
      if (kind) url.searchParams.set(param, kind);
      else url.searchParams.delete(param);
      win.history.replaceState(null, "", url);
      apply();
    });
  }
  input?.addEventListener("input", apply);
  form?.addEventListener("submit", (event) => event.preventDefault());
  if (form) form.hidden = false;
  apply();
}
