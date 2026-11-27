// The /guide/ filter: kind chips and a search field over the organisations table.
// The page works without it: the table is full, the chips are plain links, the search field stays hidden.
export const KIND_PARAM = "kind";

/** The kind a `?kind=` query names, or "" for all. An unknown kind means all. */
export function readKind(search: string, kinds: readonly string[]): string {
  const kind = new URLSearchParams(search).get(KIND_PARAM) ?? "";
  return kinds.includes(kind) ? kind : "";
}

/** A row shows when it has the chosen kind (or all) and its text holds the query. */
export function rowMatches(row: { kind: string; text: string }, kind: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (!kind || row.kind === kind) && (!q || row.text.includes(q));
}

export function init(doc: Document): void {
  const root = doc.querySelector<HTMLElement>("[data-guide]");
  const win = doc.defaultView;
  if (!root || !win) return;
  const rows = [...root.querySelectorAll<HTMLTableRowElement>("tr[data-kind]")];
  const chips = [...root.querySelectorAll<HTMLAnchorElement>("a[data-kind-chip]")];
  const kinds = chips.map((c) => c.dataset.kindChip ?? "").filter(Boolean);
  const form = root.querySelector<HTMLFormElement>("[data-guide-search]");
  const input = form?.querySelector("input") ?? null;
  const none = root.querySelector<HTMLElement>("[data-guide-none]");
  const status = root.querySelector<HTMLElement>("[data-guide-status]");
  let kind = readKind(win.location.search, kinds);

  const apply = () => {
    let shown = 0;
    for (const row of rows) {
      row.hidden = !rowMatches({ kind: row.dataset.kind ?? "", text: row.dataset.text ?? "" }, kind, input?.value ?? "");
      if (!row.hidden) shown++;
    }
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
      if (kind) url.searchParams.set(KIND_PARAM, kind);
      else url.searchParams.delete(KIND_PARAM);
      win.history.replaceState(null, "", url);
      apply();
    });
  }
  input?.addEventListener("input", apply);
  form?.addEventListener("submit", (event) => event.preventDefault());
  if (form) form.hidden = false;
  apply();
}
