import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink } from "../assets/js/data.js";

/* `Plotly` is a UMD global. The shared theme goes in through a Plotly
 * *template*: it styles every axis (xaxis2, yaxis3… in the small multiples
 * too), the hover label and the fonts, so the charts below only say what is
 * specific to them. newPlot() resolves when drawn; each chart returns a
 * promise of its cleanup (purge). */
const template = (theme) => ({
  layout: {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: theme.fontSans, size: 11, color: theme.textSecondary },
    colorway: theme.palette,
    showlegend: false,
    xaxis: { showgrid: false, zeroline: false, linecolor: theme.baseline, ticks: "outside",
      tickcolor: theme.baseline, ticklen: 4,
      spikemode: "across", spikesnap: "cursor", spikethickness: 1, spikecolor: theme.muted, spikedash: "solid" },
    yaxis: { gridcolor: theme.grid, zeroline: false, ticks: "outside", tickcolor: "rgba(0,0,0,0)", ticklen: 4 },
    hoverlabel: { bgcolor: theme.surface, bordercolor: theme.baseline,
      font: { family: theme.fontSans, size: 11, color: theme.text } },
  },
});

// the life chart (unchanged) still uses this older layout helper
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

mountDemo({
  meta: {
    name: "Plotly.js",
    version: "4.3.0",
    bundleKB: 1483,
    license: "MIT",
    tagline:
      "Batteries-included scientific charting. Zoom, pan, box-select, hover, spike lines and PNG export work with zero configuration, and the annotation model — shapes for furniture, annotations for text with real arrows — is the closest thing here to a drawing layer that understands data coordinates. The trade-off is weight (1.48 MB gzipped for the full bundle) and defaults that look more 'analysis tool' than 'publication'.",
    docs: "https://plotly.com/javascript/",
    cdn: "https://cdn.jsdelivr.net/npm/plotly.js-dist-min@4.3.0/plotly.min.js",
    notes:
      "Using the full <code>plotly.js-dist-min</code> for convenience. Everything is declarative JSON: traces for data, <code>layout.shapes</code> for bands and rules, <code>layout.annotations</code> for text, with or without an arrow. The theme is one Plotly <code>template</code> outside the render functions (about 15 lines, not counted). Lines are SVG by default; <code>type: \"scattergl\"</code> switches a trace to WebGL, which is what lets the grid draw all 1.25M points.",
    cardNotes: {
      hero: "Each callout is one annotation: <code>axref/ayref: \"x\"/\"y\"</code> puts the text in data units, Plotly draws the leader, and <code>arrowhead: 6</code> is the dot. Bands are <code>shapes</code> with <code>yref: \"paper\"</code>, the zero rule is the axis's own <code>zeroline</code>. End labels still need <code>spreadLabels</code>: Plotly does not de-collide annotations.",
      grid: "All 1,251,264 points, no decimation: <code>type: \"scattergl\"</code> takes the typed arrays and paints in 1.2–2.2 s (hourly 0.95 s, daily 0.27 s), so the solar peak survives at 16,289 MW. Drag-zoom, wheel-zoom, pan and double-click reset are built in; the one-week floor is a <code>plotly_relayout</code> handler. Catch: the unified tooltip searches every point within <code>hoverdistance</code> (default 20 px), which took 1–1.8 s per mouse move here; keeping it to one sample wide brings that to ~0.1 s.",
      npm: "<code>type: \"log\"</code> with <code>tickvals</code>/<code>ticktext</code> does the axis; <code>layout.grid</code> with matched axes does the small multiples. No transforms (removed in v3), so the index is computed by hand, and whole-line highlight is a <code>plotly_hover</code> handler that restyles all 22 traces. End labels are annotations, de-collided with <code>spreadLabels</code>.",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      const w = host.clientWidth || 640, h = HERO.height(w);
      const m = { t: 10, r: 76, b: 24, l: 44 };
      const [y0, y1] = HERO.y.domain;
      const color = (s) => ink(theme, s.color);
      const shown = HERO.callouts.filter((c) => c.rank <= HERO.calloutBudget(w));
      // annotations are placed in data units: 13 px of label gap, in dollars
      const ends = spreadLabels(
        HERO.series.map((s) => ({ s, value: oil.cols[s.key].y.at(-1), v: oil.cols[s.key].y.at(-1) })),
        (13 * (y1 - y0)) / (h - m.t - m.b), HERO.y.domain);
      const xanchor = { start: "left", middle: "center", end: "right" };
      return Plotly.newPlot(host,
        HERO.series.map((s) => ({
          x: oil.cols[s.key].t, y: oil.cols[s.key].y, name: s.label, mode: "lines",
          line: { color: color(s), width: s.width }, hovertemplate: "%{y:$.2f}",
        })),
        {
          template: template(theme), width: w, height: h, margin: m,
          hovermode: "x unified",
          xaxis: { type: "date", range: HERO.x.domain, fixedrange: true, hoverformat: "%-d %b %Y",
            tickvals: HERO.x.ticks, ticktext: HERO.x.ticks.map(HERO.x.format) },
          yaxis: { range: HERO.y.domain, fixedrange: true, tickvals: HERO.y.ticks,
            ticktext: HERO.y.ticks.map(HERO.y.format),
            zeroline: true, zerolinecolor: theme.baseline, zerolinewidth: 1 },
          shapes: HERO.bands.map((b) => ({ type: "rect", layer: "below", xref: "x", yref: "paper",
            x0: b.from, x1: b.to, y0: 0, y1: 1, fillcolor: theme.grid, opacity: 0.8, line: { width: 0 } })),
          annotations: [
            { x: HERO.bands[HERO.bandLabel.band].from, y: HERO.bandLabel.y, text: HERO.bandLabel.text,
              showarrow: false, xanchor: "left", font: { size: 10, color: theme.muted } },
            // a callout: the arrow's head (with a dot) on the data point, its tail at `at`
            ...shown.map((c) => ({
              x: c.date, y: c.value, ax: c.at[0], ay: c.at[1], axref: "x", ayref: "y",
              text: c.lines.join("<br>"), align: xanchor[c.anchor],
              xanchor: xanchor[c.anchor], yanchor: c.valign,
              showarrow: true, arrowhead: 6, arrowsize: 1.6, arrowwidth: 1, arrowcolor: theme.textSecondary,
              font: { size: 11, color: theme.text },
            })),
            ...ends.map((d) => ({
              x: HERO.x.domain[1], y: d.v, text: HERO.endLabel(d.s, d.value), showarrow: false,
              xanchor: "left", xshift: 6, font: { size: 11, color: color(d.s), weight: 600 },
            })),
          ],
        },
        { displayModeBar: false })
        .then(() => {
          report({ points: oil.rows.length, step: "full" });
          return () => Plotly.purge(host);
        });
    },

    grid(host, { grid: g }, { theme, report, range }) {
      // WebGL lines (scattergl) take all 1.25M points as typed arrays
      const w = host.clientWidth || 640, h = GRID.height(w);
      const [rule, note] = GRID.events;
      let peak = 0;
      for (const v of g.solar) if (v > peak) peak = v;
      const fmt = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      report({ points: g.n * g.keys.length, step: g.step,
        note: `solar peak drawn ${fmt(peak)} of ${fmt(GRID.peaks.solar.mw)}` });
      return Plotly.newPlot(host,
        GRID.series.map((s) => ({
          type: "scattergl", x: g.t, y: g[s.key], name: s.label, mode: "lines",
          line: { color: ink(theme, s.color), width: 1 }, hovertemplate: "%{y:,.0f} MW",
        })),
        {
          template: template(theme), width: w, height: h, margin: { t: 34, r: 12, b: 24, l: 46 },
          showlegend: true, legend: { orientation: "h", x: 0, y: 1, yanchor: "bottom", traceorder: "normal" },
          // unified hover searches every point within hoverdistance px: keep it one sample wide
          hovermode: "x unified", hoverdistance: 1, dragmode: "zoom",
          xaxis: { type: "date", hoverformat: "%a %-d %b %Y, %H:%M UTC", range },
          yaxis: { range: GRID.y.domain, fixedrange: true, tickvals: GRID.y.ticks,
            ticktext: GRID.y.ticks.map(GRID.y.format) },   // zoom x only
          shapes: [{ type: "line", xref: "x", yref: "paper", x0: rule.date, x1: rule.date, y0: 0, y1: 1,
            line: { color: theme.textSecondary, width: 1, dash: "dot" } }],
          annotations: [
            { x: rule.date, y: 1, yref: "paper", text: rule.label, showarrow: false,
              xanchor: "right", yanchor: "top", xshift: -4, yshift: w < 480 ? -14 : 0, font: { size: 10.5, color: theme.text } },
            { x: note.date, y: note.y, text: note.label, showarrow: false,
              xanchor: "left", font: { size: 10.5, color: theme.text } },
          ],
        },
        { scrollZoom: true, displaylogo: false, modeBarButtons: [["zoom2d", "pan2d", "resetScale2d"]] })
        .then(() => {
          host.on("plotly_relayout", () => {
            const [a, b] = host.layout.xaxis.range.map((d) => Date.parse(String(d).replace(" ", "T") + "Z"));
            const min = GRID.zoom.minSpanMs, mid = (a + b) / 2;
            // Plotly has no minimum zoom span: widen any range under a week
            if (b - a < min - 1000) return Plotly.relayout(host, { "xaxis.range": [mid - min / 2, mid + min / 2] });
            const hd = Math.max(1, Math.ceil(((w - 58) * GRID.stepMs) / (b - a)));   // px per sample
            if (hd !== host.layout.hoverdistance) Plotly.relayout(host, { hoverdistance: hd });
          });
          return () => Plotly.purge(host);
        });
    },

    npm(host, { npm }, { theme, report }) {
      const w = host.clientWidth || 640;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      const name = (k) => seven.get(k)?.label ?? k;
      const color = (k) => ink(theme, seven.get(k)?.color ?? NPM.others.color);
      const order = [...npm.keys.filter((k) => !seven.has(k)), ...seven.keys()];   // greys first
      const logRange = (d) => d.map(Math.log10);
      const yaxis = (Y, ticks = Y.ticks) => ({ type: "log", range: logRange(Y.domain), tickvals: ticks,
        ticktext: ticks.map(Y.format), fixedrange: true });
      const plot = (out, traces, lay) => Plotly.newPlot(out, traces,
        { template: template(theme), width: w, ...lay }, { displayModeBar: false });

      const lines = (out, indexed) => {
        const Y = indexed ? NPM.index : NPM.y, h = NPM.height(w);
        const m = { t: 8, r: 96, b: 32, l: 44 };
        // the index, by hand (Plotly removed its transforms in v3)
        const from = indexed ? npm.weeks.findIndex((d) => +d === +new Date(NPM.index.date)) : 0;
        const ys = (k) => npm.cols[k].slice(from)
          .map((v) => (v == null || !indexed ? v : (100 * v) / npm.cols[k][from]));
        const series = order.map((k) => ({ k, y: ys(k) }));
        const [lo, hi] = logRange(Y.domain);
        const ends = spreadLabels([...seven.keys(), ...NPM.alsoLabel].map((k) => {
          const value = series.find((s) => s.k === k).y.at(-1);
          return { k, value, v: Math.log10(value) };     // annotations on a log axis take log10 y
        }), (12 * (hi - lo)) / (h - m.t - m.b), [lo, hi]);
        const width = (k) => (seven.has(k) ? 1.75 : NPM.others.width);
        const opacity = (k) => (seven.has(k) ? 1 : NPM.others.opacity);
        return plot(out, series.map(({ k, y }) => ({
          x: npm.weeks.slice(from), y, name: name(k), mode: "lines",
          line: { color: color(k), width: width(k) }, opacity: opacity(k),
          hovertemplate: `<b>${name(k)}</b><br>%{x|%-d %b %Y}: %{y:,.0f}<extra></extra>`,
        })), {
          height: h, margin: m, hovermode: "closest",
          xaxis: { type: "date", fixedrange: true, range: [npm.weeks[from], npm.weeks.at(-1)] },
          yaxis: yaxis(Y),
          shapes: indexed ? [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 100, y1: 100,
            line: { color: theme.muted, width: 1 } }] : [],
          annotations: ends.map((d) => ({
            x: npm.weeks.at(-1), y: d.v, text: (indexed ? NPM.index : NPM).endLabel({ label: name(d.k) }, d.value),
            showarrow: false, xanchor: "left", xshift: 6,
            font: { size: 11, weight: 600, color: seven.has(d.k) ? color(d.k) : theme.muted } })),
        }).then(() => {
          // highlight the hovered line: restyle every trace, dim all but one
          let cur;
          const style = (on) => on !== cur && (cur = on, Plotly.restyle(out, {
            opacity: order.map((k, i) => (on == null ? opacity(k) : i === on ? 1 : 0.12)),
            "line.width": order.map((k, i) => (i === on ? 2.5 : width(k))),
            "line.color": order.map((k, i) => (i === on && !seven.has(k) ? theme.text : color(k))),
          }));
          out.on("plotly_hover", (e) => style(e.points[0].curveNumber));
          out.on("plotly_unhover", () => style(null));
        });
      };

      // small multiples: one subplot per package via layout.grid, y axes matched
      const multiples = (out) => {
        const cols = NPM.multiples.columns(w), rows = Math.ceil(7 / cols);
        const lay = { height: rows * NPM.multiples.height + 30, margin: { t: 6, r: 8, b: 24, l: 40 },
          grid: { rows, columns: cols, pattern: "independent", xgap: 0.06, ygap: 0.12 }, annotations: [] };
        const traces = NPM.seven.map((s, i) => {
          const n = i ? i + 1 : "";
          lay[`xaxis${n}`] = { type: "date", matches: i ? "x" : undefined, nticks: 3, fixedrange: true };
          lay[`yaxis${n}`] = { ...yaxis(NPM.y, [1e3, 1e5, 1e7]), matches: i ? "y" : undefined,
            showticklabels: i % cols === 0 };
          lay.annotations.push({ xref: `x${n} domain`, yref: `y${n} domain`, x: 0.02, y: 0.98,
            xanchor: "left", yanchor: "top", text: `<b>${s.label}</b>`, showarrow: false,
            font: { color: theme.text } });
          return { x: npm.weeks, y: npm.cols[s.key], xaxis: `x${n}`, yaxis: `y${n}`, mode: "lines",
            line: { color: color(s.key), width: 1.25 }, hovertemplate: `${s.label} %{y:,.0f}<extra></extra>` };
        });
        return plot(out, traces, lay);
      };

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      let drawn;                                // the first view's newPlot promise: the badge waits for it
      const cleanup = viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" },
        (v, out) => {
          const p = v === "multiples" ? multiples(out) : lines(out, v === "indexed");
          drawn ??= p;
          return () => Plotly.purge(out);
        });
      return drawn.then(() => cleanup);
    },

    life(host, { life }, { theme }) {
      const traces = life.countries.map((c) => ({
        x: life.wide.map((r) => r.year),
        y: life.wide.map((r) => r[c]),        // nulls break the line by default
        name: c, mode: "lines", line: { width: 2, shape: "spline" },
      }));
      return draw(host, traces,
        layout(theme, { yaxis: { gridcolor: theme.grid, range: [35, 88], zeroline: false } }));
    },
  },
});
