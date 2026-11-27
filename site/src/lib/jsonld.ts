// schema.org JSON-LD for each page (schema.org; Google's Organization and Dataset guides, read 2026-11-27).
// Pure builders. Estimates are opinions, so nothing here imports or emits one.
import { catalog, LICENSE, SITE } from "./data/build";

export type Node = Record<string, unknown>;
const abs = (path: string) => new URL(path, SITE).href;
export const ORG_ID = `${SITE}/#org`;
export const WEBSITE_ID = `${SITE}/#website`;
export const PLACE_ID = `${SITE}/#region`;
const TAGLINE = "Colorado's hub for the future of space.";

/** On every page: the site, Space Peak and its region, so every @id reference resolves in the page. */
export const site = (): Node[] => [
  { "@type": "WebSite", "@id": WEBSITE_ID, name: "Space Peak", url: abs("/"), description: TAGLINE, inLanguage: "en", publisher: { "@id": ORG_ID }, license: LICENSE },
  {
    "@type": "Organization", "@id": ORG_ID, name: "Space Peak", url: abs("/"), description: TAGLINE,
    logo: abs("/art/crest-384.webp"), image: abs("/art/space-peak.jpg"), areaServed: { "@id": PLACE_ID },
    sameAs: ["https://github.com/Colorado-Startups/space-peak"],
    sponsor: [
      { "@type": "Organization", name: "Colorado Startups", url: "https://coloradostartups.org" },
      { "@type": "Organization", name: "Colorado Compute" },
    ],
  },
  region(),
];

/** The region: Colorado Springs and Fountain, in El Paso County, Colorado. */
export const region = (): Node => ({
  "@type": "Place", "@id": PLACE_ID, name: "Space Peak region",
  description: "The Colorado Startups region for Colorado Springs and Fountain, Colorado.",
  address: { "@type": "PostalAddress", addressRegion: "CO", addressCountry: "US" },
  containsPlace: ["Colorado Springs", "Fountain"].map((name) => ({ "@type": "City", name })),
});

/** The guide as an ordered list of its entries. */
export const itemList = (name: string, items: { name: string; url: string }[]): Node => ({
  "@type": "ItemList", name, numberOfItems: items.length,
  itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, url: abs(item.url) })),
});

/** The /data/ page: the same DataCatalog catalog.json serves, with Space Peak as each dataset's creator. */
export const dataCatalog = (generated: string): Node => {
  const { "@context": _, ...cat } = catalog(generated);
  return {
    ...cat, "@id": abs("/data/#catalog"), publisher: { "@id": ORG_ID },
    dataset: cat.dataset.map((d) => ({ ...d, creator: { "@id": ORG_ID }, spatialCoverage: { "@id": PLACE_ID }, includedInDataCatalog: { "@id": abs("/data/#catalog") } })),
  };
};

/** One @graph document. `<` is escaped so no string can close the script element. */
export const serialize = (nodes: Node[]): string =>
  JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replaceAll("<", "\\u003c");
