// The GET handlers behind the /data/ endpoints. Each serves one file that build.ts builds, once per site build.
import { getCollection } from "astro:content";
import { allClaims } from "../claims/parse";
import { buildFiles, indexJson, mediaType, registerDate } from "./build";

const date = registerDate();
let files: Promise<Map<string, string>> | undefined;
const dataFiles = () => (files ??= getCollection("orgs").then((orgs) => buildFiles(orgs.map((o) => o.data), allClaims(), date)));
const respond = (path: string, body: string) => new Response(body, { headers: { "Content-Type": `${mediaType(path)}; charset=utf-8` } });

/** A GET handler that serves one built file. */
export const serve = (path: string) => async () => respond(path, (await dataFiles()).get(path)!);
/** The GET handler for /data/index.json: every file, with its hash and the register's date. */
export const serveIndex = async () => respond("index.json", indexJson(await dataFiles(), date));
