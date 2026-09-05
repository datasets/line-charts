import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

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

// hero charts size to the card and stay in a readable band of heights
const heroBox = (host) => {
  const w = host.clientWidth || 640;
  return { w, h: Math.max(280, Math.min(380, Math.round(w * 0.55))) };
};

mountDemo({
  meta: {
    name: "Vega-Lite",
    version: "5.23.0",
    bundleKB: 320,
    license: "BSD-3",
    tagline:
      "A high-level declarative grammar: charts are JSON specs, compiled to full Vega then to SVG/Canvas. Extremely little code for standard charts, and a real published spec you can lint and diff. An annotated editorial chart is entirely possible but turns into a tall stack of layers, each with its own inline datum — and there is no arrowhead primitive, so the leader line's head has to be faked with a triangle point mark.",
    docs: "https://vega.github.io/vega-lite/",
    cdn: "https://cdn.jsdelivr.net/npm/vega-lite@5.23.0/build/vega-lite.min.js",
    notes:
      "Loaded as three UMD scripts (~320 KB together). <code>embed()</code> is async and renders into the host itself. The spec objects below are exactly what you would save to a <code>.vl.json</code> file. In the hero spec, emphasis is done with three encoding scales (colour, size, opacity) over the same line layer rather than five separate layers.",
  },
  charts: {
    hero(host, { energy }, { theme }) {
      const { w, h } = heroBox(host);
      const { band, ref, note } = HERO;
      const order = [...HERO.context, ...HERO.emphasis];   // draw order = data order
      const ink = order.map((s) =>
        s === "wind" ? theme.palette[2] : s === "solar" ? theme.palette[3] : theme.muted);
      const colour = { field: "source", type: "nominal", legend: null,
        scale: { domain: order, range: ink } };
      const last = energy.wide[energy.wide.length - 1];
      // no label layout in Vega-Lite either: de-collide in TWh by hand
      const ends = spreadLabels(
        order.map((s) => ({ source: s, x: 2023, v: last[s] })),
        (13 * HERO.yMax) / (h - 38), [0, HERO.yMax]);
      /* Two quirks of layering, both of which cost an hour: layers do not
       * share a scale unless every one of them spells the same domain out
       * (a layer that omits it gets zero-baselined and drags the shared axis
       * with it), and the axis is merged from the *first* layer that asks for
       * one — so the axis config rides on the band, which happens to be the
       * layer that has to be drawn first anyway. */
      const x = (field, axis) => ({ field, type: "quantitative", title: null,
        scale: { domain: [1997, 2023], nice: false }, ...(axis ? { axis } : {}) });
      const y = (field, axis) => ({ field, type: "quantitative", title: null,
        scale: { domain: [0, HERO.yMax] }, ...(axis ? { axis } : {}) });
      const lyr = (values, mark, encoding) => ({ data: { values }, mark, encoding });
      const bySource = (range) => ({ field: "source", type: "nominal", legend: null,
        scale: { domain: order, range } });
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: w - 106, height: h - 38,
        padding: { left: 42, top: 14, right: 64, bottom: 24 },
        autosize: { type: "none" },
        layer: [
          // the band: a rect with x/x2 and no y spans the full plot height
          lyr([band], { type: "rect", fill: theme.grid, fillOpacity: 0.7 },
            { x: x("x0", { format: "d", grid: false, tickCount: 6 }), x2: { field: "x1" } }),
          lyr([{ x: (band.x0 + band.x1) / 2, y: band.labelY, label: band.label }],
            { type: "text", fill: theme.muted, fontSize: 10 },
            { x: x("x"), y: y("y", { grid: true, tickCount: 5 }), text: { field: "label" } }),
          lyr([ref], { type: "rule", stroke: theme.baseline, strokeDash: [4, 3] }, { y: y("y") }),
          lyr([ref], { type: "text", fill: theme.muted, fontSize: 10, align: "left" },
            { x: x("labelX"), y: y("labelY"), text: { field: "label" } }),
          {
            data: { values: order.flatMap((s) =>
              energy.wide.map((r) => ({ year: r.year, twh: r[s], source: s }))) },
            mark: { type: "line", interpolate: "monotone" },
            encoding: {
              x: x("year"),
              y: y("twh"),
              color: colour,
              size: bySource(order.map((s) => (HERO.emphasis.includes(s) ? 2.6 : 1.5))),
              opacity: bySource(order.map((s) => (s === "nuclear" ? 0.65 : 1))),
            },
          },
          // leader line: a rule, plus a triangle standing in for an arrowhead
          lyr([note], { type: "rule", stroke: theme.textSecondary },
            { x: x("x"), y: y("from"), y2: { field: "to" } }),
          lyr([note], { type: "point", shape: "triangle-down", filled: true,
            fill: theme.textSecondary, size: 34 }, { x: x("x"), y: y("to") }),
          lyr([note], { type: "text", fill: theme.text, fontSize: 11.5 },
            { x: x("x"), y: y("textY"), text: { field: "text" } }),
          lyr(ends, { type: "text", align: "left", dx: 5, fontSize: 11 },
            { x: x("x"), y: y("v"), text: { field: "source" }, color: colour,
              fontWeight: bySource(order.map((s) => (HERO.emphasis.includes(s) ? 600 : 400))) }),
        ],
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
  },
});
