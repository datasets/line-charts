import { mountDemo } from "../assets/js/page.js";

/* `Plotly` is a UMD global. One shared layout/config factory keeps the
 * theme consistent; traces are plain {x, y, mode} objects. newPlot()
 * resolves when drawn — we return a promise of the cleanup fn. */
const layout = (theme, extra = {}) => ({
  height: 300,
  margin: { t: 12, r: 20, b: 34, l: 50 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: theme.fontSans, size: 11, color: theme.textSecondary },
  colorway: theme.palette,
  xaxis: { gridcolor: theme.grid, linecolor: theme.baseline, zeroline: false, automargin: true },
  yaxis: { gridcolor: theme.grid, linecolor: theme.baseline, zeroline: false, automargin: true },
  legend: { orientation: "h", y: 1.14, x: 0, font: { size: 10 } },
  hovermode: "x unified",
  ...extra,
});
const config = { displayModeBar: false, responsive: true };
const draw = (host, traces, lay) =>
  Plotly.newPlot(host, traces, lay, config).then(() => () => Plotly.purge(host));

mountDemo({
  meta: {
    name: "Plotly.js",
    version: "3.7.0",
    bundleKB: 1100,
    license: "MIT",
    tagline:
      "Batteries-included scientific charting. Zoom, pan, box-select, hover, spike lines, PNG export and a log-scale toggle all work with zero configuration. The trade-off is weight — the full dist is ~1 MB gzipped — and defaults that look more 'analysis tool' than 'publication'. Partial bundles cut the size if you build.",
    docs: "https://plotly.com/javascript/",
    cdn: "https://cdn.jsdelivr.net/npm/plotly.js-dist-min@3.7.0/plotly.min.js",
    notes:
      "Using the full <code>plotly.js-dist-min</code> for convenience. Drag on any chart to zoom, double-click to reset. The BTC card adds a log/linear toggle via <code>updatemenus</code> — a few lines of JSON.",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      const x = co2.map((d) => d.date);
      return draw(host, [
        { x, y: co2.map((d) => d.ppm), name: "monthly", mode: "lines",
          line: { color: theme.palette[0], width: 1 }, opacity: 0.4 },
        { x, y: co2.map((d) => d.trend), name: "trend", mode: "lines",
          line: { color: theme.palette[0], width: 2 } },
      ], layout(theme, { yaxis: { gridcolor: theme.grid, zeroline: false, autorange: true } }));
    },

    energy(host, { energy }, { theme }) {
      const traces = energy.sources.map((s) => ({
        x: energy.wide.map((r) => r.year),
        y: energy.wide.map((r) => r[s]),
        name: s, mode: "lines", line: { width: 2, shape: "spline" },
      }));
      return draw(host, traces, layout(theme));
    },

    life(host, { life }, { theme }) {
      const traces = life.countries.map((c) => ({
        x: life.wide.map((r) => r.year),
        y: life.wide.map((r) => r[c]),        // nulls kept + connectgaps:false → line breaks
        name: c, mode: "lines", line: { width: 2, shape: "spline" }, connectgaps: false,
      }));
      return draw(host, traces,
        layout(theme, { yaxis: { gridcolor: theme.grid, range: [35, 88], zeroline: false } }));
    },

    btc(host, { btc }, { theme }) {
      return draw(host, [
        { x: btc.map((d) => d.date), y: btc.map((d) => d.close), mode: "lines",
          line: { color: theme.palette[0], width: 1.2 }, name: "BTC-USD" },
      ], layout(theme, {
        showlegend: false,
        updatemenus: [{
          type: "buttons", direction: "left", x: 0, y: 1.16, showactive: true,
          buttons: [
            { label: "linear", method: "relayout", args: ["yaxis.type", "linear"] },
            { label: "log", method: "relayout", args: ["yaxis.type", "log"] },
          ],
        }],
      }));
    },
  },
});
