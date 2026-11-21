import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink, aggregate } from "../assets/js/data.js";

/* `Chart` is a UMD global; chartjs-plugin-annotation and chartjs-plugin-zoom
 * register themselves, and chartjs-adapter-luxon gives the time scale its
 * dates. Every render makes a <canvas>, news up a Chart and returns
 * chart.destroy as the cleanup. */

/* The one shared helper: Chart.js is themed through its global defaults,
 * which every chart then inherits. Called at the top of each render. */
function themed(theme) {
  Chart.defaults.color = theme.muted;           // tick and legend text
  Chart.defaults.borderColor = theme.grid;      // grid lines and axis borders
  Chart.defaults.font.family = theme.fontSans;
  Chart.defaults.font.size = 11;
  Chart.defaults.animation = false;
  Chart.defaults.maintainAspectRatio = false;   // the parent div sets the height
  Chart.defaults.elements.point.radius = 0;
  Chart.defaults.scales.time.adapters.date = { zone: "UTC" };   // time axes in UTC, like the data
}

/* themed() changes globals, so on the full page the `defaults` card would
 * inherit this site's theme. Snapshot Chart.js's own values at load and put
 * them back before that render. Page plumbing, not chart code: the wrapper
 * keeps the render's own source (and line count) on the card. */
const D = Chart.defaults;
const pristine = [D.color, D.borderColor, D.font.family, D.font.size, D.animation,
  D.maintainAspectRatio, D.elements.point.radius, D.scales.time.adapters.date];
const unthemed = (render) => Object.assign((...args) => {
  [D.color, D.borderColor, D.font.family, D.font.size, D.animation,
    D.maintainAspectRatio, D.elements.point.radius, D.scales.time.adapters.date] = pristine;
  return render(...args);
}, { toString: () => render.toString() });

// responsive + maintainAspectRatio:false means the canvas fills its parent,
// so the parent is what has to carry the height (used by `life`)
function canvas(host, height = 300) {
  host.style.height = height + "px";
  const c = document.createElement("canvas");
  host.appendChild(c);
  return c;
}

mountDemo({
  meta: {
    name: "Chart.js",
    version: "4.6.1",
    bundleKB: 122,
    bundleNote: "Chart.js 71 KB plus Luxon and its adapter, hammer.js, and the annotation and zoom plugins",
    license: "MIT",
    tagline:
      "The popular default. Canvas-rendered, small, friendly config object, good docs, huge plugin ecosystem. Editorial furniture comes from chartjs-plugin-annotation and zoom/pan from chartjs-plugin-zoom; the built-in decimation plugin makes 1.25 million points interactive. What it lacks is any label layout and any data transform: end labels are de-collided by hand, the index is computed by hand, small multiples are seven charts.",
    docs: "https://www.chartjs.org/docs/latest/",
    cdn: "https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.js",
    notes:
      "Core build plus <code>luxon@3.7.2</code> + <code>chartjs-adapter-luxon@1.3.1</code> (time scale, in UTC), <code>chartjs-plugin-annotation@3.1.0</code> (bands, rules, callouts, end labels), <code>chartjs-plugin-zoom@2.2.0</code> with <code>hammerjs@2.0.8</code> (wheel zoom, drag pan). Theme colours and fonts go in once through <code>Chart.defaults</code> (a 10-line <code>themed()</code> helper outside the render functions).",
    cardNotes: {
      defaults: "A dot on every one of the ~20k points, a 1 s animation, a legend on top, a tooltip on hover and every year ticked and rotated. The time scale cannot work without a date adapter (luxon here). Grey text and black-alpha gridlines ignore dark mode.",
      hero: "Everything editorial is annotation-plugin config: <code>box</code> bands, a <code>line</code> zero rule, and per callout a <code>point</code>, a <code>line</code> leader and a multi-line <code>label</code> whose <code>position</code> maps straight onto the spec's anchor and valign. Exact ticks need an <code>afterBuildTicks</code> hook; the end labels are de-collided by hand (<code>spreadLabels</code>).",
      grid: "All 1.25M points go in; the built-in decimation plugin (min-max per pixel column) redraws only the visible range, so the solar peak survives and zooming in recovers every half-hour. Full resolution paints in about 85 ms (median of six runs at 900 px), so the ladder never had to step down; a redraw at full zoom-out costs ~30 ms. Wheel zoom, drag pan, double-click reset come from chartjs-plugin-zoom (with a one-week <code>minRange</code>); the crosshair is a 7-line inline plugin, and the tooltip reads all four series from the raw arrays, because after decimation the datasets no longer share an index.",
      npm: "Log scale, gaps and nearest-line hover are native; dimming the other 21 lines is a scriptable <code>borderColor</code> plus an <code>onHover</code> that re-renders. No transforms: the index is computed by hand, and small multiples are seven separate charts sharing one config.",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      themed(theme);
      const w = host.clientWidth || 640, h = HERO.height(w);
      const ms = (d) => new Date(d).getTime();
      const [y0, y1] = HERO.y.domain;
      const color = (s) => ink(theme, s.color);
      const shown = HERO.callouts.filter((c) => c.rank <= HERO.calloutBudget(w));
      // the annotation plugin places labels but never moves them apart, so
      // the end labels are de-collided first, in data units (13 px through y)
      const ends = spreadLabels(HERO.series.map((s) => ({ s, value: oil.cols[s.key].y.at(-1),
        v: oil.cols[s.key].y.at(-1) })), (13 * (y1 - y0)) / (h - 34), HERO.y.domain);
      const band = HERO.bands[HERO.bandLabel.band];
      const pos = { start: "start", middle: "center", end: "end", bottom: "end", top: "start" };
      const text = { color: theme.text, font: { size: 11 }, padding: 3 };
      const callout = (c) => [
        [c.id + "-leader", { type: "line", xMin: ms(c.date), yMin: c.value, xMax: ms(c.at[0]), yMax: c.at[1],
          borderColor: theme.textSecondary, borderWidth: 1 }],
        [c.id + "-dot", { type: "point", xValue: ms(c.date), yValue: c.value, radius: 3,
          backgroundColor: theme.text, borderWidth: 0 }],
        [c.id, { type: "label", xValue: ms(c.at[0]), yValue: c.at[1], content: c.lines, ...text,
          position: { x: pos[c.anchor], y: pos[c.valign] }, textAlign: pos[c.anchor] }],
      ];
      host.style.height = h + "px";
      const chart = new Chart(host.appendChild(document.createElement("canvas")), {
        type: "line",
        data: {   // Chart.js draws the first dataset on top: Brent first
          datasets: HERO.series.toReversed().map((s) => ({
            label: s.label, borderColor: color(s), borderWidth: s.width,
            data: Array.from(oil.cols[s.key].t, (x, i) => ({ x, y: oil.cols[s.key].y[i] })),
          })),
        },
        options: {
          parsing: false, normalized: true,
          layout: { padding: { top: 10, right: 78 } },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          scales: {
            x: { type: "time", min: ms(HERO.x.domain[0]), max: ms(HERO.x.domain[1]), grid: { display: false },
              afterBuildTicks: (s) => { s.ticks = HERO.x.ticks.map((d) => ({ value: ms(d) })); },
              ticks: { callback: HERO.x.format, maxRotation: 0 } },
            y: { min: y0, max: y1, border: { display: false },
              afterBuildTicks: (s) => { s.ticks = HERO.y.ticks.map((value) => ({ value })); },
              ticks: { callback: HERO.y.format } },
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: {
              title: ([it]) => new Date(it.parsed.x).toISOString().slice(0, 10),
              label: (it) => `${it.dataset.label} ${HERO.y.format(it.parsed.y)}` } },
            annotation: {
              clip: false,   // end labels sit in the right-hand padding
              annotations: Object.fromEntries([
                ...HERO.bands.map((b, i) => [`band${i}`, { type: "box", drawTime: "beforeDatasetsDraw",
                  xMin: ms(b.from), xMax: ms(b.to), backgroundColor: theme.grid + "cc", borderWidth: 0 }]),
                ["bandLabel", { type: "label", xValue: ms(band.from), yValue: HERO.bandLabel.y,
                  content: HERO.bandLabel.text, color: theme.muted, font: { size: 10 },
                  position: { x: "start", y: "center" }, padding: 0 }],
                ["zero", { type: "line", drawTime: "beforeDatasetsDraw", yMin: HERO.zero.y, yMax: HERO.zero.y,
                  borderColor: theme.muted, borderWidth: 1 }],
                ...shown.flatMap(callout),
                ...ends.map((d) => [d.s.key + "-end", { type: "label", xValue: ms(HERO.x.domain[1]), yValue: d.v,
                  content: HERO.endLabel(d.s, d.value), color: color(d.s), font: { size: 11, weight: 600 },
                  position: { x: "start", y: "center" }, xAdjust: 6, padding: 0 }]),
              ]),
            },
          },
        },
      });
      report({ points: oil.rows.length, step: "full" });
      return () => chart.destroy();
    },

    defaults: unthemed(function defaults(host, { defaults: oil }) {
      host.style.height = "400px";
      const chart = new Chart(host.appendChild(document.createElement("canvas")), {
        type: "line",
        data: { datasets: oil.keys.map((k) => ({
          label: k, data: Array.from(oil.cols[k].t, (x, i) => ({ x, y: oil.cols[k].y[i] })) })) },
        options: { maintainAspectRatio: false, scales: { x: { type: "time" } } },
      });
      return () => chart.destroy();
    }),
    grid(host, { grid }, { theme, report, range }) {
      themed(theme);
      // full resolution: decimation (below) keeps it to ~4 points per pixel column
      const g = aggregate(grid, "full");
      const w = host.clientWidth || 640;
      host.style.height = GRID.height(w) + "px";
      const fmt = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const [rule, note] = GRID.events;
      const crosshair = { id: "crosshair", afterDatasetsDraw(c) {
        const t = c.tooltip;
        if (!t.getActiveElements().length) return;
        const { ctx, chartArea: a } = c;
        ctx.save(); ctx.strokeStyle = theme.muted; ctx.beginPath();
        ctx.moveTo(t.caretX, a.top); ctx.lineTo(t.caretX, a.bottom); ctx.stroke(); ctx.restore();
      } };
      // after decimation the four datasets no longer share an index, so the
      // tooltip looks the nearest half-hour up in the raw arrays
      const row = (x) => Math.round((x - g.t[0]) / (g.t[1] - g.t[0]));
      const chart = new Chart(host.appendChild(document.createElement("canvas")), {
        type: "line",
        plugins: [crosshair],
        data: {
          datasets: GRID.series.map((s, i) => ({
            label: s.label, borderColor: ink(theme, s.color), backgroundColor: ink(theme, s.color),
            borderWidth: 1, order: -i,   // lowest order draws on top: solar last, on top
            data: Array.from(g.t, (x, j) => ({ x, y: g[s.key][j] })),
          })),
        },
        options: {
          parsing: false, normalized: true, spanGaps: true,
          interaction: { mode: "nearest", axis: "x", intersect: false },
          scales: {
            x: { type: "time", min: range?.[0] ?? g.t[0], max: range?.[1] ?? g.t.at(-1), grid: { display: false },
              ticks: { maxRotation: 0, autoSkipPadding: 16, major: { enabled: true } } },
            y: { min: GRID.y.domain[0], max: GRID.y.domain[1], border: { display: false },
              afterBuildTicks: (s) => { s.ticks = GRID.y.ticks.map((value) => ({ value })); },
              ticks: { callback: GRID.y.format } },
          },
          plugins: {
            decimation: { enabled: true, algorithm: "min-max" },
            legend: { align: "start", reverse: true, labels: { boxWidth: 12, boxHeight: 2, color: theme.textSecondary } },
            tooltip: { displayColors: false, filter: (it, i) => i === 0, callbacks: {
              title: ([it]) => new Date(g.t[row(it.parsed.x)]).toISOString().slice(0, 16).replace("T", " ") + " UTC",
              label: (it) => GRID.series.map((s) => `${s.label}  ${fmt(g[s.key][row(it.parsed.x)])}`) } },
            zoom: {
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
              pan: { enabled: true, mode: "x" },
              limits: { x: { min: g.t[0], max: g.t.at(-1), minRange: GRID.zoom.minSpanMs } },
            },
            annotation: { annotations: {
              rule: { type: "line", xMin: Date.parse(rule.date), xMax: Date.parse(rule.date),
                borderColor: theme.textSecondary, borderWidth: 1, borderDash: [3, 3] },
              ruleLabel: { type: "label", xValue: Date.parse(rule.date), yValue: GRID.y.domain[1],
                content: rule.label, position: { x: "end", y: "start" }, xAdjust: -4, padding: 2,
                color: theme.text, font: { size: 10.5 } },
              note: { type: "label", xValue: Date.parse(note.date), yValue: note.y, content: note.label,
                position: { x: "start", y: "center" }, padding: 0, color: theme.text, font: { size: 10.5 } },
            } },
          },
        },
      });
      chart.canvas.addEventListener("dblclick", () => chart.resetZoom());
      const solar = chart.data.datasets[GRID.series.findIndex((s) => s.key === "solar")].data;
      report({ points: g.n * g.keys.length, step: `${g.step}+min-max`,
        note: `solar peak drawn ${fmt(solar.reduce((m, p) => Math.max(m, p.y), 0))} of ${fmt(GRID.peaks.solar.mw)}` });
      return () => chart.destroy();
    },

    npm(host, { npm }, { theme, report }) {
      themed(theme);
      const w = host.clientWidth || 640;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      const name = (k) => seven.get(k)?.label ?? k;
      const color = (k) => ink(theme, seven.get(k)?.color ?? NPM.others.color);
      const fade = (c, a) => Chart.helpers.color(c).alpha(a).rgbString();
      // Chart.js draws the first dataset on top, so the seven go first
      const order = [...seven.keys(), ...npm.keys.filter((k) => !seven.has(k))];
      const i0 = npm.weeks.findIndex((d) => +d === Date.parse(NPM.index.date));
      // no transforms in Chart.js: the index is computed here, by hand
      const series = (k, indexed) => {
        const c = npm.cols[k], from = indexed ? i0 : 0, base = indexed ? c[i0] / 100 : 1;
        return Array.from(npm.t.subarray(from), (x, j) => ({ x, y: c[from + j] == null ? null : c[from + j] / base }));
      };
      const scales = (Y, ticks = Y.ticks) => ({
        x: { type: "time", min: Y === NPM.index ? npm.t[i0] : npm.t[0], max: npm.t.at(-1), grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
        y: { type: "logarithmic", min: Y.domain[0], max: Y.domain[1], border: { display: false },
          afterBuildTicks: (s) => { s.ticks = ticks.map((value) => ({ value })); },
          ticks: { callback: Y.format } },
      });

      const lines = (out, indexed) => {
        const Y = indexed ? NPM.index : NPM.y, h = NPM.height(w), [lo, hi] = Y.domain.map(Math.log10);
        out.style.height = h + "px";
        const data = order.map((k) => series(k, indexed));
        const ends = spreadLabels([...seven.keys(), ...NPM.alsoLabel].map((k) => {
          const value = data[order.indexOf(k)].at(-1).y;
          return { k, value, v: Math.log10(value) };
        }), (12 * (hi - lo)) / (h - 30), [lo, hi]);
        let hot = null;   // index of the hovered dataset
        const chart = new Chart(out.appendChild(document.createElement("canvas")), {
          type: "line",
          data: {
            datasets: order.map((k, i) => {
              const base = seven.has(k) ? color(k) : fade(color(k), NPM.others.opacity);
              return { label: name(k), data: data[i],
                borderColor: () => (hot === i ? (seven.has(k) ? color(k) : theme.text) : hot == null ? base : fade(base, 0.15)),
                borderWidth: () => (hot === i ? 2.5 : seven.has(k) ? 1.75 : NPM.others.width) };
            }),
          },
          options: {
            parsing: false, normalized: true,
            layout: { padding: { right: 96 } },
            interaction: { mode: "nearest", intersect: false },
            onHover: (e, [el]) => {
              if ((el?.datasetIndex ?? null) === hot) return;
              hot = el?.datasetIndex ?? null;
              chart.update("none");
            },
            scales: scales(Y),
            plugins: {
              legend: { display: false },
              tooltip: { displayColors: false, callbacks: {
                title: ([it]) => it.dataset.label,
                label: (it) => `${new Date(it.parsed.x).toISOString().slice(0, 10)}: ${
                  indexed ? Y.format(it.parsed.y) : it.parsed.y.toLocaleString("en") + " / week"}` } },
              annotation: { clip: false, annotations: Object.fromEntries([
                ...(indexed ? [["base", { type: "line", yMin: 100, yMax: 100, borderColor: theme.muted, borderWidth: 1 }]] : []),
                ...ends.map((d) => [d.k, { type: "label", xValue: npm.t.at(-1), yValue: 10 ** d.v,
                  content: (indexed ? NPM.index : NPM).endLabel(seven.get(d.k) ?? { label: d.k }, d.value),
                  color: seven.has(d.k) ? color(d.k) : theme.muted, font: { weight: 600 },
                  position: { x: "start", y: "center" }, xAdjust: 6, padding: 0 }]),
              ]) },
            },
          },
        });
        chart.canvas.addEventListener("mouseleave", () => { hot = null; chart.update("none"); });
        return () => chart.destroy();
      };

      // no facets in Chart.js: small multiples are seven charts in a CSS grid
      const multiples = (out) => {
        out.style.cssText = `display:grid;grid-template-columns:repeat(${NPM.multiples.columns(w)},minmax(0,1fr));gap:4px 8px`;
        const charts = NPM.seven.map((s) => {
          const cell = out.appendChild(document.createElement("div"));
          cell.style.height = NPM.multiples.height + "px";
          return new Chart(cell.appendChild(document.createElement("canvas")), {
            type: "line",
            data: { datasets: [{ label: s.label, data: series(s.key), borderColor: color(s.key), borderWidth: 1.25 }] },
            options: {
              parsing: false, normalized: true,
              interaction: { mode: "nearest", axis: "x", intersect: false },
              scales: scales(NPM.y, NPM.y.ticks.filter((_, i) => i % 2 === 0)),
              plugins: { legend: { display: false },
                title: { display: true, text: s.label, align: "start", color: theme.text, font: { weight: 600 }, padding: 2 } },
            },
          });
        });
        return () => charts.forEach((c) => c.destroy());
      };

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      return viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" },
        (v, out) => (v === "multiples" ? multiples(out) : lines(out, v === "indexed")));
    },

    life(host, { life }, { theme }) {
      themed(theme);
      const chart = new Chart(canvas(host), {
        type: "line",
        data: {
          labels: life.years,
          datasets: life.countries.map((c, i) => ({
            label: c, data: life.wide.map((r) => r[c]),   // nulls break the line by default
            borderColor: theme.palette[i], backgroundColor: theme.palette[i], borderWidth: 2, tension: 0.3,
          })),
        },
        options: {
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
            y: { min: 35, max: 88, border: { display: false } },
          },
          plugins: { legend: { labels: { color: theme.textSecondary, boxWidth: 12, font: { size: 10 } } } },
        },
      });
      return () => chart.destroy();
    },
  },
});
