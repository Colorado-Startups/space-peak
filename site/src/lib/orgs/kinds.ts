// The three kinds of organisation the site features, each with a short list of subkinds.
export const SUBKINDS = {
  command_base: ["command", "installation", "unit"],
  institution: ["university", "college", "lab", "nonprofit"],
  company: ["prime", "supplier", "startup", "services"],
} as const;

export type Kind = keyof typeof SUBKINDS;
export const KINDS = Object.keys(SUBKINDS) as [Kind, ...Kind[]];

export const CITIES = [
  "colorado-springs",
  "fountain",
  "security-widefield",
  "manitou-springs",
  "monument",
  "woodland-park",
  "cascade",
  "pueblo",
] as const;

export const AREAS = ["loop", "nearby"] as const;
export const PRECISIONS = ["point", "campus", "city"] as const;
export const STATUSES = ["active", "moved", "closed"] as const;
