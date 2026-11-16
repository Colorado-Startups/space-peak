// Foreground static server over dist/, for Playwright's webServer.
// Zero dependencies, node:http only. Shaped like coloradostartups.org's site/scripts/serve-dist.mjs.
//
// Not `astro preview`: Astro 7.3+ detaches preview into the background when it detects
// an AI agent driving the terminal, and Playwright needs the command in the foreground.
//
// Behavior matches the deployed site (wrangler.jsonc html_handling auto-trailing-slash):
//   - /about/ serves dist/about/index.html
//   - a bare /about redirects (301) to /about/
//   - an unknown route serves dist/404.html with a 404 status
//
// Usage: node scripts/serve-dist.mjs [--port 3321] [--host 127.0.0.1]

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "dist");

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const PORT = Number(flag("port", 3321));
const HOST = flag("host", "127.0.0.1");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};
const contentType = (path) => {
  const dot = path.lastIndexOf(".");
  return (dot === -1 ? undefined : TYPES[path.slice(dot).toLowerCase()]) ?? "application/octet-stream";
};

const isFile = (path) => existsSync(path) && statSync(path).isFile();

// The normalize plus prefix check is the traversal guard: a path outside dist/ resolves to null.
const resolveFile = (pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const candidate = resolve(distRoot, "." + normalize(decoded));
  if (candidate !== distRoot && !candidate.startsWith(distRoot + sep)) return null;
  if (isFile(candidate)) return candidate;
  const indexFile = join(candidate, "index.html");
  return isFile(indexFile) ? indexFile : null;
};

const sendFile = (res, file, status) => {
  res.writeHead(status, { "content-type": contentType(file), "cache-control": "no-store" });
  createReadStream(file).pipe(res);
};

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" }).end();
    return;
  }
  const { pathname } = new URL(req.url ?? "/", `http://${HOST}`);
  const file = resolveFile(pathname);
  if (file) return sendFile(res, file, 200);
  if (!pathname.endsWith("/") && resolveFile(pathname + "/")) {
    res.writeHead(301, { location: pathname + "/" }).end();
    return;
  }
  const notFound = join(distRoot, "404.html");
  if (isFile(notFound)) return sendFile(res, notFound, 404);
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found\n");
});

if (!existsSync(distRoot)) {
  console.error(`No build at ${distRoot}. Run \`npm run build\` first.`);
  process.exit(1);
}

// Strict port: exit rather than move to another one.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} on ${HOST} is in use. Stop whatever holds it and try again.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => console.log(`Serving dist/ at http://${HOST}:${PORT}/`));

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
