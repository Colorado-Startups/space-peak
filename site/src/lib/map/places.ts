// The /map/ list twin's groups: every drawn place once, by kind in the key's order, each with its city and source.
// PlaceList.astro renders these; test/dom/map-page.test.ts runs them on fixture orgs.
import type { Kind } from "../orgs/kinds";
import { roleOf, type MapData } from "./data";

const CITY: Record<string, string> = {
  "colorado-springs": "Colorado Springs", fountain: "Fountain", "security-widefield": "Security-Widefield",
  "manitou-springs": "Manitou Springs", monument: "Monument", "woodland-park": "Woodland Park", cascade: "Cascade", pueblo: "Pueblo",
};
type Place = { name: string; where: string; url: string };
export type PlaceGroup = { kind: Kind | "summit"; title: string; items: Place[] };
const GROUPS: { kind: Kind | "summit"; title: string }[] = [
  { kind: "command_base", title: "Commands and bases" },
  { kind: "institution", title: "Universities and institutions" },
  { kind: "company", title: "Companies and startups" },
  { kind: "summit", title: "Summits" },
];

/** Pure: `cities` maps an org id to its city slug, as the orgs collection holds it. */
export function placeGroups(data: MapData, cities: ReadonlyMap<string, string>): PlaceGroup[] {
  return GROUPS.map(({ kind, title }) => ({
    kind,
    title,
    items:
      kind === "summit"
        ? data.summits.map((s) => ({ name: s.summit, where: roleOf(s.summit), url: s.source_url }))
        : data.orgs.filter((o) => o.kind === kind).map((o) => ({ name: o.name, where: CITY[cities.get(o.id) ?? ""] ?? "Colorado", url: o.source_url })),
  }));
}
