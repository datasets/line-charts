import { mountDemo } from "../assets/js/page.js";

/* vega, vega-lite, vega-embed are UMD globals from the <script> tags.
 * A render fn just builds a spec object and calls embed(). */
const embed = (host, spec, theme) =>
  window.vegaEmbed(host, spec, {
    actions: false,
    renderer: "svg",
    config: {
      background: "transparent",
      font: theme.fontSans,
      axis: {
        labelColor: theme.muted, titleColor: theme.textSecondary,
        gridColor: theme.grid, domainColor: theme.baseline, tickColor: theme.baseline,
      },
      legend: { labelColor: theme.textSecondary, titleColor: theme.textSecondary },
      range: { category: theme.palette },
      view: { stroke: null },
    },
  });

const W = 420, H = 290;

mountDemo({
  meta: {
    name: "Vega-Lite",
    version: "5.23.0",
    bundleKB: 320,
    license: "BSD-3",
    tagline:
      "A high-level declarative grammar: charts are JSON specs, compiled to full Vega then to SVG/Canvas. Extremely little code for standard charts, a real published spec you can lint and diff, and a clean escape hatch down to Vega. Interaction beyond the basics (custom tooltips, linked zoom) gets verbose. Payload is heavy (vega + vega-lite + vega-embed).",
    docs: "https://vega.github.io/vega-lite/",
    cdn: "https://cdn.jsdelivr.net/npm/vega-lite@5.23.0/build/vega-lite.min.js",
    notes:
      "Loaded as three UMD scripts (~320 KB together). <code>embed()</code> is async and renders into the host itself. The spec objects below are exactly what you would save to a <code>.vl.json</code> file.",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      const values = [
        ...co2.map((d) => ({ date: d.date.toISOString().slice(0, 10), ppm: d.ppm, kind: "monthly" })),
        ...co2.filter((d) => d.trend != null)
          .map((d) => ({ date: d.date.toISOString().slice(0, 10), ppm: d.trend, kind: "trend" })),
      ];
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: W, height: H, data: { values },
        encoding: {
          x: { field: "date", type: "temporal", title: null },
          y: { field: "ppm", type: "quantitative", scale: { zero: false }, title: null },
        },
        layer: [
          { mark: { type: "line", strokeWidth: 1, opacity: 0.35 },
            transform: [{ filter: "datum.kind == 'monthly'" }],
            encoding: { color: { value: theme.palette[0] } } },
          { mark: { type: "line", strokeWidth: 2 },
            transform: [{ filter: "datum.kind == 'trend'" }],
            encoding: { color: { value: theme.palette[0] } } },
          { mark: { type: "point", opacity: 0 }, params: [{ name: "hover", select: { type: "point", on: "pointerover", nearest: true } }],
            encoding: { tooltip: [
              { field: "date", type: "temporal", title: "Month" },
              { field: "ppm", type: "quantitative", format: ".2f", title: "ppm" }] } },
        ],
      }, theme);
    },

    energy(host, { energy }, { theme }) {
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: W, height: H, data: { values: energy.long },
        mark: { type: "line", strokeWidth: 2, point: false, interpolate: "monotone", tooltip: true },
        encoding: {
          x: { field: "year", type: "quantitative", title: null, axis: { format: "d" } },
          y: { field: "twh", type: "quantitative", title: null },
          color: { field: "source", type: "nominal", title: null,
            sort: energy.sources, legend: { orient: "top-left" } },
        },
      }, theme);
    },

    life(host, { life }, { theme }) {
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: W, height: H, data: { values: life.long.filter((d) => d.value != null) },
        mark: { type: "line", strokeWidth: 2, interpolate: "monotone", tooltip: true },
        encoding: {
          x: { field: "year", type: "quantitative", title: null, axis: { format: "d" } },
          y: { field: "value", type: "quantitative", scale: { domain: [35, 88] }, title: null },
          color: { field: "country", type: "nominal", title: null, legend: { orient: "bottom-right" } },
        },
      }, theme);
      // note: rows for missing years are dropped, so the line bridges the gap.
    },

    btc(host, { btc }, { theme }) {
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: W, height: H,
        data: { values: btc.map((d) => ({ date: d.date.toISOString().slice(0, 10), close: d.close })) },
        params: [{ name: "zoom", select: "interval", bind: "scales" }],
        mark: { type: "line", strokeWidth: 1.2, color: theme.palette[0], tooltip: true },
        encoding: {
          x: { field: "date", type: "temporal", title: null },
          y: { field: "close", type: "quantitative", title: null },
        },
      }, theme);
    },
  },
});
