import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

/* vega, vega-lite, vega-embed are UMD globals from the <script> tags.
 * A render fn just builds a spec object and calls embed(), which resolves
 * to the view's finalize() as the cleanup. */
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
  }).then((result) => () => result.finalize());

const H = 290;

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
      "A high-level declarative grammar: charts are JSON specs, compiled to full Vega then to SVG/Canvas. Extremely little code for standard charts, and a real published spec you can lint and diff. An annotated editorial chart is entirely possible but turns into a tall stack of layers, each with its own inline datum — and there is no arrow mark, so the leader line's head is a triangle point mark, rotated with its <code>angle</code> property.",
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
        order.map((s) => ({ source: s, x: 2023, v: last[s],
          weight: HERO.emphasis.includes(s) ? 600 : 400 })),
        (13 * HERO.yMax) / (h - 38), [0, HERO.yMax]);
      /* Layers share one x and one y scale. The helpers below give every
       * layer the same type, domain and title so no layer can zero-baseline
       * the shared scale, and the axis config rides on the band layer,
       * which has to be drawn first anyway. */
      const x = (field, axis) => ({ field, type: "quantitative", title: null,
        scale: { domain: [1997, 2023], nice: false }, ...(axis ? { axis } : {}) });
      const y = (field, axis) => ({ field, type: "quantitative", title: null,
        scale: { domain: [0, HERO.yMax] }, ...(axis ? { axis } : {}) });
      const lyr = (values, mark, encoding) => ({ data: { values }, mark, encoding });
      // a discrete size/opacity scale defaults to "point", which reads only the
      // first two range values; "ordinal" maps each series to its own value
      const bySource = (range) => ({ field: "source", type: "ordinal", legend: null,
        scale: { type: "ordinal", domain: order, range } });
      return embed(host, {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
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
          // leader line: a rule, and a point shaped as a triangle for the head,
          // rotated to point along it (angle is clockwise from straight up)
          lyr([note], { type: "rule", stroke: theme.textSecondary },
            { x: x("x"), y: y("from"), y2: { field: "to" } }),
          lyr([note], { type: "point", shape: "triangle", angle: 180, filled: true,
            fill: theme.textSecondary, size: 34, opacity: 1 }, { x: x("x"), y: y("to") }),
          lyr([note], { type: "text", fill: theme.text, fontSize: 11.5 },
            { x: x("x"), y: y("textY"), text: { field: "text" } }),
          lyr(ends, { type: "text", align: "left", dx: 5, fontSize: 11,
            fontWeight: { expr: "datum.weight" } },        // weight is not a channel
            { x: x("x"), y: y("v"), text: { field: "source" }, color: colour }),
        ],
      }, theme);
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
