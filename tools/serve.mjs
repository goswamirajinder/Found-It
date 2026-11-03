// Serves the app folder on http://localhost:5179 for testing on this computer.
// Run with: node tools/serve.mjs   (phones need HTTPS, see README)
import http from "node:http";
import {readFile} from "node:fs/promises";
import {extname, join, normalize, sep} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 5179;
const TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml"};

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(root, p));
  if (!file.startsWith(normalize(root)) || file.includes(`${sep}node_modules${sep}`)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, {"content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache"});
    res.end(body);
  } catch (e) { res.writeHead(404); res.end("not found"); }
}).listen(port, "127.0.0.1", () => console.log(`Found It on http://localhost:${port}`));
