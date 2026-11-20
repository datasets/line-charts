import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink, aggregate, toRows } from "../assets/js/data.js";

/* vega, vega-lite, vega-embed are UMD globals from the <script> tags.
 * A render fn just builds a spec object and calls embed(), which resolves
 * to the view's finalize() as the cleanup. The theme rides in as Vega-Lite
 * `config`, so the specs below carry only chart decisions. */
const embed = (host, spec, theme, opts = {}) =>
  window.vegaEmbed(host, { $schema: "https://vega.github.io/schema/vega-lite/v6.json", ...spec }, {
    actions: false,
    renderer: "svg",
    tooltip: { theme: theme.dark ? "dark" : "light" },
    ...opts,
    config: {
      background: "transparent",
      customFormatTypes: true,
      font: theme.fontSans,
      axis: {
        labelColor: theme.textSecondary, labelFontSize: 11, titleColor: theme.textSecondary,
        gridColor: theme.grid, domainColor: theme.baseline, tickColor: theme.baseline,
      },
      legend: { labelColor: theme.textSecondary, titleColor: theme.textSecondary, labelFontSize: 11 },
      text: { fill: theme.text, fontSize: 11 },
      range: { category: theme.palette },
      view: { stroke: null },
    },
  }).then((result) => () => result.finalize());

/* Custom tick formats: the specs hold JS formatters, and Vega's way to use
 * one is to register it as an expression function, then name it as an
 * axis `formatType`. */
const fmt = (name, f) => (window.vega.expressionFunction(name, f), name);

const H = 290;

mountDemo({
  meta: {
    name: "Vega-Lite",
    version: "6.5.0",
    bundleKB: 320,
    license: "BSD-3",
    tagline:
      "A high-level declarative grammar: charts are JSON specs, compiled to full Vega then to SVG/Canvas. Extremely little code for standard charts, and zoom, pan, crosshairs and hover highlighting are one-line <em>params</em> rather than event code. An annotated editorial chart is entirely possible but turns into a tall stack of layers, each with its own inline data, and anything per-datum that is not a channel (text alignment, offsets) goes through an expression.",
    docs: "https://vega.github.io/vega-lite/",
    cdn: "https://cdn.jsdelivr.net/npm/vega-lite@6.5.0/build/vega-lite.min.js",
    notes:
      "Loaded as three UMD scripts (~320 KB together). <code>embed()</code> is async and renders into the host itself. The spec objects below are exactly what you would save to a <code>.vl.json</code> file, apart from the inline data. Custom tick formats from the shared specs are registered once as Vega expression functions and named by <code>formatType</code>.",
    cardNotes: {
      hero: "A stack of layers, one per kind of annotation, each with its own inline data. Bands, zero rule, leaders (a <code>rule</code> with <code>x2</code>/<code>y2</code>), dots and multi-line text (an array of lines) are all native; per-callout alignment is not a channel, so it is an <code>expr</code> on the mark. No label layout: end labels are de-collided by hand (<code>spreadLabels</code>).",
      grid: "GRID_NOTE",
      npm: "NPM_NOTE",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      const w = host.clientWidth || 640, h = HERO.height(w);
      const pad = { top: 10, right: 76, bottom: 24, left: 44 };
      const [y0, y1] = HERO.y.domain;
      const color = (s) => ink(theme, s.color);
      const shown = HERO.callouts.filter((c) => c.rank <= HERO.calloutBudget(w))
        .map((c) => ({ ...c, ax: c.at[0], ay: c.at[1],
          align: { start: "left", middle: "center", end: "right" }[c.anchor],
          dx: { start: 4, middle: 0, end: -4 }[c.anchor], dy: { bottom: -4, top: 4, middle: 0 }[c.valign] }));
      // no label layout in Vega-Lite: de-collide in data units by hand
      const ends = spreadLabels(HERO.series.map((s) => {
        const value = oil.cols[s.key].y.at(-1);
        return { x: HERO.x.domain[1], v: value, text: HERO.endLabel(s, value), ink: color(s) };
      }), (13 * (y1 - y0)) / (h - pad.top - pad.bottom), HERO.y.domain);
      // every layer shares one x and one y scale, declared once (lines, zero rule)
      const x = { type: "temporal", title: null, scale: { type: "utc", domain: HERO.x.domain },
        axis: { values: HERO.x.ticks.map(Date.parse), formatType: fmt("heroX", HERO.x.format), grid: false } };
      const y = { type: "quantitative", title: null, scale: { domain: HERO.y.domain },
        axis: { values: HERO.y.ticks, formatType: fmt("heroY", HERO.y.format), grid: true } };
      const layer = (values, mark, encoding) => ({ data: { values }, mark, encoding });
      report({ points: oil.rows.length, step: "full" });
      return embed(host, {
        width: w - pad.left - pad.right, height: h - pad.top - pad.bottom,
        padding: pad, autosize: { type: "none" },
        layer: [
          // a rect with x/x2 and no y spans the full plot height
          layer(HERO.bands, { type: "rect", fill: theme.grid, opacity: 0.8 },
            { x: { field: "from", type: "temporal" }, x2: { field: "to" } }),
          layer([{ ...HERO.bandLabel, from: HERO.bands[HERO.bandLabel.band].from }],
            { type: "text", align: "left", fill: theme.muted, fontSize: 10 },
            { x: { field: "from", type: "temporal" }, y: { field: "y", type: "quantitative" }, text: { field: "text" } }),
          layer([HERO.zero], { type: "rule", stroke: theme.muted }, { y: { field: "y", ...y } }),
          // one line layer per series, in spec order (WTI under Brent)
          ...HERO.series.map((s) => ({
            data: { values: oil.rows }, transform: [{ filter: { field: "series", equal: s.key } }],
            mark: { type: "line", stroke: color(s), strokeWidth: s.width },
            encoding: { x: { field: "date", ...x }, y: { field: "price", type: "quantitative" } },
          })),
          layer(shown, { type: "rule", stroke: theme.textSecondary }, {
            x: { field: "date", type: "temporal" }, y: { field: "value", type: "quantitative" },
            x2: { field: "ax" }, y2: { field: "ay" } }),
          layer(shown, { type: "circle", size: 30, fill: theme.text, opacity: 1 },
            { x: { field: "date", type: "temporal" }, y: { field: "value", type: "quantitative" } }),
          // alignment and offsets are mark properties, not channels: per datum via expr
          layer(shown, { type: "text", align: { expr: "datum.align" }, baseline: { expr: "datum.valign" },
            dx: { expr: "datum.dx" }, dy: { expr: "datum.dy" } },
          { x: { field: "ax", type: "temporal" }, y: { field: "ay", type: "quantitative" }, text: { field: "lines" } }),
          layer(ends, { type: "text", align: "left", dx: 6, fontWeight: 600 }, {
            x: { field: "x", type: "temporal" }, y: { field: "v", type: "quantitative" },
            text: { field: "text" }, color: { field: "ink", type: "nominal", scale: null } }),
        ],
      }, theme);
    },

    grid(host, { grid }, { theme, report }) {
      // Vega's dataflow and canvas redraw everything on every zoom frame: full
      // paints in ~18 s, hourly ~8 s, both unusable to zoom, so the daily means
      const g = aggregate(grid, "day");
      const w = host.clientWidth || 640, h = GRID.height(w);
      const pad = { top: 30, right: 12, bottom: 24, left: 46 };
      const [rule, note] = GRID.events;
      const labels = GRID.series.map((s) => s.label);
      const mw = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const x = { field: "t", type: "temporal", title: null, scale: { type: "utc" } };
      report({ points: g.n * g.keys.length, step: g.step,
        note: `solar peak drawn ${mw(g.solar.reduce((a, b) => Math.max(a, b)))} of ${mw(GRID.peaks.solar.mw)}` });
      return embed(host, {
        width: w - pad.left - pad.right, height: h - pad.top - pad.bottom,
        padding: pad, autosize: { type: "none" },
        // wide rows {t, Gas, Coal, Wind, Solar}: folded long for the lines,
        // used as-is for the one-row-per-day tooltip
        data: { values: Array.from(g.t, (t, i) => Object.fromEntries([["t", t],
          ...GRID.series.map((s) => [s.label, g[s.key][i]])])) },
        layer: [
          {
            transform: [{ fold: labels, as: ["series", "mw"] }],
            mark: { type: "line", strokeWidth: 1, clip: true },
            encoding: {
              x: { ...x, axis: { grid: false, tickCount: 10 } },
              y: { field: "mw", type: "quantitative", title: null, scale: { domain: GRID.y.domain },
                axis: { values: GRID.y.ticks, formatType: fmt("gridY", GRID.y.format) } },
              color: { field: "series", type: "nominal", title: null, legend: { orient: "top", offset: 6 },
                scale: { domain: labels, range: GRID.series.map((s) => ink(theme, s.color)) } },
            },
            // zoom and pan on x: wheel + drag, double-click resets
            params: [{ name: "zoom", select: { type: "interval", encodings: ["x"] }, bind: "scales" }],
          },
          { // crosshair: a rule per timestamp, shown only at the nearest one
            mark: { type: "rule", stroke: theme.muted, clip: true },
            encoding: {
              x, opacity: { condition: { param: "hover", empty: false, value: 1 }, value: 0 },
              tooltip: [{ field: "t", type: "temporal", title: "Daily mean", timeUnit: "utcyearmonthdate", format: "%d %b %Y" },
                ...labels.map((field) => ({ field, type: "quantitative", title: `${field} (MW)`, format: ",.0f" }))],
            },
            params: [{ name: "hover", select: { type: "point", encodings: ["x"], nearest: true, on: "pointerover", clear: "pointerout" } }],
          },
          { data: { values: [rule] }, mark: { type: "rule", stroke: theme.textSecondary, strokeDash: [3, 3], clip: true },
            encoding: { x: { field: "date", type: "temporal" } } },
          { data: { values: [rule] }, mark: { type: "text", align: "right", baseline: "top", dx: -4, dy: 2, fontSize: 10.5, clip: true },
            encoding: { x: { field: "date", type: "temporal" }, y: { value: 0 }, text: { field: "label" } } },
          { data: { values: [note] }, mark: { type: "text", align: "left", fontSize: 10.5, clip: true },
            encoding: { x: { field: "date", type: "temporal" }, y: { field: "y", type: "quantitative" }, text: { field: "label" } } },
        ],
      }, theme, { renderer: "canvas" });
    },

    life(host, { life }, { theme }) {
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        width: Math.max((host.clientWidth || 480) - 90, 300), height: H,
        data: { values: life.long },
        mark: { type: "line", strokeWidth: 2, interpolate: "monotone", tooltip: true },
        encoding: {
          x: { field: "year", type: "quantitative", title: null, axis: { format: "d" } },
          y: { field: "value", type: "quantitative", scale: { domain: [35, 88] }, title: null },
          color: { field: "country", type: "nominal", title: null, scale: { domain: life.countries }, legend: { orient: "bottom-right" } },
        },
      }, theme);
      // null rows break the line by default (Vega-Lite's invalid-data handling)
    },
  },
});
