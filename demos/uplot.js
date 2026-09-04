import { mountDemo } from "../assets/js/page.js";

/* `uPlot` is an IIFE global. Data is columnar: [xs, ...ys]. It wants a
 * pixel width, so each render reads host.clientWidth and returns
 * u.destroy as cleanup. Grid/axis colours come from the theme. */
const W = (host) => Math.max(host.clientWidth - 4, 320);

const axes = (theme, opts = {}) => [
  {
    stroke: theme.muted, size: 34,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.grid, width: 1 },
    ...opts.x,
  },
  {
    stroke: theme.muted, size: 50,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.grid, width: 1 },
    ...opts.y,
  },
];

// compact "$60,000" -> "60k" for axes with large values (kept out of
// the co2/energy/life snippets, which don't need it)
const compactK = (u, vals) => vals.map((v) => (Math.abs(v) >= 1000 ? v / 1000 + "k" : v));

mountDemo({
  meta: {
    name: "µPlot",
    version: "1.6.32",
    bundleKB: 18,
    license: "MIT",
    tagline:
      "The performance option: ~18 KB, renders and rescales hundreds of thousands of points on Canvas in a couple of milliseconds. Built-in cursor, legend, and drag-zoom. In return you get a spartan API, columnar data only, minimal styling hooks, and no grammar — anything fancy (curved lines, rich tooltips, annotations) is a plugin or a fork.",
    docs: "https://github.com/leeoniya/uPlot/tree/master/docs",
    cdn: "https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js",
    notes:
      "Drag horizontally on any chart to zoom; double-click to reset. Legend values track the cursor. The date axis uses uPlot's built-in time formatting (x values are unix seconds).",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      const data = [
        co2.map((d) => d.date.getTime() / 1000),
        co2.map((d) => d.ppm),
        co2.map((d) => d.trend),
      ];
      const u = new uPlot({
        width: W(host), height: 300, cursor: { y: false },
        scales: { y: { range: (u, min, max) => [min - 3, max + 3] } },
        series: [
          {},
          { label: "monthly", stroke: theme.palette[0] + "66", width: 1 },
          { label: "trend", stroke: theme.palette[0], width: 2 },
        ],
        axes: axes(theme),
      }, data, host);
      return () => u.destroy();
    },

    energy(host, { energy }, { theme }) {
      const data = [
        energy.wide.map((r) => r.year),
        ...energy.sources.map((s) => energy.wide.map((r) => r[s])),
      ];
      const u = new uPlot({
        width: W(host), height: 300,
        scales: { x: { time: false } },
        series: [
          { label: "year" },
          ...energy.sources.map((s, i) => ({ label: s, stroke: theme.palette[i], width: 2 })),
        ],
        axes: axes(theme, { x: { values: (u, v) => v.map((x) => String(x)) } }),
      }, data, host);
      return () => u.destroy();
    },

    life(host, { life }, { theme }) {
      const data = [
        life.years,
        ...life.countries.map((c) => life.wide.map((r) => r[c])),  // nulls → gaps
      ];
      const u = new uPlot({
        width: W(host), height: 300,
        scales: { x: { time: false }, y: { range: [35, 88] } },
        series: [
          { label: "year" },
          ...life.countries.map((c, i) => ({
            label: c, stroke: theme.palette[i], width: 2, spanGaps: false,
          })),
        ],
        axes: axes(theme, { x: { values: (u, v) => v.map((x) => String(x)) } }),
      }, data, host);
      return () => u.destroy();
    },

    btc(host, { btc }, { theme }) {
      const data = [btc.map((d) => d.date.getTime() / 1000), btc.map((d) => d.close)];
      const u = new uPlot({
        width: W(host), height: 300, cursor: { y: false },
        series: [{}, { label: "BTC-USD", stroke: theme.palette[0], width: 1 }],
        axes: axes(theme, { y: { size: 44, values: compactK } }),
      }, data, host);
      return () => u.destroy();
    },
  },
});
