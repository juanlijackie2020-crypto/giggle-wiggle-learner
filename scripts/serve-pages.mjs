// Local test host: emulate GitHub Pages serving dist under a repository subpath.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist"),
  prefix = "/giggle-wiggle-learner/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
};
createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    if (!path.startsWith(prefix)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const file = resolve(
      root,
      decodeURIComponent(path.slice(prefix.length) || "index.html"),
    );
    if (!file.startsWith(root + "/")) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(4174, "127.0.0.1", () =>
  console.log("Built Pages subpath test host ready on port 4174"),
);
