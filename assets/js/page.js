/* Demo-page framework. Each library's page calls mountDemo() with a render
 * function per chart key and gets an identical layout: header, stacked
 * cards, a live "rendered in N ms" badge, an optional "N points · step"
 * line, and the exact source of each render function.
 *
 * A render function is  (host, data, ctx) => cleanup | Promise<cleanup> | void
 *   host  an empty div at the card's content width
 *   data  { [key]: dataset }  — only this chart's dataset, loaded lazily
 *   ctx   { theme, datasets, key, report }
 *         report({ points, step, note }) puts "rendered N points (step)" on
 *         the card; for grid it is required (see docs/TESTS.md).
 * The badge stops when the returned promise resolves AND two animation
 * frames have passed, i.e. after the library has actually painted. */

import { loadFor, DATASETS } from "./data.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";

restoreTheme();

export const KEYS = ["hero", "grid", "npm", "life"];

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

const painted = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export async function mountDemo({ meta, charts }) {
  document.title = `${meta.name} — line-charts`;
  const { keys, bare } = viewOptions();
  const root = document.getElementById("app");
  root.innerHTML = shell(meta, keys, bare);
  if (!bare) installThemeToggle(root.querySelector(".toggle"));
  const embedded = parent !== window;
  const tell = (msg) => embedded && parent.postMessage({ lib: meta.name, ...msg }, "*");

  const hosts = {}, cleanups = {}, generation = {}, data = {}, visible = {};

  for (const key of keys) {
    const card = root.querySelector(`[data-card="${key}"]`);
    hosts[key] = card.querySelector(".chart-host");
    if (typeof charts[key] !== "function") {
      // not built yet in this library: a tidy card, no line count, no error
      hosts[key].innerHTML = notBuiltHTML(meta.name, key);
      card.querySelector(".src")?.remove();
      card.querySelectorAll(".metric").forEach((m) => m.remove());
      card.querySelector("details")?.setAttribute("open", "");   // show what it will be judged on
      tell({ type: "lc:lines", key, lines: null });
      tell({ type: "lc:rendered", key, ms: null });
      continue;
    }
    const src = sourceOf(charts[key]);
    const lines = src.split("\n").length;
    card.querySelector(".src pre")?.replaceChildren(src);
    card.querySelectorAll("[data-lines]").forEach((el) => (el.textContent = lines));
    // the front-page grid embeds these pages and reads the measured count
    tell({ type: "lc:lines", key, lines });
  }
  const built = keys.filter((k) => typeof charts[k] === "function");

  async function renderOne(key) {
    const gen = (generation[key] = (generation[key] || 0) + 1);
    try { cleanups[key]?.(); } catch {}
    cleanups[key] = null;
    const card = hosts[key];
    const metric = card.parentElement.querySelector("[data-ms]");
    const pts = card.parentElement.querySelector("[data-points]");
    if (!data[key]) {
      card.innerHTML = `<p class="card__desc" style="padding:18px 0;color:var(--text-muted)">loading data…</p>`;
      try {
        const tl = performance.now();
        data[key] = await loadFor(key);
        if (pts) pts.title = `data loaded and parsed in ${Math.round(performance.now() - tl)} ms`;
      } catch (err) {
        card.innerHTML = errorHTML(err);
        console.error(key, err);
        return;
      }
      if (gen !== generation[key]) return;
    }
    card.innerHTML = "";
    // render into a padding-free child, so a library that sizes itself from
    // host.clientWidth gets the content width and does not overflow the card
    const host = card.appendChild(document.createElement("div"));
    let reported = null;
    const report = (r) => { reported = r; };
    const ctx = { theme: theme(), datasets: DATASETS, key, report };
    const t0 = performance.now();
    try {
      let out = charts[key](host, { [key]: data[key] }, ctx);
      if (out && typeof out.then === "function") out = await out;
      const cleanup = typeof out === "function" ? out : null;
      if (gen !== generation[key]) { try { cleanup?.(); } catch {} return; }
      cleanups[key] = cleanup;
      await painted();
      if (gen !== generation[key]) return;
    } catch (err) {
      if (gen !== generation[key]) return;
      card.innerHTML = errorHTML(err);
      console.error(key, err);
    }
    const ms = performance.now() - t0;
    if (metric) metric.textContent = ms < 1 ? "<1 ms" : `${ms.toFixed(ms < 60 ? 1 : 0)} ms`;
    if (pts) pts.innerHTML = reported ? pointsHTML(reported) : "";
    tell({ type: "lc:rendered", key, ms, ...(reported || {}) });
  }

  const renderVisible = () => built.forEach((k) => visible[k] && renderOne(k));

  /* Render a card when it first scrolls near the viewport, so the full page
   * does not fetch the 5.5 MB grid file before you get there. */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const key = e.target.dataset.card;
      if (e.isIntersecting && !visible[key]) { visible[key] = true; renderOne(key); }
    }
  }, { rootMargin: "300px 0px" });
  built.forEach((k) => io.observe(root.querySelector(`[data-card="${k}"]`)));

  onThemeChange(renderVisible);
  // an embedded page reports its own height so the grid can size the iframe
  if (bare && embedded) {
    const post = () => tell({ type: "lc:size", height: Math.ceil(root.getBoundingClientRect().height) });
    new ResizeObserver(post).observe(root);
    post();
  }
  let t, lastW = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === lastW) return;   // height-only changes (mobile URL bar) don't re-render
    lastW = innerWidth;
    clearTimeout(t);
    t = setTimeout(renderVisible, 180);
  });
}

/* ---------------------------------------------------------------- */

const errorHTML = (err) =>
  `<pre style="color:var(--series-2);white-space:pre-wrap;font-size:11px">${String((err && err.stack) || err)}</pre>`;

const notBuiltHTML = (lib, key) =>
  `<div class="not-built" style="margin:10px 0 14px;padding:28px 16px;border:1px dashed var(--border);border-radius:10px;text-align:center;color:var(--text-muted);font-size:12.5px">
     Not built yet in ${lib}: <b style="color:var(--text-secondary);font-weight:600">${DATASETS[key].label}</b>.
   </div>`;

const pointsHTML = ({ points, step, note }) =>
  [
    points != null ? `<b>${Number(points).toLocaleString("en")}</b> points` : "",
    step ? `step: <b>${step}</b>` : "",
    note || "",
  ].filter(Boolean).join(" · ");

function shell(meta, keys, bare) {
  if (bare) {
    return `<main style="padding:0">
      ${keys.map((k) => cardHTML(k, true)).join("")}
    </main>`;
  }
  return `
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="display:flex;gap:14px;align-items:center">
        <a href="../" style="font-size:13px;color:var(--text-secondary)">← all libraries</a>
        <a href="../verdict" style="font-size:13px;color:var(--text-secondary)">Verdict</a>
        <a href="../method" style="font-size:13px;color:var(--text-secondary)">Method</a>
        <a href="../changelog" style="font-size:13px;color:var(--text-secondary)">Changelog</a>
      </div>
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
      ${keys.map((k) => cardHTML(k, false, meta)).join("")}
    </div>
  </main>`;
}

function cardHTML(key, bare = false, meta = {}) {
  const d = DATASETS[key];
  const hero = key === "hero";
  const points = `<span class="metric" data-points style="display:block;margin-right:auto"></span>`;
  /* Embedded in the front-page grid the card is only the chart: the grid
   * already says which library and which dataset this is. The timing badge
   * and the points/step line stay, because seeing them per cell is half the
   * point of a live grid. */
  if (bare) {
    return `
    <section class="card" data-card="${key}" style="border:0;background:transparent">
      <div class="chart-host" style="min-height:0;padding:4px 10px 0"></div>
      <p style="margin:2px 10px 6px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
        ${points}<span class="metric">rendered <b data-ms>—</b></span></p>
    </section>`;
  }
  // the hero chart's source is the point of the site, so it is open by
  // default with its measured line count in the header; the rest disclose.
  const source = hero
    ? `<div class="src src--open">
         <div class="src__head">source · <b data-lines>—</b> lines</div><pre></pre>
       </div>`
    : `<details class="src"><summary>source · <span data-lines>—</span> lines</summary><pre></pre></details>`;
  const note = meta.cardNotes?.[key];
  return `
  <section class="card" data-card="${key}">
    <div class="card__head">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <h2 class="card__title">${d.title}</h2>
        <span class="metric" style="white-space:nowrap">rendered <b data-ms>—</b></span>
      </div>
      <p class="card__desc">${d.desc}</p>
      <details class="card__desc" style="color:var(--text-muted)"><summary style="cursor:pointer">Judged on ${d.requirements.length} requirement${d.requirements.length > 1 ? "s" : ""}</summary>
        <ol style="margin:4px 0 2px;padding-left:20px">${d.requirements.map((r) => `<li>${r}</li>`).join("")}</ol>
      </details>
      ${note ? `<p class="card__desc" style="margin-top:6px"><b style="font-weight:600">${meta.name}:</b> ${note}</p>` : ""}
      <p class="card__desc" style="margin-top:4px;display:flex">${points}</p>
    </div>
    <div class="chart-host"></div>
    ${source}
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

/* A segmented control for switching a chart's view (the npm test: all /
 * indexed / small multiples). Shared chrome, not chart code, so every
 * library gets the same one and none pays for it in its line count.
 *   views     { value: "button text" }
 *   onSelect  (value, out) => void|cleanup — fill `out`, a fresh empty div
 * Returns a cleanup that runs the current view's cleanup. */
export function viewSwitch(host, views, onSelect, initial = Object.keys(views)[0]) {
  const bar = host.appendChild(document.createElement("div"));
  bar.className = "seg";
  bar.setAttribute("role", "group");
  bar.innerHTML = Object.entries(views)
    .map(([v, t]) => `<button type="button" value="${v}">${t}</button>`).join("");
  const out = host.appendChild(document.createElement("div"));
  let cleanup = null;
  const select = (v) => {
    try { cleanup?.(); } catch {}
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.value === v)));
    out.replaceChildren();
    const r = onSelect(v, out);
    cleanup = typeof r === "function" ? r : null;
  };
  bar.addEventListener("click", (e) => e.target.value && select(e.target.value));
  select(initial);
  return () => { try { cleanup?.(); } catch {} };
}
