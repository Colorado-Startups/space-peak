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
const label = z.string().trim().min(1).regex(/^\D+$/, "no bare number: a value comes from a register row");

export const launchSchema = z.strictObject({
  profile: z
    .array(z.strictObject({ at: z.enum(ANCHORS), label, claim: claimId }))
    .min(1)
    .refine((p) => new Set(p.map((e) => e.at)).size === p.length, "each point is marked once"),
  make_or_break: z.array(claimId).min(1),
});
export type Launch = z.infer<typeof launchSchema>;

/** Parse and check the file. Throws on a bad shape or on a claim the register does not have. */
export function parseLaunch(text: string, lookup: (id: string) => ClaimRow = getClaim): Launch {
  const data = launchSchema.parse(parse(text));
  for (const id of [...data.profile.map((e) => e.claim), ...data.make_or_break]) lookup(id);
  return data;
}

let cached: Launch | undefined;
export const launch = (): Launch => (cached ??= parseLaunch(launchText));

/** The key's letters, A for the first entry. */
export const markOf = (i: number) => String.fromCharCode(65 + i);
