import { describe, expect, it } from "vitest";
import { registerDate } from "../../src/lib/data/build";
import { allEstimates } from "../../src/lib/estimates/schema";
import { dataCatalog, itemList, type Node, ORG_ID, PLACE_ID, serialize, site } from "../../src/lib/jsonld";

const date = registerDate();
// Every block a page can carry: the site graph alone, the /data/ page and a guide list.
const pages: Record<string, Node[]> = {
  home: [],
  data: [dataCatalog(date)],
  guide: [itemList("Space Peak guide", [{ name: "Map", url: "/map/" }, { name: "Launch", url: "/launch/" }])],
};
const blocks = Object.entries(pages).map(([name, nodes]) => [name, serialize([...site(), ...nodes])] as const);
const graph = (text: string): Node[] => JSON.parse(text)["@graph"];

describe("JSON-LD", () => {
  it.each(blocks)("%s parses as one schema.org @graph", (_, text) => {
    const doc = JSON.parse(text);
    expect(doc["@context"]).toBe("https://schema.org");
    expect(doc["@graph"].every((n: Node) => typeof n["@type"] === "string")).toBe(true);
  });

  it.each(blocks)("%s resolves every @id it references", (_, text) => {
    const ids = new Set(graph(text).map((n) => n["@id"]).filter(Boolean));
    const refs = [...text.matchAll(/\{"@id":"([^"]+)"\}/g)].map((m) => m[1]);
    expect(refs.filter((r) => !ids.has(r))).toEqual([]);
  });

  it("every page names Space Peak, its sponsors and its region", () => {
    const nodes = graph(blocks[0][1]);
    const org = nodes.find((n) => n["@id"] === ORG_ID)!;
    expect((org.sponsor as Node[]).map((s) => s.name)).toEqual(["Colorado Startups", "Colorado Compute"]);
    expect(nodes.find((n) => n["@id"] === PLACE_ID)?.["@type"]).toBe("Place");
    expect(nodes.map((n) => n["@type"])).toEqual(["WebSite", "Organization", "Place"]);
  });

  it("every Dataset has a name, the CC0 license and a description of 50 to 5,000 characters", () => {
    const datasets = dataCatalog(date).dataset as Node[];
    expect(datasets.length).toBeGreaterThan(0);
    for (const d of datasets) {
      expect(d.name).toEqual(expect.any(String));
      expect(d.license).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
      expect((d.description as string).length).toBeGreaterThanOrEqual(50);
      expect((d.description as string).length).toBeLessThanOrEqual(5000);
    }
    expect(new Set(datasets.map((d) => d.name)).size).toBe(datasets.length);
  });

  it("no estimate appears in any block", () => {
    const estimates = allEstimates();
    expect(estimates.length).toBeGreaterThan(0);
    for (const [, text] of blocks) {
      expect(text).not.toMatch(/estimate|probab/i);
      for (const e of estimates) {
        expect(text).not.toContain(e.question);
        expect(text).not.toContain(e.reasoning.slice(0, 40));
      }
    }
  });

  it("escapes < so no string can close the script element", () => {
    expect(serialize([{ "@type": "Thing", name: "</script><b>" }])).not.toContain("<");
  });
});
