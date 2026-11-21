/* Renders the front-page hero image: the oil chart as Apache ECharts draws it
 * (demos/echarts?chart=hero&bare=1), at 2x, in light and dark, as WebP.
 *
 *   cd scripts/measure && node hero-image.mjs
 * Writes assets/hero/hero-{light,dark}.webp. index.html's width and height
 * attributes match the capture (W by H css px, twice that in the file).
 *
 * Chromium encodes the WebP itself (canvas.toDataURL), so this needs no image
 * library. The lc-theme key in localStorage drives light and dark, the same
 * way the site's toggle does. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, serve } from "./lib.mjs";

const W = 700, H = 500; // narrow, so the callouts read at hero size; H only caps the height
const out = path.join(ROOT, "assets/hero");
mkdirSync(out, { recursive: true });
const server = await serve();
const browser = await chromium.launch({ channel: "chrome" });

// A PNG buffer to WebP at the given quality, via a throwaway page.
async function toWebp(png, quality = 0.86) {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(async ([b64, q]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", q);
  }, [png.toString("base64"), quality]);
  await page.close();
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H + 200 }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("lc-theme", t), theme);
  await page.goto(`${server.url}/demos/echarts?chart=hero&bare=1`, { waitUntil: "load" });
  await page.waitForFunction(() => /\d/.test(document.querySelector("[data-ms]")?.textContent || ""), null, { timeout: 60000 });
  await page.waitForTimeout(1500); // ECharts' entry animation
  const host = page.locator(".chart-host").first();
  const box = await host.boundingBox();
  const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: W, height: Math.min(box.height, H) } });
  const webp = await toWebp(png);
  writeFileSync(path.join(out, `hero-${theme}.webp`), webp);
  console.log(`hero-${theme}.webp: ${(webp.length / 1024).toFixed(0)} kB, ${W}x${Math.min(box.height, H)} css px`);
  await ctx.close();
}
await browser.close();
server.close();
