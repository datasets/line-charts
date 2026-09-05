import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

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
const draw = (host, traces, lay, cfg = config) =>
  Plotly.newPlot(host, traces, lay, cfg).then(() => () => Plotly.purge(host));

// hero charts size to the card and stay in a readable band of heights
const heroBox = (host) => {
  const w = host.clientWidth || 640;
  return { w, h: Math.max(280, Math.min(380, Math.round(w * 0.55))) };
};

mountDemo({
  meta: {
    name: "Plotly.js",
    version: "3.7.0",
    bundleKB: 1100,
    license: "MIT",
    tagline:
      "Batteries-included scientific charting. Zoom, pan, box-select, hover, spike lines and PNG export work with zero configuration, and the annotation model — shapes for furniture, annotations for text with real arrows — is the closest thing here to a drawing layer that understands data coordinates. The trade-off is weight (~1 MB gzipped) and defaults that look more 'analysis tool' than 'publication'.",
    docs: "https://plotly.com/javascript/",
    cdn: "https://cdn.jsdelivr.net/npm/plotly.js-dist-min@3.7.0/plotly.min.js",
    notes:
      "Using the full <code>plotly.js-dist-min</code> for convenience. In the hero chart the band and the reference line are <code>layout.shapes</code>, the annotation is a single <code>layout.annotations</code> entry with <code>showarrow</code> (Plotly draws the leader and the arrowhead), and the end-of-line labels are arrowless annotations — Plotly does not lay those out for you, so they go through the shared <code>spreadLabels()</code> helper.",
  },
  charts: {
    hero(host, { energy }, { theme }) {
      const { w, h } = heroBox(host);
      const { band, ref, note } = HERO;
      const ink = (s) => (s === "wind" ? theme.palette[2] : s === "solar" ? theme.palette[3] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const last = energy.wide[energy.wide.length - 1];
      // Plotly annotations are positioned in data units, so the minimum
      // label gap has to be converted from pixels into TWh
      const perPx = HERO.yMax / (h - 46);   // plot height = h minus the t/b margins
      const ends = spreadLabels(
        [...HERO.context, ...HERO.emphasis].map((s) => ({ s, v: last[s] })),
        13 * perPx,
        [0, HERO.yMax]
      );
      return draw(
        host,
        [...HERO.context, ...HERO.emphasis].map((s) => ({
          x: energy.wide.map((r) => r.year),
          y: energy.wide.map((r) => r[s]),
          name: s, mode: "lines", hoverinfo: "skip",
          line: { color: ink(s), width: lead(s) ? 2.6 : 1.5, shape: "spline" },
          opacity: s === "nuclear" ? 0.65 : 1,
        })),
        layout(theme, {
          width: w, height: h,
          margin: { t: 14, r: 64, b: 32, l: 42 },
          showlegend: false,
          xaxis: { range: [1997, 2023], dtick: 5, tickformat: "d", showgrid: false,
            linecolor: theme.baseline, zeroline: false, fixedrange: true },
          yaxis: { range: [0, HERO.yMax], gridcolor: theme.grid, zeroline: false,
            showline: false, fixedrange: true },
          shapes: [
            { type: "rect", xref: "x", yref: "paper", layer: "below",   // event band
              x0: band.x0, x1: band.x1, y0: 0, y1: 1,
              fillcolor: theme.grid, opacity: 0.7, line: { width: 0 } },
            { type: "line", xref: "paper", yref: "y", layer: "below",   // reference line
              x0: 0, x1: 1, y0: ref.y, y1: ref.y,
              line: { color: theme.baseline, width: 1, dash: "dash" } },
          ],
          annotations: [
            { x: note.x, y: note.to, ax: 0, ay: -(note.from - note.to) / perPx,   // the annotation
              text: note.text, showarrow: true, arrowhead: 2, arrowsize: 1,
              arrowwidth: 1, arrowcolor: theme.textSecondary,
              font: { size: 11.5, color: theme.text } },
            { x: band.x0 + 0.5, y: band.labelY, text: band.label, showarrow: false,
              font: { size: 10, color: theme.muted } },
            { x: ref.labelX, y: ref.labelY, text: ref.label, showarrow: false,
              xanchor: "left", font: { size: 10, color: theme.muted } },
            ...ends.map((d) => ({                                        // direct labels
              x: 2023, y: d.v, text: d.s, showarrow: false,
              xanchor: "left", xshift: 5, align: "left",
              font: { size: 11, color: ink(d.s), weight: lead(d.s) ? 600 : 400 },
            })),
          ],
        }),
        // sized explicitly above; Plotly's responsive mode would override the
        // height with the container's and clip the axis labels
        { displayModeBar: false, responsive: false }
      );
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
  },
});
