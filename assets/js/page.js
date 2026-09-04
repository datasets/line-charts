/* Demo-page framework. Each library's page calls mountDemo() with four
 * render functions — one per shared dataset — and gets an identical
 * layout: header, 2×2 card grid, a live "rendered in N ms" badge, and a
 * collapsible panel showing the exact source of each render function. */

import { loadAll, DATASETS } from "./data.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";

restoreTheme();

const KEYS = ["co2", "energy", "life", "btc"];

export async function mountDemo({ meta, charts }) {
  document.title = `${meta.name} — line-charts`;
  const root = document.getElementById("app");
  root.innerHTML = shell(meta);
  installThemeToggle(root.querySelector(".toggle"));

  const data = await loadAll();
  const hosts = {};
  const cleanups = {};

  for (const key of KEYS) {
    const card = root.querySelector(`[data-card="${key}"]`);
    card.querySelector(".src pre").textContent = sourceOf(charts[key]);
    hosts[key] = card.querySelector(".chart-host");
  }

  async function renderOne(key, ctx) {
    try {
      cleanups[key]?.();
    } catch {}
    const host = hosts[key];
    host.innerHTML = "";
    const badge = host.parentElement.querySelector(".metric b");
    const t0 = performance.now();
    try {
      // a render fn returns cleanup, or a promise of cleanup (async libs)
      let out = charts[key](host, data, { ...ctx, key });
      if (out && typeof out.then === "function") out = await out;
      cleanups[key] = typeof out === "function" ? out : null;
    } catch (err) {
      host.innerHTML = `<pre style="color:var(--series-2)">${String((err && err.stack) || err)}</pre>`;
      console.error(key, err);
    }
    const ms = performance.now() - t0;
    if (badge) badge.textContent = ms < 1 ? "<1 ms" : `${ms.toFixed(ms < 60 ? 1 : 0)} ms`;
  }

  function renderAll() {
    const ctx = { theme: theme(), datasets: DATASETS };
    KEYS.forEach((key) => renderOne(key, ctx));
  }

  renderAll();
  onThemeChange(renderAll);
  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(renderAll, 180);
  });
}

/* ---------------------------------------------------------------- */

function shell(meta) {
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
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:20px;margin-top:18px">
      ${KEYS.map(cardHTML).join("")}
    </div>
  </main>`;
}

function cardHTML(key) {
  const d = DATASETS[key];
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
    <details class="src"><summary>source</summary><pre></pre></details>
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

/* Small helpers shared by the hand-rolled demos (d3, uplot). */
export function fmtUSD(n) {
  return n >= 1000 ? "$" + Math.round(n).toLocaleString() : "$" + n.toFixed(0);
}
export function fmtYear(d) {
  return d instanceof Date ? String(d.getUTCFullYear()) : String(d);
}
