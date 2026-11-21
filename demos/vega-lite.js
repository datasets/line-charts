import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink, aggregate, between, toRows } from "../assets/js/data.js";

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
    bundleKB: 283,
    bundleNote: "Vega 180 KB, Vega-Lite 82 KB, vega-embed 21 KB",
    license: "BSD-3",
    tagline:
      "A high-level declarative grammar: charts are JSON specs, compiled to full Vega then to SVG/Canvas. Extremely little code for standard charts, and zoom, pan, crosshairs and hover highlighting are one-line <em>params</em> rather than event code. An annotated editorial chart is entirely possible but turns into a tall stack of layers, each with its own inline data, and anything per-datum that is not a channel (text alignment, offsets) goes through an expression.",
    docs: "https://vega.github.io/vega-lite/",
    cdn: "https://cdn.jsdelivr.net/npm/vega-lite@6.5.0/build/vega-lite.min.js",
    notes:
      "Loaded as three UMD scripts (283 KB gzipped together). <code>embed()</code> is async and renders into the host itself. The spec objects below are exactly what you would save to a <code>.vl.json</code> file, apart from the inline data. Custom tick formats from the shared specs are registered once as Vega expression functions and named by <code>formatType</code>.",
    cardNotes: {
      hero: "A stack of layers, one per kind of annotation, each with its own inline data. Bands, zero rule, leaders (a <code>rule</code> with <code>x2</code>/<code>y2</code>), dots and multi-line text (an array of lines) are all native; per-callout alignment is not a channel, so it is an <code>expr</code> on the mark. No label layout: end labels are de-collided by hand (<code>spreadLabels</code>).",
      grid: "Zoom and pan are one param (<code>bind: \"scales\"</code>: wheel, drag, double-click resets) and the crosshair tooltip another (<code>nearest: true</code>), but there is no minimum span, so you can zoom past one week. No built-in decimation, and Vega re-runs and redraws everything per frame: full resolution painted in 17.8 s (twice), hourly 7.1–8.8 s, so this draws the daily means (0.35–0.44 s), which flatten the solar peak to 5,444 MW of a true 16,289.",
      npm: "Hover-highlighting a whole line is declarative: a nearest-point param that selects by <code>package</code>, used as a condition on opacity and width. The index is three transforms (<code>filter</code>, <code>window</code> <code>first_value</code>, <code>calculate</code>); small multiples are <code>facet</code> + <code>columns</code> with a shared log y. End labels still need de-collision by hand, outside the spec.",
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

    grid(host, { grid }, { theme, report, range }) {
      // Vega's dataflow and canvas redraw everything on every zoom frame: full
      // paints in ~18 s, hourly ~8 s, both unusable to zoom. So the daily step,
      // as a min–max band under the daily mean (the band keeps every extreme);
      // asked to open on a window, that window's half-hours at full resolution.
      const g = range ? between(grid, range) : aggregate(grid, "day");
      const daily = g.step === "day";
      const w = host.clientWidth || 640, h = GRID.height(w);
      const pad = { top: 30, right: 12, bottom: 24, left: 46 };
      const [rule, note] = GRID.events;
      const labels = GRID.series.map((s) => s.label);
      const mw = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const x = { field: "t", type: "temporal", title: null, scale: { type: "utc", domain: range } };
      const y = { type: "quantitative", title: null, scale: { domain: GRID.y.domain } };
      const color = { field: "series", type: "nominal", title: null, legend: { orient: "top", offset: 6 },
        scale: { domain: labels, range: GRID.series.map((s) => ink(theme, s.color)) } };
      report({ points: g.n * g.keys.length * (daily ? 3 : 1), step: range ? "full, this window only" : "day: mean + low–high band",
        note: `solar peak drawn ${mw(g.max.solar.reduce((a, b) => Math.max(a, b)))} of ${mw(GRID.peaks.solar.mw)}` });
      return embed(host, {
        width: w - pad.left - pad.right, height: h - pad.top - pad.bottom,
        padding: pad, autosize: { type: "none" },
        // long rows {t, series, mw, lo, hi}; pivoted wide for the one-row-per-time tooltip
        data: { values: GRID.series.flatMap((s) => Array.from(g.t, (t, i) =>
          ({ t, series: s.label, mw: g[s.key][i], lo: g.min[s.key][i], hi: g.max[s.key][i] }))) },
        layer: [
          ...(daily ? [{ mark: { type: "area", opacity: 0.3, clip: true },   // each day's low to high
            encoding: { x, y: { ...y, field: "lo" }, y2: { field: "hi" }, color } }] : []),
          {
            mark: { type: "line", strokeWidth: 1, clip: true },
            encoding: {
              x: { ...x, axis: { grid: false } },
              y: { ...y, field: "mw", axis: { values: GRID.y.ticks, formatType: fmt("gridY", GRID.y.format) } },
              color,
            },
            // zoom and pan on x: wheel + drag, double-click resets
            params: [{ name: "zoom", select: { type: "interval", encodings: ["x"] }, bind: "scales" }],
          },
          { // crosshair: a rule per timestamp, shown only at the nearest one
            transform: [{ pivot: "series", value: "mw", groupby: ["t"] }],
            mark: { type: "rule", stroke: theme.muted, clip: true },
            encoding: {
              x, opacity: { condition: { param: "hover", empty: false, value: 1 }, value: 0 },
              tooltip: [daily ? { field: "t", type: "temporal", title: "Daily mean", timeUnit: "utcyearmonthdate", format: "%d %b %Y" }
                : { field: "t", type: "temporal", title: "UTC", timeUnit: "utcyearmonthdatehoursminutes", format: "%d %b %Y %H:%M" },
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

    npm(host, { npm }, { theme, report }) {
      const w = host.clientWidth || 640;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      // greys first in the colour domain, so the seven draw on top
      const order = [...npm.keys.filter((k) => !seven.has(k)), ...seven.keys()];
      const color = { field: "package", type: "nominal", legend: null, scale: { domain: order,
        range: order.map((k) => ink(theme, seven.get(k)?.color ?? NPM.others.color)) } };
      // per-row style (scale: null = use the value as is) and display name
      const rows = npm.rows.map((d) => ({ ...d, name: seven.get(d.package)?.label ?? d.package,
        op: seven.has(d.package) ? 1 : NPM.others.opacity, sw: seven.has(d.package) ? 1.75 : NPM.others.width }));
      const x = { field: "week", type: "temporal", title: null, scale: { type: "utc" }, axis: { grid: false } };

      const lines = (out, indexed) => {
        const Y = indexed ? NPM.index : NPM.y, yField = indexed ? "index" : "downloads";
        const h = NPM.height(w), pad = { top: 8, right: 96, bottom: 24, left: 44 };
        const base = npm.weeks.findIndex((d) => +d === Date.parse(NPM.index.date));
        const last = (k) => (indexed ? (100 * npm.cols[k].at(-1)) / npm.cols[k][base] : npm.cols[k].at(-1));
        const [lo, hi] = Y.domain.map(Math.log10);
        const ends = spreadLabels([...seven.keys(), ...NPM.alsoLabel].map((k) => ({ k, value: last(k), v: Math.log10(last(k)) })),
          (12 * (hi - lo)) / (h - pad.top - pad.bottom), [lo, hi])
          .map((d) => ({ package: d.k, week: npm.weeks.at(-1), [yField]: 10 ** d.v,
            text: (indexed ? NPM.index : NPM).endLabel(seven.get(d.k) ?? { label: d.k }, d.value) }));
        const y = { field: yField, type: "quantitative", title: null, scale: { type: "log", domain: Y.domain },
          axis: { values: Y.ticks, formatType: fmt(indexed ? "npmIndex" : "npmY", Y.format) } };
        return embed(out, {
          width: w - pad.left - pad.right, height: h - pad.top - pad.bottom, padding: pad, autosize: { type: "none" },
          layer: [
            ...(indexed ? [{ data: { values: [{ v: 100 }] }, mark: { type: "rule", stroke: theme.muted },
              encoding: { y: { field: "v", type: "quantitative" } } }] : []),
            {
              data: { values: rows },
              // the index: from the base week on, each package ÷ its first value × 100
              transform: indexed ? [
                { filter: `datum.week >= toDate('${NPM.index.date}')` },
                { window: [{ op: "first_value", field: "downloads", as: "base" }], groupby: ["package"], sort: [{ field: "week" }] },
                { calculate: "100 * datum.downloads / datum.base", as: "index" },
              ] : [],
              layer: [
                { mark: { type: "line", clip: true },
                  encoding: { x, y, color,
                    // hover dims every line but the selected package
                    opacity: { condition: { param: "hl", field: "op", type: "quantitative", scale: null }, value: 0.12 },
                    strokeWidth: { condition: { param: "hl", empty: false, value: 2.5 }, field: "sw", type: "quantitative", scale: null } } },
                { mark: { type: "point", opacity: 0, clip: true },   // invisible: carries the nearest-point hover
                  params: [{ name: "hl", select: { type: "point", fields: ["package"], nearest: true, on: "pointerover", clear: "pointerout" } }],
                  encoding: { x, y, tooltip: [{ field: "name", title: "Package" }, { field: "week", type: "temporal", title: "Week of", format: "%d %b %Y" },
                    { field: yField, type: "quantitative", title: indexed ? "Index" : "Downloads", format: ",.0f" }] } },
              ],
            },
            { data: { values: ends }, mark: { type: "text", align: "left", dx: 6, fontWeight: 600 },
              encoding: { x, y: { field: yField, type: "quantitative" }, text: { field: "text" }, color } },
          ],
        }, theme);
      };

      const multiples = (out) => {
        const cols = NPM.multiples.columns(w), gap = 12, axisW = 40;
        return embed(out, {
          data: { values: rows.filter((d) => seven.has(d.package)) },
          facet: { field: "name", type: "nominal", sort: NPM.seven.map((s) => s.label), title: null,
            header: { labelAnchor: "start", labelFontWeight: 600, labelColor: theme.text, labelFontSize: 11, labelPadding: 2 } },
          columns: cols, spacing: { column: gap, row: 10 },
          spec: {
            width: Math.floor((w - axisW - 8 - gap * (cols - 1)) / cols), height: NPM.multiples.height - 22,
            mark: { type: "line", strokeWidth: 1.25, clip: true },
            encoding: { x: { ...x, axis: { tickCount: 3, grid: false } }, color,
              y: { field: "downloads", type: "quantitative", title: null, scale: { type: "log", domain: NPM.y.domain },
                axis: { values: NPM.y.ticks.filter((_, i) => i % 2 === 0), formatType: fmt("npmY", NPM.y.format) } } },
          },
        }, theme);
      };

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      let first;   // embed is async: resolve once the first view has drawn, so the badge is honest
      const cleanup = viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" }, (v, out) => {
        const shown = v === "multiples" ? multiples(out) : lines(out, v === "indexed");
        first ??= shown;
        return () => shown.then((finalize) => finalize());
      });
      return first.then(() => cleanup);
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
