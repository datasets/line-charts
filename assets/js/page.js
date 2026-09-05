/* Demo-page framework. Each library's page calls mountDemo() with a render
 * function per shared dataset and gets an identical layout: header, stacked
 * cards, a live "rendered in N ms" badge, and the exact source of each render
 * function — expanded for the hero chart, collapsed for the rest. */

import { loadAll, DATASETS } from "./data.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";

restoreTheme();

const KEYS = ["hero", "life"];

/* `?chart=<key>` renders one dataset instead of all of them; `&bare=1` also
 * drops the page header and source panel. Together they give an embeddable
 * single chart — used by the front-page grid's iframes and the OG screenshots. */
function viewOptions() {
  const p = new URLSearchParams(location.search);
  const only = p.get("chart");
  return {
    keys: KEYS.includes(only) ? [only] : KEYS,
    bare: p.get("bare") === "1",
  };
}

export async function mountDemo({ meta, charts }) {
  document.title = `${meta.name} — line-charts`;
  const { keys, bare } = viewOptions();
  const root = document.getElementById("app");
  root.innerHTML = shell(meta, keys, bare);
  if (!bare) installThemeToggle(root.querySelector(".toggle"));

  const data = await loadAll();
  const hosts = {};
  const cleanups = {};

  for (const key of keys) {
    const card = root.querySelector(`[data-card="${key}"]`);
    const src = sourceOf(charts[key]);
    const lines = src.split("\n").length;
    card.querySelector(".src pre")?.replaceChildren(src);
    const count = card.querySelector("[data-lines]");
    if (count) count.textContent = lines;
    hosts[key] = card.querySelector(".chart-host");
    // the front-page grid embeds these pages and reads the measured count
    if (parent !== window) {
      parent.postMessage({ type: "lc:lines", lib: meta.name, key, lines }, "*");
    }
  }

  async function renderOne(key, ctx) {
    try {
      cleanups[key]?.();
    } catch {}
    const card = hosts[key];
    card.innerHTML = "";
    // render into a padding-free child, so a library that sizes itself from
    // host.clientWidth gets the content width and does not overflow the card
    const host = card.appendChild(document.createElement("div"));
    const badge = card.parentElement.querySelector(".metric b");
    const t0 = performance.now();
    try {
      // a render fn returns cleanup, or a promise of cleanup (async libs)
      let out = charts[key](host, data, { ...ctx, key });
      if (out && typeof out.then === "function") out = await out;
      cleanups[key] = typeof out === "function" ? out : null;
    } catch (err) {
      card.innerHTML = `<pre style="color:var(--series-2)">${String((err && err.stack) || err)}</pre>`;
      console.error(key, err);
    }
    const ms = performance.now() - t0;
    if (badge) badge.textContent = ms < 1 ? "<1 ms" : `${ms.toFixed(ms < 60 ? 1 : 0)} ms`;
  }

  function renderAll() {
    const ctx = { theme: theme(), datasets: DATASETS };
    keys.forEach((key) => renderOne(key, ctx));
  }

  renderAll();
  onThemeChange(renderAll);
  // an embedded page reports its own height so the grid can size the iframe
  if (bare && parent !== window) {
    const post = () =>
      parent.postMessage({ type: "lc:size", height: Math.ceil(root.getBoundingClientRect().height) }, "*");
    new ResizeObserver(post).observe(root);
    post();
  }
  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(renderAll, 180);
  });
}

/* ---------------------------------------------------------------- */

function shell(meta, keys, bare) {
  if (bare) {
    return `<main style="padding:0">
      ${keys.map((k) => cardHTML(k, true)).join("")}
    </main>`;
  }
  return `
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <a href="../index.html" style="font-size:13px;color:var(--text-secondary)">← all libraries</a>
      <button class="toggle"></button>
    </div>
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">${meta.name}
      <span style="font-size:14px;color:var(--text-muted);font-weight:400">v${meta.version}</span>
    </h1>
    <p style="margin:0;max-width:70ch;color:var(--text-secondary);font-size:14px">${meta.tagline}</p>
    <p style="margin:10px 0 0;font-size:12.5px;color:var(--text-muted)">
      ~${meta.bundleKB} KB min+gzip
      &nbsp;·&nbsp; <a href="${meta.docs}" target="_blank" rel="noopener">docs</a>
      &nbsp;·&nbsp; <a href="${meta.cdn}" target="_blank" rel="noopener">CDN build</a>
      ${meta.license ? `&nbsp;·&nbsp; ${meta.license}` : ""}
    </p>
    ${meta.notes ? `<p style="margin:8px 0 0;font-size:12.5px;color:var(--text-secondary);max-width:75ch">${meta.notes}</p>` : ""}
  </header>
  <main class="wrap" style="padding-bottom:60px">
    <div style="display:grid;gap:22px;margin-top:18px">
      ${keys.map((k) => cardHTML(k)).join("")}
    </div>
  </main>`;
}

function cardHTML(key, bare = false) {
  const d = DATASETS[key];
  const hero = key === "hero";
  /* Embedded in the front-page grid the card is only the chart: the grid
   * already says which library and which dataset this is. The timing badge
   * stays, because seeing it per cell is half the point of a live grid. */
  if (bare) {
    return `
    <section class="card" data-card="${key}" style="border:0;background:transparent">
      <div class="chart-host" style="min-height:0;padding:4px 10px 0"></div>
      <p style="margin:2px 10px 6px;text-align:right"><span class="metric">rendered <b>—</b></span></p>
    </section>`;
  }
  // the hero chart's source is the point of the site, so it is open by
  // default with its measured line count in the header; the rest disclose.
  const source = hero
    ? `<div class="src src--open">
         <div class="src__head">source · <b data-lines>—</b> lines</div><pre></pre>
       </div>`
    : `<details class="src"><summary>source</summary><pre></pre></details>`;
  return `
  <section class="card" data-card="${key}">
    <div class="card__head">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <h2 class="card__title">${d.title}</h2>
        <span class="metric">rendered <b>—</b></span>
      </div>
      <p class="card__desc">${d.desc}</p>
      <p class="card__desc" style="color:var(--text-muted)"><b style="font-weight:600">Stresses:</b> ${d.stress}</p>
    </div>
    <div class="chart-host"></div>
    ${bare ? "" : source}
  </section>`;
}

/* Pretty-print a render function's source: strip the common indent. */
function sourceOf(fn) {
  let s = fn.toString().replace(/\t/g, "  ");
  const body = s.split("\n");
  const indents = body
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => l.match(/^ */)[0].length);
  const min = Math.min(...indents, Infinity);
  return body
    .map((l, i) => (i === 0 ? l : l.slice(min)))
    .join("\n")
    .trim();
}

/* Pull a set of end-of-line label positions apart so none of them overlap.
 * Library-agnostic on purpose: it takes and returns plain numbers, so a demo
 * can hand it pixels (d3, uPlot, Chart.js) or data units (Plotly, Plot,
 * Vega-Lite) as long as it is consistent. Shared because every library that
 * lacks automatic label layout would otherwise need the same twelve lines,
 * and that duplication would flatter none of them. Counted separately from
 * the per-library hero line counts — see docs/BUILD-NOTES.md.
 *
 *   items  [{ v, ...rest }]  desired positions, any order
 *   gap    minimum distance between two adjacent positions
 *   range  [lo, hi] to stay inside
 * Returns the same objects, sorted ascending, with `v` adjusted. */
export function spreadLabels(items, gap, [lo, hi]) {
  const out = [...items].sort((a, b) => a.v - b.v);
  for (let i = 1; i < out.length; i++) {
    if (out[i].v - out[i - 1].v < gap) out[i] = { ...out[i], v: out[i - 1].v + gap };
  }
  // if pushing up ran past the top, push the whole stack back down
  const over = out.length ? out[out.length - 1].v - hi : 0;
  if (over > 0) out.forEach((d, i) => (out[i] = { ...d, v: d.v - over }));
  for (let i = 0; i < out.length; i++) {
    if (out[i].v < lo) out[i] = { ...out[i], v: lo + i * gap };
  }
  return out;
}
