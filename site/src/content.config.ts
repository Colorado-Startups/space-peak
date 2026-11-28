// The site's one content collection, orgs: one YAML file per organisation in data/orgs/ at the repo root.
// An empty folder still builds.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { checkFileId, orgSchema } from "./lib/orgs/schema";

const orgs = defineCollection({
  loader: glob({
    pattern: "*.{yaml,yml}",
    base: "../data/orgs",
    generateId: ({ entry, data }) => checkFileId(entry, data),
  }),
  schema: orgSchema,
});

export const collections = { orgs };
