/* Render timings for every library × chart, read from the demo pages' own
 * "rendered N ms" badge (render call → returned promise → two animation
 * frames; see assets/js/page.js).
 *
 *   node timings.mjs [--runs 7] [--dpr 1] [--width 900] [--height 700]
 *                    [--headless] [--channel chrome] [--only plotly,d3]
 *
 * One browser context per invocation, a fresh page per run. Pass 1 opens
 * every lib × chart once: that is the cold run (library code fetched from
 * jsDelivr and compiled for the first time) and is reported separately.
 * Passes 2..N are interleaved across all cells, so drift (thermals,
 * background work) spreads evenly, and give the warm median/min/max.
 * Headed by default: headless Chrome may fall back to software WebGL,
 * which would misrepresent Plotly's and ECharts' GPU paths. */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { serve, machine, today, median, arg, flag, LIBS, CHARTS, OUT } from "./lib.mjs";

const runs = Number(arg("runs", 7));
const dpr = Number(arg("dpr", 1));
const viewport = { width: Number(arg("width", 900)), height: Number(arg("height", 700)) };
const channel = arg("channel", "chrome");
const libs = arg("only", null)?.split(",") ?? LIBS;

const srv = await serve();
const browser = await chromium.launch({ channel, headless: flag("headless") });
const context = await browser.newContext({ viewport, deviceScaleFactor: dpr, colorScheme: "light" });

const parseMs = (s) => (s?.startsWith("<") ? 0.5 : parseFloat(s));

async function once(lib, key) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  try {
    await page.goto(`${srv.url}/demos/${lib}.html?chart=${key}&bare=1`, { waitUntil: "load" });
    await page.waitForFunction(() => {
      const b = document.querySelector("[data-ms]");
      return (b && b.textContent !== "—") || document.querySelector(".not-built, pre[style]");
    }, null, { timeout: 120_000 });
    return await page.evaluate(() => ({
      badge: document.querySelector("[data-ms]")?.textContent ?? null,
      points: document.querySelector("[data-points]")?.textContent.trim() || null,
      chartWidth: Math.round(document.querySelector(".chart-host > div")?.getBoundingClientRect().width ?? 0),
      notBuilt: !!document.querySelector(".not-built"),
      errors: [],
    })).then((r) => ({ ...r, ms: parseMs(r.badge), errors }));
  } finally { await page.close(); }
}

// what the browser reports for WebGL: software rendering would skew GPU paths
const probe = await context.newPage();
const gpu = await probe.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl");
  const ext = gl?.getExtension("WEBGL_debug_renderer_info");
  return gl ? { vendor: gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
                renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) } : null;
});
const userAgent = await probe.evaluate(() => navigator.userAgent);
const browserVersion = browser.version();
await probe.close();

const cells = libs.flatMap((lib) => CHARTS.map((key) => ({ lib, key, samples: [] })));
for (let pass = 0; pass < runs; pass++) {
  for (const c of cells) {
    const r = await once(c.lib, c.key);
    c.samples.push(r);
    process.stdout.write(`pass ${pass + 1}/${runs}  ${c.lib.padEnd(16)} ${c.key.padEnd(5)} ${r.badge}\n`);
  }
}
await browser.close().catch(() => {});
srv.close();

const results = cells.map(({ lib, key, samples }) => {
  const warm = samples.slice(1).map((s) => s.ms).filter(Number.isFinite);
  const last = samples.at(-1);
  return {
    lib, chart: key,
    coldMs: samples[0].ms,
    warm: warm.length ? { runs: warm.length, medianMs: median(warm), minMs: Math.min(...warm), maxMs: Math.max(...warm) } : null,
    samplesMs: samples.map((s) => s.ms),
    points: last.points, chartWidth: last.chartWidth, notBuilt: last.notBuilt,
    errors: [...new Set(samples.flatMap((s) => s.errors))],
  };
});

const date = today();
const record = {
  date, generatedAt: new Date().toISOString(),
  method: "Badge value from demos/<lib>.html?chart=<key>&bare=1: render call to returned promise plus two animation frames. Data loading excluded. Run 1 is cold (first fetch and compile of the library); median/min/max are over runs 2..N, interleaved across cells. One browser context, fresh page per run.",
  browser: { name: channel === "chrome" ? "Google Chrome" : `Chromium (${channel})`, version: browserVersion, userAgent, headless: flag("headless"), gpu },
  machine: machine(), viewport, dpr, runs,
  results,
};
// browser.version() is only valid before close; fill from the UA if needed
record.browser.version ||= userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? null;

const fmt = (ms) => (ms == null ? "—" : ms < 10 ? ms.toFixed(1) : Math.round(ms).toString());
const suffix = dpr === 1 ? "" : `-dpr${dpr}`;
const md = [
  `# Render timings, ${date}`,
  "",
  `Machine: ${record.machine.model ?? ""} ${record.machine.cpu}, ${record.machine.cores} cores, ${record.machine.ramGB} GB RAM, ${record.machine.os}.`,
  `Browser: ${record.browser.name} ${record.browser.version}${record.browser.headless ? " (headless)" : " (headed)"}; WebGL: ${gpu?.renderer ?? "none"}.`,
  `Viewport ${viewport.width}×${viewport.height}, DPR ${dpr}. ${runs} runs per cell: run 1 cold, median/min/max over the other ${runs - 1}.`,
  "",
  "Each value is the demo page's own badge: render call → returned promise → two animation frames, data loading excluded. Produced by [`scripts/measure/timings.mjs`](../../scripts/measure/timings.mjs); raw samples in the matching `.json`.",
  "",
  "## Warm median (ms)",
  "",
  `| Library | ${CHARTS.join(" | ")} |`,
  `|---|${CHARTS.map(() => "--:").join("|")}|`,
  ...libs.map((lib) => `| ${lib} | ${CHARTS.map((k) => { const r = results.find((x) => x.lib === lib && x.chart === k); return r.notBuilt ? "n/a" : fmt(r.warm?.medianMs); }).join(" | ")} |`),
  "",
  "## Every cell",
  "",
  "| Library | Chart | Cold | Median | Min | Max | Chart width | Points reported |",
  "|---|---|--:|--:|--:|--:|--:|---|",
  ...results.map((r) => `| ${r.lib} | ${r.chart} | ${fmt(r.coldMs)} | ${fmt(r.warm?.medianMs)} | ${fmt(r.warm?.minMs)} | ${fmt(r.warm?.maxMs)} | ${r.chartWidth}px | ${r.points ?? ""} |`),
  "",
  ...(results.some((r) => r.errors.length) ? ["## Console errors", "", ...results.filter((r) => r.errors.length).map((r) => `- ${r.lib} ${r.chart}: ${r.errors.join("; ")}`), ""] : []),
].join("\n");

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, `timings-${date}${suffix}.json`), JSON.stringify(record, null, 2) + "\n");
await fs.writeFile(path.join(OUT, `timings-${date}${suffix}.md`), md);
console.log(`\nwrote docs/measurements/timings-${date}${suffix}.{json,md}`);
