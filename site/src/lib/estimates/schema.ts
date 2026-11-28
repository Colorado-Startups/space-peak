// Draft estimates for the odds section, one YAML file each in data/estimates/.
// An estimate is an opinion: it never counts as verified and never enters schema.org output.
import { parse } from "yaml";
import { z } from "zod";
import type { ClaimStatus } from "../claims/parse";
import { sourceSchema } from "../orgs/schema";

const files = import.meta.glob("../../../../data/estimates/*.yaml", { query: "?raw", import: "default", eager: true });

const ESTIMATOR = "Draft by Claude for Paul's review";
const sentences = (s: string) => s.split(/(?<=\.)\s+/).filter(Boolean).length;

export const estimateSchema = z.strictObject({
  id: z.string().regex(/^q-\d{2}$/, "must be q-NN"),
  question: z.string().trim().endsWith("?", "must be one yes/no question"),
  resolves: z.strictObject({ date: z.iso.date(), criteria: z.string().trim().min(1) }),
  p: z.number().gt(0).lt(1),
  reasoning: z.string().trim().refine((r) => sentences(r) >= 3 && sentences(r) <= 5, "reasoning is 3 to 5 sentences"),
  claims: z.array(z.string().regex(/^[A-Z]-\d+$/)).min(1),
  sources: z.array(sourceSchema).min(1),
  estimator: z.literal(ESTIMATOR),
  date: z.iso.date(),
  approved: z.literal(false),
});

export type Estimate = z.infer<typeof estimateSchema>;

/** The register row for an estimate, such as "Q-01" for q-01. */
export const registerId = (e: Pick<Estimate, "id">) => e.id.toUpperCase();

/** The label an estimate wears on the site: "draft estimate" while its row is open, and never a status word for a fact. */
export const estimateTag = (status: ClaimStatus): string => (status === "open" ? "draft estimate" : "estimate");

/** Parse and check one file; throws unless its `id` equals its filename stem. */
export function parseEstimate(path: string, text: string): Estimate {
  const estimate = estimateSchema.parse(parse(text));
  const stem = path.replace(/^.*\//, "").replace(/\.yaml$/, "");
  if (estimate.id !== stem) throw new Error(`${path}: id "${estimate.id}" must equal the filename "${stem}"`);
  return estimate;
}

/** Every estimate, in id order. */
export const allEstimates = (): Estimate[] =>
  Object.entries(files)
    .map(([path, text]) => parseEstimate(path, text as string))
    .sort((a, b) => a.id.localeCompare(b.id));
