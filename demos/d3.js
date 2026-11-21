import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.2/+esm";
import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink } from "../assets/js/data.js";

/* Shared frame: margins, responsive SVG, themed axes + gridlines.
 * ~35 lines you write once and reuse — omitted from the per-card
 * snippets below, which show only the marks + interaction. */
function mkFrame(host, { xDomain, yDomain, xScale = "time", xFormat, yNice = true, pad = {} }) {
  const m = { top: 20, right: 18, bottom: 26, left: 46, ...pad };
  const width = host.clientWidth || 440;
  const height = 300;
  const t = window.__lcTheme;
  const svg = d3
    .select(host)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);
  const x = (xScale === "time" ? d3.scaleUtc() : d3.scaleLinear())
    .domain(xDomain)
    .range([m.left, width - m.right]);
  const y = d3.scaleLinear().domain(yDomain).range([height - m.bottom, m.top]);
  if (yNice) y.nice();
  const gx = d3.axisBottom(x).ticks(width / 90).tickSizeOuter(0);
  if (xFormat) gx.tickFormat(xFormat);
  const gy = d3.axisLeft(y).ticks(5).tickSizeOuter(0);
  svg.append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(gx)
    .call((g) => g.selectAll(".domain").attr("stroke", t.baseline))
    .call((g) => g.selectAll("text").attr("fill", t.muted).attr("font-size", 11));
  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(gy)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll(".tick line")
        .clone()
        .attr("x2", width - m.left - m.right)
        .attr("stroke", t.grid)
    )
    .call((g) => g.selectAll("text").attr("fill", t.muted).attr("font-size", 11));
  return { svg, x, y, width, height, m };
}

/* Simple top-left swatch legend, wrapping onto a second row when the card
 * is too narrow to hold it — reused by the multi-series cards. */
function drawLegend(svg, names, palette, width) {
  const g = svg.append("g").attr("transform", "translate(46,6)");
  let x = 0, row = 0;
  names.forEach((name, i) => {
    const w = 18 + name.length * 6.6 + 14;
    if (x && x + w > width - 60) { x = 0; row++; }
    const item = g.append("g").attr("transform", `translate(${x},${row * 14})`);
    item.append("line").attr("x1", 0).attr("x2", 14).attr("y1", 0).attr("y2", 0)
      .attr("stroke", palette[i % palette.length]).attr("stroke-width", 2.5);
    item.append("text").attr("x", 18).attr("dy", "0.32em")
      .attr("fill", window.__lcTheme.textSecondary).attr("font-size", 11).text(name);
    x += w;
  });
}

mountDemo({
  meta: {
    name: "D3",
    version: "7.9.2",
    bundleKB: 118,
    bundleNote: "the 35 ES module files <code>d3@7.9.2/+esm</code> pulls in, four of them twice in different versions; the single-file <code>d3.min.js</code> is 93 KB",
    license: "ISC / BSD",
    tagline:
      "Not a chart library — a low-level toolkit of scales, shape generators, axes, selections and zoom behaviour. You build the chart. The quality ceiling is the highest here and nothing is off-limits: the annotation, the band and the labels are the same kind of object as the lines, so none of them is a special case you have to hope the library supports. Every pixel is your code, so every chart is longer than in a charting library, and the one that matters most, 1.25M points with zoom, is also the one D3 does best: point <code>d3.line()</code> at a canvas and it draws them all.",
    docs: "https://d3js.org/",
    cdn: "https://cdn.jsdelivr.net/npm/d3@7.9.2/+esm",
    notes:
      "Each chart below is standalone: scales, axes, gridlines, bands, callouts, labels, zoom and tooltips are all in the snippet, nothing hidden in a helper (only the shared <code>spreadLabels</code> and <code>viewSwitch</code>). The grid draws its lines on a canvas with the same <code>d3.line()</code> generator, via <code>.context(ctx)</code>, and keeps axes and annotations in SVG on top. The life-expectancy card uses a shared ~35-line <code>mkFrame()</code> helper shown at the top of the module instead.",
    cardNotes: {
      defaults: "D3 has no chart defaults: scales, margins and axes are yours, and a path needs <code>fill: none</code> and a stroke or it fills black, so both lines take the page’s text colour (<code>currentColor</code>) and cannot be told apart. No legend, no tooltip. Axes use <code>currentColor</code>, so dark mode works. The y-domain is the bare data extent, so the −$36.98 day sits on the bottom edge.",
      hero: "Everything is an SVG element you append: bands, zero rule, leader lines, dots, multi-line callout text (tspans, with the vertical alignment worked out by hand) and end labels de-collided in pixel space with <code>spreadLabels</code>. No hover tooltip (optional here, and another ~15 lines).",
      grid: "All 1,251,264 points at full resolution, no decimation: <code>d3.line().context(ctx)</code> strokes them on a canvas in about 70 ms to first paint (median of six runs at 900 px), so the solar peak drawn is the true 16,289 MW. <code>d3.zoom</code> + <code>rescaleX</code> give wheel/drag zoom clamped to one week, a double-click reset, and a bisector gives the crosshair tooltip. A redraw fully zoomed out costs ~140 ms (about 7 fps), dropping to ~30 ms once zoomed in, since only the visible points are drawn.",
      npm: "Log scale, clip-path and line generator are one line each; the index is by hand (divide by the index week). Hover is the classic D3 pattern: a <code>d3.Delaunay</code> over every point finds the nearest, which picks its whole line to raise and the rest to dim. Small multiples are a data join of seven <code>g</code> cells sharing one log scale.",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      const w = host.clientWidth || 640, h = HERO.height(w);
      const m = { top: 10, right: 76, bottom: 24, left: 44 };
      const date = (s) => new Date(s);
      const x = d3.scaleUtc(HERO.x.domain.map(date), [m.left, w - m.right]);
      const y = d3.scaleLinear(HERO.y.domain, [h - m.bottom, m.top]);
      const color = (s) => ink(theme, s.color);
      const svg = d3.select(host).append("svg").attr("width", w).attr("height", h)
        .attr("viewBox", [0, 0, w, h]).style("font", `11px ${theme.fontSans}`).style("color", theme.textSecondary);

      // recession bands first, so everything else lands on top; one label
      svg.append("g").attr("fill", theme.grid).attr("fill-opacity", 0.8)
        .selectAll("rect").data(HERO.bands).join("rect")
        .attr("x", (d) => x(date(d.from))).attr("width", (d) => x(date(d.to)) - x(date(d.from)))
        .attr("y", m.top).attr("height", h - m.top - m.bottom);
      svg.append("text").attr("x", x(date(HERO.bands[HERO.bandLabel.band].from))).attr("y", y(HERO.bandLabel.y))
        .attr("fill", theme.muted).attr("font-size", 10).text(HERO.bandLabel.text);

      // axes; the y ticks stretched across the plot are the gridlines
      svg.append("g").attr("transform", `translate(0,${h - m.bottom})`)
        .call(d3.axisBottom(x).tickValues(HERO.x.ticks.map(date)).tickFormat(HERO.x.format))
        .call((g) => g.style("font", "inherit").select(".domain").remove());
      svg.append("g").attr("transform", `translate(${m.left},0)`)
        .call(d3.axisLeft(y).tickValues(HERO.y.ticks).tickFormat(HERO.y.format).tickSize(m.left + m.right - w))
        .call((g) => g.style("font", "inherit").select(".domain").remove())
        .call((g) => g.selectAll(".tick line").attr("stroke", theme.grid));
      svg.append("line").attr("x1", m.left).attr("x2", w - m.right)
        .attr("y1", y(HERO.zero.y)).attr("y2", y(HERO.zero.y)).attr("stroke", theme.baseline);

      // the lines, in spec order: WTI underneath, Brent on top
      for (const s of HERO.series) {
        const { t, y: v } = oil.cols[s.key];
        svg.append("path").attr("fill", "none").attr("stroke", color(s)).attr("stroke-width", s.width)
          .attr("d", d3.line((d) => x(d), (d, i) => y(v[i]))(t));
      }

      // callouts: leader from the true point to the text anchor, a dot, the text
      const shown = HERO.callouts.filter((c) => c.rank <= HERO.calloutBudget(w));
      const firstDy = { bottom: (n) => -(n - 1) * 1.1 - 0.4, top: () => 1.1, middle: (n) => 0.32 - (n - 1) * 0.55 };
      const callout = svg.append("g").selectAll("g").data(shown).join("g");
      callout.append("line").attr("stroke", theme.textSecondary)
        .attr("x1", (c) => x(date(c.date))).attr("y1", (c) => y(c.value))
        .attr("x2", (c) => x(date(c.at[0]))).attr("y2", (c) => y(c.at[1]));
      callout.append("circle").attr("r", 3).attr("fill", theme.text)
        .attr("cx", (c) => x(date(c.date))).attr("cy", (c) => y(c.value));
      callout.append("text").attr("fill", theme.text).attr("text-anchor", (c) => c.anchor)
        .attr("transform", (c) => `translate(${x(date(c.at[0]))},${y(c.at[1])})`)
        .selectAll("tspan").data((c) => c.lines.map((text, i) => ({ c, text, i }))).join("tspan")
        .attr("x", ({ c }) => ({ start: 4, end: -4 })[c.anchor] ?? 0)
        .attr("dy", ({ c, i }) => `${i ? 1.1 : firstDy[c.valign](c.lines.length)}em`)
        .text((d) => d.text);

      // direct end labels, pushed apart in pixel space
      const ends = HERO.series.map((s) => ({ s, value: oil.cols[s.key].y.at(-1) }));
      svg.append("g").attr("font-weight", 600)
        .selectAll("text").data(spreadLabels(ends.map((d) => ({ ...d, v: y(d.value) })), 13, [m.top, h - m.bottom]))
        .join("text").attr("x", x.range()[1] + 6).attr("y", (d) => d.v).attr("dy", "0.32em")
        .attr("fill", (d) => color(d.s)).text((d) => HERO.endLabel(d.s, d.value));
      report({ points: oil.rows.length, step: "full" });
    },

    defaults(host, { defaults: oil }) {
      const w = host.clientWidth, h = 400, m = 40;   // D3 has no default margins; axes need room
      const x = d3.scaleUtc(d3.extent(oil.rows, (d) => d.date), [m, w - m]);
      const y = d3.scaleLinear(d3.extent(oil.rows, (d) => d.price), [h - m, m]);
      const svg = d3.select(host).append("svg").attr("width", w).attr("height", h);
      svg.append("g").attr("transform", `translate(0,${h - m})`).call(d3.axisBottom(x));
      svg.append("g").attr("transform", `translate(${m},0)`).call(d3.axisLeft(y));
      const line = d3.line((d) => x(d.date), (d) => y(d.price));
      svg.selectAll("path.line").data(d3.groups(oil.rows, (d) => d.series)).join("path")
        .attr("fill", "none").attr("stroke", "currentColor").attr("d", ([, rows]) => line(rows));
    },
    grid(host, { grid: g }, { theme, report, range }) {
      // every half-hour, all 1.25M points: lines on a canvas (SVG paths this
      // long are too slow), axes, events, crosshair and legend in an SVG on top
      const w = host.clientWidth || 640, h = GRID.height(w), dpr = devicePixelRatio || 1;
      const m = { top: 30, right: 14, bottom: 24, left: 46 };
      const series = GRID.series.map((s) => ({ ...s, ink: ink(theme, s.color) }));
      const MW = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const x0 = d3.scaleUtc([g.t[0], g.t[g.n - 1]], [m.left, w - m.right]);
      const y = d3.scaleLinear(GRID.y.domain, [h - m.bottom, m.top]);
      let x = x0;
      d3.select(host).style("position", "relative");
      const canvas = d3.select(host).append("canvas").attr("width", w * dpr).attr("height", h * dpr)
        .style("width", `${w}px`).style("display", "block");
      const ctx = canvas.node().getContext("2d");
      ctx.scale(dpr, dpr);
      const svg = d3.select(host).append("svg").attr("width", w).attr("height", h)
        .style("position", "absolute").style("inset", 0).style("cursor", "crosshair")
        .style("font", `11px ${theme.fontSans}`).style("color", theme.textSecondary);
      svg.append("clipPath").attr("id", "grid-clip")
        .append("rect").attr("x", m.left).attr("y", 0).attr("width", w - m.left - m.right).attr("height", h);

      svg.append("g").attr("transform", `translate(${m.left},0)`)
        .call(d3.axisLeft(y).tickValues(GRID.y.ticks).tickFormat(GRID.y.format).tickSize(m.left + m.right - w))
        .call((g) => g.style("font", "inherit").select(".domain").remove())
        .call((g) => g.selectAll(".tick line").attr("stroke", theme.grid));
      const gx = svg.append("g").attr("transform", `translate(0,${h - m.bottom})`).style("font", "inherit");
      const legend = svg.append("g").selectAll("g").data(series).join("g")
        .attr("transform", (s, i) => `translate(${m.left + i * 62},10)`);
      legend.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", (s) => s.ink);
      legend.append("text").attr("x", 17).attr("y", 6).attr("dy", "0.35em").attr("fill", theme.text).text((s) => s.label);
      if (w >= 760) svg.append("text").attr("x", w - m.right).attr("y", 16).attr("text-anchor", "end")
        .attr("fill", theme.muted).attr("font-size", 10).text("Ctrl/⌘ + scroll to zoom · drag to pan · double-click to reset");

      // events: they move with the zoom, so draw() positions them
      const [coal, note] = GRID.events;
      const events = svg.append("g").attr("clip-path", "url(#grid-clip)").attr("font-size", 10.5)
        .attr("fill", theme.text).attr("stroke", theme.surface).attr("stroke-width", 3).attr("paint-order", "stroke");
      const rule = events.append("g");
      rule.append("line").attr("y1", m.top).attr("y2", h - m.bottom)
        .attr("stroke", theme.textSecondary).attr("stroke-width", 1).attr("stroke-dasharray", "3 3");
      // narrow: one line lower, clear of the 2012 label
      rule.append("text").attr("x", -4).attr("y", m.top + (w < 640 ? 24 : 10)).attr("text-anchor", "end").text(coal.label);
      const label = events.append("text").attr("y", y(note.y)).attr("text-anchor", "start").text(note.label);

      function draw() {
        // only the points in view (bisect on the time column)
        const [a, b] = x.domain();
        const I = d3.range(Math.max(0, d3.bisectLeft(g.t, +a) - 1), Math.min(g.n, d3.bisectRight(g.t, +b) + 1));
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath(); ctx.rect(m.left, m.top, w - m.left - m.right, h - m.top - m.bottom); ctx.clip();
        ctx.lineWidth = 1;
        for (const s of series) {
          const v = g[s.key];
          ctx.beginPath();
          d3.line((i) => x(g.t[i]), (i) => y(v[i])).defined((i) => !isNaN(v[i])).context(ctx)(I);
          ctx.strokeStyle = s.ink;
          ctx.stroke();
        }
        ctx.restore();
        gx.call(d3.axisBottom(x).ticks(w / 90).tickSizeOuter(0)).call((g) => g.select(".domain").attr("stroke", theme.baseline));
        rule.attr("transform", `translate(${x(new Date(coal.date))},0)`);
        label.attr("x", x(new Date(note.date)));
      }

      // zoom and pan on x only, from everything down to one week
      let frame = 0;
      const zoom = d3.zoom()
        .scaleExtent([1, (g.t[g.n - 1] - g.t[0]) / GRID.zoom.minSpanMs])
        .extent([[m.left, 0], [w - m.right, h]]).translateExtent([[m.left, 0], [w - m.right, h]])
        .on("zoom", ({ transform }) => {
          x = transform.rescaleX(x0);
          frame ||= requestAnimationFrame(() => { frame = 0; draw(); });
        });
      svg.call(zoom).on("dblclick.zoom", () => svg.call(zoom.transform, d3.zoomIdentity));
      const k = range && (x0.range()[1] - x0.range()[0]) / (x0(range[1]) - x0(range[0]));   // open on a window
      if (range) svg.call(zoom.transform, d3.zoomIdentity.translate(m.left - k * x0(range[0]), 0).scale(k));

      // crosshair + one tooltip with all four series at the nearest half-hour
      const cross = svg.append("line").attr("y1", m.top).attr("y2", h - m.bottom).attr("stroke", theme.muted).attr("display", "none");
      const tip = d3.select(host).append("div").style("display", "none")
        .style("position", "absolute").style("pointer-events", "none").style("padding", "6px 8px")
        .style("background", theme.surface).style("border", `1px solid ${theme.baseline}`).style("border-radius", "4px")
        .style("font", `11px/1.45 ${theme.fontSans}`).style("color", theme.text).style("white-space", "nowrap");
      const when = d3.utcFormat("%a %-d %b %Y, %H:%M UTC");
      svg.on("pointermove", (e) => {
        const [px, py] = d3.pointer(e);
        const i = d3.bisectCenter(g.t, +x.invert(px)), cx = x(g.t[i]);
        if (px < m.left || px > w - m.right) return svg.dispatch("pointerleave");
        cross.attr("display", null).attr("x1", cx).attr("x2", cx);
        tip.style("display", null).html(`<b>${when(g.t[i])}</b>` + series.map((s) =>
          `<br><span style="color:${s.ink}">■</span> ${s.label} ${MW(g[s.key][i])}`).reverse().join(""))
          .style("left", `${cx > w / 2 ? cx - tip.node().offsetWidth - 10 : cx + 10}px`).style("top", `${Math.max(m.top, py - 40)}px`);
      }).on("pointerleave", () => { cross.attr("display", "none"); tip.style("display", "none"); });

      draw();
      report({ points: g.n * g.keys.length, step: g.step,
        note: `solar peak drawn ${MW(d3.max(g.solar))} of ${MW(GRID.peaks.solar.mw)}` });
      return () => { cancelAnimationFrame(frame); svg.on(".zoom", null); };
    },

    npm(host, { npm }, { theme, report }) {
      const w = host.clientWidth || 640;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      const color = (k) => ink(theme, seven.get(k)?.color ?? NPM.others.color);
      const name = (k) => seven.get(k)?.label ?? k;
      const order = [...npm.keys.filter((k) => !seven.has(k)), ...seven.keys()];   // greys first
      const svgOf = (out, h) => d3.select(out).append("svg").attr("width", w).attr("height", h)
        .attr("viewBox", [0, 0, w, h]).style("font", `11px ${theme.fontSans}`).style("color", theme.textSecondary);
      const yAxis = (y, ticks, fmt, size) => (g) => g.call(d3.axisLeft(y).tickValues(ticks).tickFormat(fmt).tickSize(-size))
        .style("font", "inherit").call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll(".tick line").attr("stroke", theme.grid));

      function lines(out, indexed) {
        const h = NPM.height(w), m = { top: 8, right: 100, bottom: 24, left: 44 };
        const Y = indexed ? NPM.index : NPM.y;
        // the index, by hand: from the index week on, each series ÷ that week's value × 100
        const i0 = indexed ? d3.bisectLeft(npm.t, +new Date(NPM.index.date)) : 0;
        const series = order.map((k) => {
          const c = npm.cols[k], base = indexed ? c[i0] / 100 : 1;
          return { k, values: c.slice(i0).map((v, j) => ({ k, t: npm.weeks[i0 + j], raw: v, v: v && v / base })) };
        });
        const x = d3.scaleUtc([npm.weeks[i0], npm.weeks.at(-1)], [m.left, w - m.right]);
        const y = d3.scaleLog(Y.domain, [h - m.bottom, m.top]);
        const svg = svgOf(out, h);
        const id = `npm-clip-${indexed}`;
        svg.append("clipPath").attr("id", id).append("rect")
          .attr("x", m.left).attr("y", m.top).attr("width", w - m.left - m.right).attr("height", h - m.top - m.bottom);
        svg.append("g").attr("transform", `translate(${m.left},0)`).call(yAxis(y, Y.ticks, Y.format, w - m.left - m.right));
        svg.append("g").attr("transform", `translate(0,${h - m.bottom})`).call(d3.axisBottom(x).ticks(w / 80))
          .style("font", "inherit").call((g) => g.select(".domain").attr("stroke", theme.baseline));
        if (indexed) svg.append("line").attr("x1", m.left).attr("x2", w - m.right)
          .attr("y1", y(100)).attr("y2", y(100)).attr("stroke", theme.muted);

        const line = d3.line((d) => x(d.t), (d) => y(d.v)).defined((d) => d.v != null);
        // the resting style, or one line picked out (k) and the rest dimmed
        const highlight = (path, k) => path
          .attr("stroke", (s) => (s.k === k && !seven.has(k) ? theme.text : color(s.k)))
          .attr("stroke-width", (s) => (s.k === k ? 2.5 : seven.has(s.k) ? 1.75 : NPM.others.width))
          .attr("stroke-opacity", (s) => (k ? (s.k === k ? 1 : 0.15) : seven.has(s.k) ? 1 : NPM.others.opacity));
        const path = svg.append("g").attr("clip-path", `url(#${id})`).attr("fill", "none")
          .selectAll("path").data(series).join("path").attr("d", (s) => line(s.values))
          .call(highlight, null);

        // end labels for the seven + recharts, de-collided in pixel (= log) space
        const ends = [...seven.keys(), ...NPM.alsoLabel].map((k) => {
          const value = series.find((s) => s.k === k).values.at(-1).v;
          return { k, value, v: y(value) };
        });
        svg.append("g").attr("font-weight", 600).selectAll("text")
          .data(spreadLabels(ends, 12, [m.top, h - m.bottom])).join("text")
          .attr("x", w - m.right + 6).attr("y", (d) => d.v).attr("dy", "0.32em")
          .attr("fill", (d) => (seven.has(d.k) ? color(d.k) : theme.muted))
          .text((d) => (indexed ? NPM.index : NPM).endLabel(seven.get(d.k) ?? { label: d.k }, d.value));

        // hover: the nearest point of any series picks the whole line
        const points = series.flatMap((s) => s.values.filter((d) => d.v != null && d.v >= Y.domain[0]));
        const delaunay = d3.Delaunay.from(points, (d) => x(d.t), (d) => y(d.v));
        const tip = svg.append("g").attr("display", "none").attr("pointer-events", "none");
        tip.append("circle").attr("r", 3).attr("fill", theme.text);
        const tipText = tip.append("text").attr("fill", theme.text).attr("stroke", theme.surface)
          .attr("stroke-width", 4).attr("paint-order", "stroke").attr("y", -24);
        svg.on("pointermove", (e) => {
          const p = points[delaunay.find(...d3.pointer(e))];
          path.call(highlight, p.k).filter((s) => s.k === p.k).raise();
          const px = x(p.t);
          tip.attr("display", null).attr("transform", `translate(${px},${y(p.v)})`)
            .attr("text-anchor", px < w / 3 ? "start" : px > (2 * w) / 3 ? "end" : "middle");
          tipText.selectAll("tspan").data([name(p.k), `${d3.utcFormat("%-d %b %Y")(p.t)}: ${p.raw.toLocaleString("en")}/wk` +
            (indexed ? ` (${Y.format(p.v)})` : "")]).join("tspan").attr("x", 0).attr("dy", (d, i) => (i ? "1.15em" : null))
            .attr("font-weight", (d, i) => (i ? null : 600)).text((d) => d);
        }).on("pointerleave", () => {
          tip.attr("display", "none");
          path.call(highlight, null).order();
        });
      }

      function multiples(out) {
        const cols = NPM.multiples.columns(w), ch = NPM.multiples.height, ml = 40, mr = 8;
        const cw = (w - ml - mr) / cols, svg = svgOf(out, Math.ceil(7 / cols) * ch);
        const x = d3.scaleUtc(d3.extent(npm.weeks), [0, cw - 10]);
        const y = d3.scaleLog(NPM.y.domain, [ch - 22, 6]);   // shared by all seven
        const line = d3.line((d, i) => x(npm.weeks[i]), (d) => y(d)).defined((d) => d != null && d >= NPM.y.domain[0]);
        const cell = svg.selectAll("g.cell").data(NPM.seven).join("g")
          .attr("transform", (s, i) => `translate(${ml + (i % cols) * cw},${Math.floor(i / cols) * ch})`);
        cell.each(function (s, i) {
          const g = d3.select(this);
          g.append("g").call(yAxis(y, NPM.y.ticks.filter((t, j) => j % 2 === 0), NPM.y.format, cw - 10))
            .call((a) => a.selectAll("text").attr("display", i % cols ? "none" : null));
          g.append("g").attr("transform", `translate(0,${ch - 22})`).call(d3.axisBottom(x).ticks(3).tickSizeOuter(0))
            .style("font", "inherit").call((a) => a.select(".domain").attr("stroke", theme.baseline));
        });
        cell.append("path").attr("fill", "none").attr("stroke", (s) => color(s.key)).attr("stroke-width", 1.25)
          .attr("d", (s) => line(npm.cols[s.key]));
        cell.append("text").attr("x", 4).attr("y", 14).attr("font-weight", 600).attr("fill", theme.text).text((s) => s.label);
      }

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      return viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" },
        (v, out) => (v === "multiples" ? multiples(out) : lines(out, v === "indexed")));
    },

    life(host, { life }, { theme }) {
      window.__lcTheme = theme;
      const series = life.countries.map((name) => ({
        name,
        values: life.wide.map((r) => ({ year: r.year, v: r[name] })),
      }));
      const { svg, x, y, width } = mkFrame(host, {
        xScale: "linear",
        xFormat: d3.format("d"),
        xDomain: d3.extent(life.years),
        yDomain: [35, 88],
        yNice: false,
        pad: { top: 34 },
      });
      // without .defined(), D3 cannot draw a null at all — the path breaks with NaN
      const line = d3
        .line()
        .defined((d) => d.v != null)
        .x((d) => x(d.year))
        .y((d) => y(d.v))
        .curve(d3.curveMonotoneX);
      series.forEach((s, i) => {
        svg.append("path").datum(s.values).attr("fill", "none")
          .attr("stroke", theme.palette[i]).attr("stroke-width", 2).attr("d", line);
      });
      drawLegend(svg, life.countries, theme.palette, width);
    },
  },
});
