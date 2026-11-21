import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.19/+esm";
import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink, aggregate, between } from "../assets/js/data.js";

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
    version: "0.6.19",
    bundleKB: 181,
    bundleNote: "72 KB of Plot plus the 109 KB of D3 modules it imports",
    license: "ISC",
    tagline:
      "A concise grammar of graphics from D3's author. You describe marks (line, text, rect, arrow…) and channels (x, y, stroke) and Plot works out scales and axes. Annotation is not a separate subsystem — a leader line is just an arrow mark and a label is just a text mark — which makes an editorial chart unusually cheap, right up until you need two labels not to overlap, which Plot will not do for you.",
    docs: "https://observablehq.com/plot/",
    cdn: "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.19/+esm",
    notes:
      "<code>Plot.plot()</code> returns a detached SVG/figure node — you append it yourself. Mark order is z-order, so bands go first. Everything is SVG, which is why the half-hourly grid is the one test where Plot has to step down.",
    cardNotes: {
      hero: "All furniture is marks: <code>rect</code> bands with no y span the frame, <code>ruleY</code> for zero, <code>link</code> + <code>dot</code> + <code>text</code> per callout. Text anchors are options, not channels, so each callout's text is its own mark; end labels are de-collided by hand (<code>spreadLabels</code>).",
      grid: "No zoom or pan: Plot draws static SVG, and its pointer gives a crosshair and tooltip only. Full resolution (1.25M points) took 9–13 s to paint, hourly 4.7–5.1 s, so it draws the daily step: each day's mean as a line over an <code>areaY</code> band from that day's lowest to highest half-hour (0.5–0.7 s). The band keeps the true solar peak, 16,289 MW; a mean line alone shows 5,444.",
      npm: "<code>normalizeY</code> with a custom basis does the index, <code>fx</code>/<code>fy</code> facets do the small multiples, log ticks are free. Highlighting a whole line on hover is not built in: about a dozen lines of DOM work on <code>plot.value</code>.",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      const w = host.clientWidth || 640, h = HERO.height(w);
      const [y0, y1] = HERO.y.domain;
      const color = (k) => ink(theme, HERO.series.find((s) => s.key === k).color);
      const shown = HERO.callouts.filter((c) => c.rank <= HERO.calloutBudget(w));
      // Plot has no label layout: de-collide the end labels by hand, in data
      // units (13 px converted through the y scale)
      const ends = spreadLabels(
        HERO.series.map((s) => ({ s, value: oil.cols[s.key].y.at(-1), v: oil.cols[s.key].y.at(-1) })),
        (13 * (y1 - y0)) / (h - 34), HERO.y.domain);
      const band = HERO.bands[HERO.bandLabel.band];
      // a callout is a link + a dot + a text; anchors are options, not
      // channels, so each callout's text is its own mark
      const gap = { bottom: [0, -4], top: [0, 4], middle: [0, 0] };
      const label = (c) => Plot.text([c], {
        x: (c) => new Date(c.at[0]), y: (c) => c.at[1], text: (c) => c.lines.join("\n"),
        textAnchor: c.anchor, lineAnchor: c.valign, fill: theme.text, fontSize: 11,
        dx: c.anchor === "end" ? -4 : c.anchor === "start" ? 4 : gap[c.valign][0], dy: gap[c.valign][1] });
      host.append(Plot.plot({
        width: w, height: h, marginTop: 10, marginRight: 76, marginBottom: 24, marginLeft: 44,
        style: { background: "transparent", color: theme.text, fontSize: "11px" },
        x: { type: "utc", domain: HERO.x.domain.map((d) => new Date(d)),
          ticks: HERO.x.ticks.map((d) => new Date(d)), tickFormat: HERO.x.format, label: null },
        y: { domain: HERO.y.domain, ticks: HERO.y.ticks, tickFormat: HERO.y.format, grid: true, label: null },
        marks: [
          Plot.rect(HERO.bands, { x1: (d) => new Date(d.from), x2: (d) => new Date(d.to),
            fill: theme.grid, fillOpacity: 0.8 }),                   // no y: spans the frame
          Plot.text([HERO.bandLabel], { x: new Date(band.from), y: "y", text: "text",
            textAnchor: "start", fill: theme.muted, fontSize: 10 }),
          Plot.ruleY([HERO.zero.y], { stroke: theme.muted }),
          ...HERO.series.map((s) => Plot.lineY(oil.rows, { filter: (d) => d.series === s.key,
            x: "date", y: "price", stroke: color(s.key), strokeWidth: s.width })),
          Plot.link(shown, { x1: (c) => new Date(c.date), y1: "value",
            x2: (c) => new Date(c.at[0]), y2: (c) => c.at[1], stroke: theme.textSecondary }),
          Plot.dot(shown, { x: (c) => new Date(c.date), y: "value", r: 3, fill: theme.text }),
          ...shown.map(label),
          Plot.text(ends, { x: new Date(HERO.x.domain[1]), y: "v", text: (d) => HERO.endLabel(d.s, d.value),
            textAnchor: "start", dx: 6, fill: (d) => color(d.s.key), fontWeight: 600 }),
          Plot.tip(oil.rows, Plot.pointerX({ x: "date", y: "price",
            title: (d) => `${d.series === "wti" ? "WTI" : "Brent"} ${HERO.y.format(d.price)}\n${d.date.toISOString().slice(0, 10)}` })),
        ],
      }));
      report({ points: oil.rows.length, step: "full" });
    },

    grid(host, { grid }, { theme, report, range }) {
      // SVG: full (1.25M points) took 9–13 s to paint, hourly ~5 s. So the
      // shared daily step, drawn as a min–max band under the daily mean: the
      // band keeps every half-hour's extreme. Asked to open on a window (Plot
      // has no zoom), draw that window's half-hours at full resolution instead.
      const g = range ? between(grid, range) : aggregate(grid, "day");
      const w = host.clientWidth || 640, h = GRID.height(w);
      const I = Array.from({ length: g.n }, (_, i) => i);   // data = row indices,
      const at = (i) => new Date(g.t[i]);                    // channels = the typed arrays
      const fmt = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const [rule, note] = GRID.events;
      const daily = g.step === "day";
      host.append(Plot.plot({
        width: w, height: h, marginTop: 14, marginRight: 12, marginBottom: 24, marginLeft: 46,
        style: { background: "transparent", color: theme.text, fontSize: "11px" },
        x: { type: "utc", label: null, domain: range?.map((d) => new Date(d)), tickFormat: range ? "%-d %b" : undefined },
        y: { domain: GRID.y.domain, ticks: GRID.y.ticks, tickFormat: GRID.y.format, grid: true, label: null },
        color: { domain: GRID.series.map((s) => s.label),
          range: GRID.series.map((s) => ink(theme, s.color)), legend: true },
        marks: [
          ...(daily ? GRID.series.map((s) => Plot.areaY(I, { x: g.t, y1: g.min[s.key], y2: g.max[s.key],
            fill: () => s.label, fillOpacity: 0.3 })) : []),           // each day's low to high
          ...GRID.series.map((s) => Plot.lineY(I, { x: g.t, y: g[s.key], stroke: () => s.label, strokeWidth: 1 })),
          Plot.ruleX([new Date(rule.date)], { stroke: theme.textSecondary, strokeDasharray: "3 3", clip: true }),
          Plot.text([rule], { x: (d) => new Date(d.date), text: "label", frameAnchor: "top",
            textAnchor: "end", dx: -4, fill: theme.text, fontSize: 10.5, clip: true }),
          Plot.text([note], { x: (d) => new Date(d.date), y: "y", text: "label",
            textAnchor: "start", fill: theme.text, fontSize: 10.5, clip: true }),
          Plot.ruleX(I, Plot.pointerX({ x: g.t, stroke: theme.muted })),   // crosshair
          Plot.tip(I, Plot.pointerX({ x: g.t, y: g.gas, title: (i) =>
            [daily ? at(i).toISOString().slice(0, 10) + " (mean, low–high)" : at(i).toISOString().slice(0, 16).replace("T", " ") + " UTC",
             ...GRID.series.map((s) => `${s.label}  ${fmt(g[s.key][i])}` +
               (daily ? ` (${Math.round(g.min[s.key][i]).toLocaleString("en")}–${fmt(g.max[s.key][i])})` : ""))].join("\n") })),
        ],
      }));
      report({ points: g.n * g.keys.length * (daily ? 3 : 1), step: range ? "full, this window only" : "day: mean + low–high band",
        note: `solar peak drawn ${fmt(Math.max(...g.max.solar))} of ${fmt(GRID.peaks.solar.mw)}` });
    },

    npm(host, { npm }, { theme, report }) {
      const w = host.clientWidth || 640;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      const name = (k) => seven.get(k)?.label ?? k;
      const color = (k) => ink(theme, seven.get(k)?.color ?? NPM.others.color);
      // greys first so the seven draw on top
      const order = [...npm.keys.filter((k) => !seven.has(k)), ...seven.keys()];
      const rows = order.flatMap((k) => npm.rows.filter((d) => d.package === k));
      const style = { background: "transparent", color: theme.text, fontSize: "11px" };

      const lines = (indexed) => {
        const idx = new Date(NPM.index.date);
        const data = indexed ? rows.filter((d) => d.week >= idx) : rows;
        const Y = indexed ? NPM.index : NPM.y;
        // the transform: each series ÷ its first value (the index week) × 100
        const norm = (o) => (indexed ? Plot.normalizeY({ basis: (I, Y) => Y[I[0]] / 100, ...o }) : o);
        const enc = { x: "week", y: "downloads", z: "package" };
        const lastOf = (k) => {
          const c = npm.cols[k], v = c.at(-1);
          return indexed ? (100 * v) / c[npm.weeks.findIndex((d) => +d === +idx)] : v;
        };
        const h = NPM.height(w), [lo, hi] = Y.domain.map(Math.log10);
        const ends = spreadLabels([...seven.keys(), ...NPM.alsoLabel]
          .map((k) => ({ k, value: lastOf(k), v: Math.log10(lastOf(k)) })), (12 * (hi - lo)) / (h - 34), [lo, hi]);
        const plot = Plot.plot({
          width: w, height: h, marginTop: 8, marginRight: 96, marginBottom: 32, marginLeft: 44, style,
          x: { type: "utc", label: null },
          y: { type: "log", domain: Y.domain, ticks: Y.ticks, tickFormat: Y.format, grid: true, label: null },
          marks: [
            indexed ? Plot.ruleY([100], { stroke: theme.muted }) : null,
            Plot.lineY(data, norm({ ...enc, clip: true, ariaLabel: "package",
              stroke: (d) => color(d.package),
              strokeWidth: (d) => (seven.has(d.package) ? 1.75 : NPM.others.width),
              strokeOpacity: (d) => (seven.has(d.package) ? 1 : NPM.others.opacity) })),
            Plot.text(ends, { x: npm.weeks.at(-1), y: (d) => 10 ** d.v, dx: 6, textAnchor: "start",
              text: (d) => (indexed ? NPM.index : NPM).endLabel(seven.get(d.k) ?? { label: d.k }, d.value),
              fill: (d) => (seven.has(d.k) ? color(d.k) : theme.muted), fontWeight: 600 }),
            Plot.tip(data, Plot.pointer(norm({ ...enc, title: (d) =>
              `${name(d.package)}\n${d.week.toISOString().slice(0, 10)}: ${d.downloads?.toLocaleString("en")} / week` }))),
          ],
        });
        /* hover-highlight the whole line: Plot gives the pointed datum
         * (plot.value) but no per-series styling, so dim the other paths */
        plot.addEventListener("input", () => {
          const k = plot.value?.package;
          plot.querySelectorAll("path[aria-label]").forEach((p) => {
            const on = p.getAttribute("aria-label") === k;
            p.style.opacity = k && !on ? 0.15 : "";
            p.style.strokeWidth = on ? 2.5 : "";
            if (on && !seven.has(k)) p.style.stroke = theme.text;
            else p.style.stroke = "";
          });
        });
        return plot;
      };

      const cols = NPM.multiples.columns(w);
      const multiples = () => Plot.plot({
        width: w, height: Math.ceil(7 / cols) * NPM.multiples.height + 30,
        marginTop: 6, marginRight: 8, marginBottom: 24, marginLeft: 40, style,
        fx: { axis: null }, fy: { axis: null },
        x: { type: "utc", label: null, ticks: 3 },
        y: { type: "log", domain: NPM.y.domain, ticks: [1e3, 1e5, 1e7], tickFormat: NPM.y.format, grid: true, label: null },
        marks: [
          Plot.lineY(rows.filter((d) => seven.has(d.package)), {
            x: "week", y: "downloads", clip: true, stroke: (d) => color(d.package),
            fx: (d) => [...seven.keys()].indexOf(d.package) % cols,
            fy: (d) => Math.floor([...seven.keys()].indexOf(d.package) / cols) }),
          Plot.text(NPM.seven, { text: "label", frameAnchor: "top-left", dx: 4, dy: 4, fontWeight: 600,
            fill: theme.text, fx: (d, i) => i % cols, fy: (d, i) => Math.floor(i / cols) }),
        ],
      });

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      return viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" },
        (v, out) => out.append(v === "multiples" ? multiples() : lines(v === "indexed")));
    },

    life(host, { life }, { theme }) {
      // a null y breaks the line by default — no .defined() needed
      host.append(
        base(theme, {
          year: true,
          legend: true,
          color: { domain: life.countries, range: theme.palette, legend: true },
          width: host.clientWidth || 440,
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
