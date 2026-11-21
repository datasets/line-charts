/* Shared helpers: an in-process static server for the repo root (serves
 * /x as /x.html when /x is missing, like Cloudflare Workers Assets), the
 * library list, and a description of the machine. */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OUT = path.join(ROOT, "docs/measurements");
export const LIBS = ["d3", "observable-plot", "vega-lite", "plotly", "chartjs", "echarts", "uplot"];
export const CHARTS = ["hero", "grid", "npm", "life"];

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".csv": "text/csv", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain" };

export function serve() {
  const server = http.createServer(async (req, res) => {
    let p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      let st = await fs.stat(p).catch(() => null);
      if (st?.isDirectory()) { p = path.join(p, "index.html"); st = await fs.stat(p).catch(() => null); }
      if (!st) { p += ".html"; st = await fs.stat(p); }
      res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(await fs.readFile(p));
    } catch { res.writeHead(404).end("not found"); }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () =>
    resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}

const sh = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8" }).trim(); } catch { return null; } };

export function machine() {
  const cpus = os.cpus();
  const mac = process.platform === "darwin";
  return {
    os: mac ? `macOS ${sh("sw_vers", ["-productVersion"])} (Darwin ${os.release()})` : `${os.type()} ${os.release()}`,
    model: mac ? sh("sysctl", ["-n", "hw.model"]) : null,
    cpu: (mac && sh("sysctl", ["-n", "machdep.cpu.brand_string"])) || cpus[0]?.model,
    cores: cpus.length,
    ramGB: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
  };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : (process.argv[i + 1] ?? true); };
export const flag = (name) => process.argv.includes(`--${name}`);
