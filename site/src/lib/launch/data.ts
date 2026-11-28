// data/launch.yaml, checked: the structure of /launch/ and the register rows it cites.
// A value never lives here. getClaim throws on an unknown ID, so a bad row fails the build.
import { parse } from "yaml";
import { z } from "zod";
import launchText from "../../../../data/launch.yaml?raw";
import { getClaim, type ClaimRow } from "../claims/parse";

/** The points on the profile drawing a key entry can mark. */
export const ANCHORS = ["portal", "tunnel", "muzzle", "air", "arc", "orbit"] as const;
export type Anchor = (typeof ANCHORS)[number];

const claimId = z.string().regex(/^[A-Z]-\d+$/, "must be a register ID such as P-03");
const label = z.string().trim().min(1);

// A card on the site tour. `site` is the register's Site column, so each row is checked to be that site's.
// `veto` holds the rows of the brief's veto column for that place, which the page shows as Hurdles.
const place = z.strictObject({ name: label, site: z.string().trim().min(1), claims: z.array(claimId).min(1), veto: z.array(claimId).optional() });

export const launchSchema = z.strictObject({
  profile: z
    .array(z.strictObject({ at: z.enum(ANCHORS), label, claim: claimId }))
    .min(1)
    .refine((p) => new Set(p.map((e) => e.at)).size === p.length, "each point is marked once"),
  make_or_break: z.array(claimId).min(1),
  sites: z.strictObject({ ranked: z.array(place).length(3), headquarters: place }),
  risks: z.array(z.strictObject({ label, claims: z.array(claimId).min(1) })).min(1),
});
export type Launch = z.infer<typeof launchSchema>;
export type Place = Launch["sites"]["headquarters"];

/** Every place on the tour, in page order: the ranked three, then the headquarters. */
export const placesOf = (d: Launch): Place[] => [...d.sites.ranked, d.sites.headquarters];

/** A place's rows: its own, then its veto's. */
export const rowsOf = (p: Place): string[] => [...p.claims, ...(p.veto ?? [])];

/** Every claim the page shows, in page order. */
export const launchClaims = (d: Launch): string[] => [
  ...d.profile.map((e) => e.claim),
  ...d.make_or_break,
  ...placesOf(d).flatMap(rowsOf),
  ...d.risks.flatMap((r) => r.claims),
];

/** Parse and check the file. Throws on a bad shape, on a claim the register does not have, or on a row of another site. */
export function parseLaunch(text: string, lookup: (id: string) => ClaimRow = getClaim): Launch {
  const data = launchSchema.parse(parse(text));
  for (const id of launchClaims(data)) lookup(id);
  for (const p of placesOf(data))
    for (const id of rowsOf(p)) {
      const site = lookup(id).site;
      if (site !== p.site) throw new Error(`${p.name}: ${id} is a row of "${site ?? "no site"}", not "${p.site}"`);
    }
  return data;
}

let cached: Launch | undefined;
/** data/launch.yaml, parsed and checked once. */
export const launch = (): Launch => (cached ??= parseLaunch(launchText));

/** The key's letters, A for the first entry. */
export const markOf = (i: number) => String.fromCharCode(65 + i);
