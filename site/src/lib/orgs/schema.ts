import { z } from "zod";
import { AREAS, CITIES, KINDS, PRECISIONS, STATUSES, SUBKINDS } from "./kinds";

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const today = () => new Date().toISOString().slice(0, 10);

export const sourceSchema = z.strictObject({
  id: kebab,
  url: z.url({ protocol: /^https$/ }),
  publisher: z.string().trim().min(1),
  // Astro's YAML loader turns a bare 2026-11-01 into a Date; keep it as an ISO date string.
  read: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
    z.iso.date().refine((d) => d <= today(), "read date is in the future"),
  ),
  quote: z.string().trim().min(1).refine((q) => words(q) <= 15, "quote is over 15 words").optional(),
});

export const orgSchema = z
  .strictObject({
    id: kebab,
    name: z.string().trim().min(1),
    summary: z.string().trim().min(1).max(200),
    kind: z.enum(KINDS),
    subkind: z.string(),
    city: z.enum(CITIES),
    area: z.enum(AREAS),
    fact: z.strictObject({ text: z.string().trim().min(1), source: kebab }),
    sources: z.array(sourceSchema).min(1),
    location: z.strictObject({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      precision: z.enum(PRECISIONS),
      method: z.string().trim().min(1),
      source: kebab,
    }),
    cs_ref: z.strictObject({ collection: kebab, id: kebab }).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .superRefine((org, ctx) => {
    const subkinds: readonly string[] = SUBKINDS[org.kind];
    if (!subkinds.includes(org.subkind))
      ctx.addIssue({ code: "custom", path: ["subkind"], message: `subkind for ${org.kind}: ${subkinds.join(", ")}` });
    const ids = org.sources.map((s) => s.id);
    ids.forEach((id, i) => {
      if (ids.indexOf(id) !== i) ctx.addIssue({ code: "custom", path: ["sources", i, "id"], message: `duplicate source ${id}` });
    });
    for (const path of [["fact", "source"], ["location", "source"]] as const) {
      const ref = org[path[0]].source;
      if (!ids.includes(ref)) ctx.addIssue({ code: "custom", path: [...path], message: `unknown source ${ref}` });
    }
  });

export type Org = z.infer<typeof orgSchema>;

/** The filename stem, as the content collection and the checker see it. */
export const fileId = (entry: string) => entry.replace(/^.*\//, "").replace(/\.ya?ml$/, "");

/** Throws unless the file's `id` equals its filename stem. */
export function checkFileId(entry: string, data: Record<string, unknown>): string {
  const stem = fileId(entry);
  if (data.id !== stem) throw new Error(`${entry}: id "${String(data.id)}" must equal the filename "${stem}"`);
  return stem;
}
