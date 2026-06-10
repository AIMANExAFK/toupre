const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = 4174;
const ROOT = path.join(__dirname, "frontend", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function noCacheHeaders(filePath) {
  const ext = path.extname(filePath);
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
  if (ext === ".js" || ext === ".css") {
    headers["Cache-Control"] = "public, max-age=0, must-revalidate";
  }
  return headers;
}

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const withoutSlash = cleanPath.replace(/^\/+/, "");
  const candidates = [];

  if (!withoutSlash) {
    candidates.push("index.html");
  } else {
    candidates.push(withoutSlash);
    candidates.push(`${withoutSlash}.html`);
    candidates.push(path.join(withoutSlash, "index.html"));
  }

  if (cleanPath.startsWith("/listing/")) {
    candidates.push(path.join("listing", "[id].html"));
  }
  if (cleanPath.startsWith("/booking/")) {
    candidates.push(path.join("booking", "[id].html"));
  }

  candidates.push("+not-found.html");

  for (const candidate of candidates) {
    const filePath = path.normalize(path.join(ROOT, candidate));
    if (!filePath.startsWith(ROOT)) continue;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url || "/");
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, noCacheHeaders(filePath));
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`LocaShare preview: http://localhost:${PORT}/welcome/`);
});
