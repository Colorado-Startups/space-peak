// Shared by the /data/ endpoints; the leading underscore keeps it out of the routes.
import { getCollection } from "astro:content";
import { allClaims } from "../../lib/claims/parse";
import { buildFiles, indexJson, mediaType, registerDate } from "../../lib/data/build";

const date = registerDate();
let files: Promise<Map<string, string>> | undefined;
const dataFiles = () => (files ??= getCollection("orgs").then((orgs) => buildFiles(orgs.map((o) => o.data), allClaims(), date)));
const respond = (path: string, body: string) => new Response(body, { headers: { "Content-Type": `${mediaType(path)}; charset=utf-8` } });

/** A GET handler that serves one built file. */
export const serve = (path: string) => async () => respond(path, (await dataFiles()).get(path)!);
export const serveIndex = async () => respond("index.json", indexJson(await dataFiles(), date));
