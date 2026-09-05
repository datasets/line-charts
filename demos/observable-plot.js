import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm";
import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

/* One helper: apply the shared theme to every plot via Plot's `style`
 * option and a themed colour range. Everything else is the grammar. */
const base = (theme, opts) =>
  Plot.plot({
    width: 440,
    height: 300,
    marginLeft: 46,
    marginRight: 16,
    style: { background: "transparent", color: theme.text, fontSize: "11px" },
    x: { label: null, grid: false, tickFormat: opts.year ? "d" : undefined },
    y: { label: null, grid: true },
    color: { range: theme.palette, legend: opts.legend || false },
    ...opts,
  });

// hero charts size to the card and stay in a readable band of heights
const heroBox = (host) => {
  const w = host.clientWidth || 640;
  return { w, h: Math.max(280, Math.min(380, Math.round(w * 0.55))) };
};

mountDemo({
  meta: {
    name: "Observable Plot",
    version: "0.6.17",
    bundleKB: 65,
    license: "ISC",
    tagline:
      "A concise grammar of graphics from D3's author. You describe marks (line, text, rect, arrow…) and channels (x, y, stroke) and Plot works out scales and axes. Annotation is not a separate subsystem — a leader line is just an arrow mark and a label is just a text mark — which makes an editorial chart unusually cheap, right up until you need two labels not to overlap, which Plot will not do for you.",
    docs: "https://observablehq.com/plot/",
    cdn: "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm",
    notes:
      "<code>Plot.plot()</code> returns a detached SVG/figure node — you append it yourself. The hero chart's furniture is all marks: <code>Plot.rect</code> for the band, <code>Plot.ruleY</code> for the reference line, <code>Plot.arrow</code> for the leader, <code>Plot.text</code> for every label. Mark order is z-order, so the band simply goes first.",
  },
  charts: {
    hero(host, { energy }, { theme }) {
      const { w, h } = heroBox(host);
      const { band, ref, note } = HERO;
      const ink = (s) => (s === "wind" ? theme.palette[2] : s === "solar" ? theme.palette[3] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const last = energy.wide[energy.wide.length - 1];
      const rows = (s) => energy.wide.map((r) => ({ year: r.year, twh: r[s], source: s }));
      // Plot has no label layout, so end labels are de-collided by hand, in
      // TWh (13px of gap converted through the y scale)
      const ends = spreadLabels(
        [...HERO.context, ...HERO.emphasis].map((s) => ({ s, v: last[s] })),
        (13 * HERO.yMax) / (h - 38),
        [0, HERO.yMax]
      );
      const line = (s) =>
        Plot.lineY(rows(s), { x: "year", y: "twh", curve: "monotone-x",
          stroke: ink(s), strokeWidth: lead(s) ? 2.6 : 1.5,
          strokeOpacity: s === "nuclear" ? 0.65 : 1 });
      host.append(
        Plot.plot({
          width: w, height: h,
          marginTop: 14, marginRight: 64, marginBottom: 24, marginLeft: 42,
          style: { background: "transparent", color: theme.text, fontSize: "11px" },
          x: { label: null, grid: false, tickFormat: "d", domain: [1997, 2023] },
          y: { label: null, grid: true, domain: [0, HERO.yMax] },
          marks: [
            Plot.rect([band], { x1: "x0", x2: "x1", y1: 0, y2: HERO.yMax,   // event band
              fill: theme.grid, fillOpacity: 0.7 }),
            Plot.text([band], { x: (d) => (d.x0 + d.x1) / 2, y: "labelY", text: "label",
              fill: theme.muted, fontSize: 10 }),
            Plot.ruleY([ref.y], { stroke: theme.baseline, strokeDasharray: "4 3" }),
            Plot.text([ref], { x: "labelX", y: "labelY", text: "label", textAnchor: "start",
              fill: theme.muted, fontSize: 10 }),
            ...HERO.context.map(line),        // muted first, emphasised on top
            ...HERO.emphasis.map(line),
            Plot.arrow([note], { x1: "x", y1: "from", x2: "x", y2: "to",   // leader line
              stroke: theme.textSecondary, strokeWidth: 1, headLength: 6 }),
            Plot.text([note], { x: "x", y: "textY", text: "text",
              fill: theme.text, fontSize: 11.5 }),
            Plot.text(ends, { x: 2023, y: "v", text: "s", textAnchor: "start", dx: 5,
              fill: (d) => ink(d.s), fontSize: 11,
              fontWeight: (d) => (lead(d.s) ? 600 : 400) }),
          ],
        })
      );
    },

    life(host, { life }, { theme }) {
      // Plot breaks the line at null y automatically — no .defined() needed
      host.append(
        base(theme, {
          year: true,
          legend: true,
          y: { label: null, grid: true, domain: [35, 88] },
          marks: [
            Plot.lineY(life.long, { x: "year", y: "value", stroke: "country", strokeWidth: 2, curve: "monotone-x" }),
            Plot.tip(life.long, Plot.pointer({ x: "year", y: "value", stroke: "country",
              title: (d) => `${d.country}\n${d.year}: ${d.value} yrs` })),
          ],
        })
      );
    },
  },
});
