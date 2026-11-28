// Labels for the startup credits table on /guide/. The rows are data/resources.json, which
// scripts/resources/pull.mjs writes from the startup-credits catalog; nothing here adds a figure.
export const BUCKETS = ["incorporated", "funded_or_partner"] as const;
export type Bucket = (typeof BUCKETS)[number];
export type Cover = "cpu" | "gpu" | "inference" | "other";

export interface Resource {
  id: string; program: string; provider: string; bucket: Bucket; amount_note: string; covers: Cover[]; link: string; checked: string;
  credit_first: number | null; credit_first_computed: boolean; credit_max: number | null; credit_max_computed: boolean;
}

// The catalog's own bucket meanings (catalog/README.md): a registered company, or outside funding, a code or an invitation.
export const BUCKET_LABEL: Record<Bucket, string> = { incorporated: "A registered company", funded_or_partner: "Funding or a partner" };
export const COVER_LABEL: Record<Cover, string> = { cpu: "CPU", gpu: "GPU", inference: "Inference", other: "Other" };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const computed = (yes: boolean) => (yes ? ", computed by the catalog" : "");

/** The catalog's US dollar figure in a few words. credit_max is "at most", so a range reads "Up to". */
export function amount(r: Pick<Resource, "credit_first" | "credit_first_computed" | "credit_max" | "credit_max_computed">): string {
  if (r.credit_max !== null) return `${r.credit_first === r.credit_max ? "" : "Up to "}${usd(r.credit_max)}${computed(r.credit_max_computed)}`;
  if (r.credit_first !== null) return `From ${usd(r.credit_first)}${computed(r.credit_first_computed)}`;
  return "No US dollar figure";
}

/** Where a link goes, for its text: the host without "www.". */
export const host = (link: string) => new URL(link).hostname.replace(/^www\./, "");

/** A catalog note as a visitor reads it: a ", read YYYY-MM-DD" that ends a clause is left off (issue #153). */
export const noteText = (note: string) => note.replace(/, read \d{4}-\d{2}-\d{2}(?=[).;,]|$)/g, "");
