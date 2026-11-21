/* What each demo page actually downloads from jsDelivr: every script,
 * stylesheet and transitive ESM module, captured from the network.
 *
 *   node bundles.mjs [--channel chrome] [--only d3,plotly]
 *
 * For each library, opens demos/<lib>.html?chart=hero&bare=1 in a fresh
 * context (empty cache), records every response from cdn.jsdelivr.net, and
 * per file stores: raw bytes (decoded body), gzip -9 bytes of that body, and
 * the bytes jsDelivr actually sent (its own compression, usually Brotli).
 * The published bundle size (meta.bundleKB) is the gzip -9 total, in kB
 * of 1,000 bytes. */
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "playwright";
import { serve, machine, today, arg, LIBS, OUT } from "./lib.mjs";

const channel = arg("channel", "chrome");
const libs = arg("only", null)?.split(",") ?? LIBS;
const srv = await serve();
const browser = await chromium.launch({ channel, headless: true });
const browserVersion = browser.version();

const results = [];
for (const lib of libs) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pending = [];
  page.on("response", (res) => {
    if (new URL(res.url()).host !== "cdn.jsdelivr.net") return;
    pending.push((async () => {
      const body = await res.body();
      const sizes = await res.request().sizes().catch(() => null);
      return {
        url: res.url(),
        status: res.status(),
        type: res.headers()["content-type"]?.split(";")[0] ?? null,
        encoding: res.headers()["content-encoding"] ?? "identity",
        rawBytes: body.length,
        gzip9Bytes: zlib.gzipSync(body, { level: 9 }).length,
        transferBytes: sizes?.responseBodySize ?? null,
      };
    })());
  });
  await page.goto(`${srv.url}/demos/${lib}.html?chart=hero&bare=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-ms]")?.textContent !== "—", null, { timeout: 60_000 });
  const files = (await Promise.all(pending)).sort((a, b) => b.rawBytes - a.rawBytes);
  const sum = (k) => files.reduce((s, f) => s + (f[k] ?? 0), 0);
  results.push({ lib, files: files.length, rawBytes: sum("rawBytes"), gzip9Bytes: sum("gzip9Bytes"), transferBytes: sum("transferBytes"), list: files });
  console.log(`${lib.padEnd(16)} ${String(files.length).padStart(3)} files  raw ${sum("rawBytes")}  gzip-9 ${sum("gzip9Bytes")}  sent ${sum("transferBytes")}`);
  await context.close();
}
await browser.close();
srv.close();

const date = today();
const record = {
  date, generatedAt: new Date().toISOString(),
  method: "Every response from cdn.jsdelivr.net while demos/<lib>.html?chart=hero&bare=1 loads in a fresh context. rawBytes = decoded body; gzip9Bytes = Node zlib gzip level 9 of that body; transferBytes = encoded body as jsDelivr sent it. 1 kB = 1,000 bytes.",
  browser: { name: "Google Chrome", version: browserVersion, headless: true },
  machine: machine(),
  results,
};
const kB = (b) => (b / 1000).toFixed(1);
const short = (u) => u.replace("https://cdn.jsdelivr.net/npm/", "");
const md = [
  `# Bundle sizes, ${date}`,
  "",
  "Every file each demo page downloads from jsDelivr (scripts, stylesheets and transitive ESM modules), captured from the network in a fresh browser context. **gzip -9** is Node's zlib at level 9 on the decoded body, the figure the site quotes. **Sent** is what jsDelivr actually transferred with its own compression (usually Brotli). 1 kB = 1,000 bytes. Produced by [`scripts/measure/bundles.mjs`](../../scripts/measure/bundles.mjs); per-file detail in the matching `.json`.",
  "",
  "| Library | Files | Raw kB | gzip -9 kB | Sent kB |",
  "|---|--:|--:|--:|--:|",
  ...results.map((r) => `| ${r.lib} | ${r.files} | ${kB(r.rawBytes)} | ${kB(r.gzip9Bytes)} | ${kB(r.transferBytes)} |`),
  "",
  ...results.flatMap((r) => [
    `## ${r.lib}`, "",
    "| File | Raw kB | gzip -9 kB | Sent kB |", "|---|--:|--:|--:|",
    ...r.list.map((f) => `| \`${short(f.url)}\` | ${kB(f.rawBytes)} | ${kB(f.gzip9Bytes)} | ${f.transferBytes == null ? "—" : kB(f.transferBytes)} |`),
    "",
  ]),
].join("\n");
await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, `bundles-${date}.json`), JSON.stringify(record, null, 2) + "\n");
await fs.writeFile(path.join(OUT, `bundles-${date}.md`), md);
console.log(`\nwrote docs/measurements/bundles-${date}.{json,md}`);
