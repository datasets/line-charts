import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { mountDemo } from "../assets/js/page.js";

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

/* Crosshair + nearest-point tooltip, reused by the single-series cards. */
function crosshair(host, svg, x, y, points, fmt) {
  const t = window.__lcTheme;
  const tip = document.createElement("div");
  tip.className = "lc-tip";
  host.style.position = "relative";
  host.appendChild(tip);
  const rule = svg.append("line").attr("stroke", t.muted).attr("stroke-dasharray", "3 3").attr("y1", 0).style("opacity", 0);
  const dot = svg.append("circle").attr("r", 3.5).attr("fill", t.text).style("opacity", 0);
  const bis = d3.bisector((d) => d.x).center;
  svg.on("pointermove", (ev) => {
    const [mx] = d3.pointer(ev);
    const d = points[bis(points, x.invert(mx))];
    if (!d) return;
    const px = x(d.x), py = y(d.v);
    rule.attr("x1", px).attr("x2", px).attr("y2", y.range()[0]).style("opacity", 1);
    dot.attr("cx", px).attr("cy", py).style("opacity", 1);
    tip.style.opacity = 1;
    tip.style.left = Math.min(px + 12, host.clientWidth - 120) + "px";
    tip.style.top = py - 10 + "px";
    tip.innerHTML = fmt(d);
  });
  svg.on("pointerleave", () => {
    rule.style("opacity", 0); dot.style("opacity", 0); tip.style.opacity = 0;
  });
}

/* Simple top-left swatch legend — reused by the multi-series cards. */
function drawLegend(svg, names, palette) {
  const g = svg.append("g").attr("transform", "translate(46,8)");
  let x = 0;
  names.forEach((name, i) => {
    const item = g.append("g").attr("transform", `translate(${x},0)`);
    item.append("line").attr("x1", 0).attr("x2", 14).attr("y1", 0).attr("y2", 0)
      .attr("stroke", palette[i % palette.length]).attr("stroke-width", 2.5);
    item.append("text").attr("x", 18).attr("dy", "0.32em")
      .attr("fill", window.__lcTheme.textSecondary).attr("font-size", 11).text(name);
    x += 18 + name.length * 6.6 + 14;
  });
}

mountDemo({
  meta: {
    name: "D3",
    version: "7.9.0",
    bundleKB: 90,
    license: "ISC / BSD",
    tagline:
      "Not a chart library — a low-level toolkit of scales, shape generators, axes and selections. You build the chart. The quality ceiling is the highest here and nothing is off-limits, but every pixel is your code.",
    docs: "https://d3js.org/",
    cdn: "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm",
    notes:
      "Each snippet shares a ~35-line <code>mkFrame()</code> helper (margins, responsive SVG, themed axis + gridlines) and a <code>crosshair()</code> tooltip helper — shown once at the top of the module, omitted from the per-card source below.",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      window.__lcTheme = theme;
      const pts = co2.map((d) => ({ x: d.date, v: d.ppm }));
      const trend = co2.filter((d) => d.trend != null).map((d) => ({ x: d.date, v: d.trend }));
      const { svg, x, y } = mkFrame(host, {
        xDomain: d3.extent(pts, (d) => d.x),
        yDomain: [d3.min(pts, (d) => d.v) - 3, d3.max(pts, (d) => d.v) + 3],
      });
      const line = d3.line().x((d) => x(d.x)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
      svg.append("path").datum(pts).attr("fill", "none")
        .attr("stroke", theme.palette[0]).attr("stroke-opacity", 0.35).attr("stroke-width", 1).attr("d", line);
      svg.append("path").datum(trend).attr("fill", "none")
        .attr("stroke", theme.palette[0]).attr("stroke-width", 2).attr("d", line);
      crosshair(host, svg, x, y, pts, (d) =>
        `${d.x.getUTCFullYear()}-${String(d.x.getUTCMonth() + 1).padStart(2, "0")} &nbsp; <b>${d.v.toFixed(2)} ppm</b>`);
    },

    energy(host, { energy }, { theme }) {
      window.__lcTheme = theme;
      const series = energy.sources.map((name) => ({
        name,
        values: energy.wide.map((r) => ({ year: r.year, v: r[name] })),
      }));
      const { svg, x, y } = mkFrame(host, {
        xScale: "linear",
        xFormat: d3.format("d"),
        xDomain: d3.extent(energy.wide, (d) => d.year),
        yDomain: [0, d3.max(series, (s) => d3.max(s.values, (d) => d.v))],
      });
      const line = d3.line().x((d) => x(d.year)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
      series.forEach((s, i) => {
        svg.append("path").datum(s.values).attr("fill", "none")
          .attr("stroke", theme.palette[i]).attr("stroke-width", 2).attr("d", line);
      });
      drawLegend(svg, energy.sources, theme.palette);
    },

    life(host, { life }, { theme }) {
      window.__lcTheme = theme;
      const series = life.countries.map((name) => ({
        name,
        values: life.wide.map((r) => ({ year: r.year, v: r[name] })),
      }));
      const { svg, x, y } = mkFrame(host, {
        xScale: "linear",
        xFormat: d3.format("d"),
        xDomain: d3.extent(life.years),
        yDomain: [35, 88],
        yNice: false,
      });
      // .defined() is how D3 breaks the line across missing years
      const line = d3
        .line()
        .defined((d) => d.v != null)
        .x((d) => x(d.year))
        .y((d) => y(d.v))
        .curve(d3.curveMonotoneX);
      series.forEach((s, i) => {
        svg.append("path").datum(s.values).attr("fill", "none")
          .attr("stroke", theme.palette[i]).attr("stroke-width", 2).attr("d", line);
        // faint bridge showing where data is missing
        svg.append("path").datum(s.values.filter((d) => d.v != null)).attr("fill", "none")
          .attr("stroke", theme.palette[i]).attr("stroke-width", 1).attr("stroke-dasharray", "2 3")
          .attr("stroke-opacity", 0.4).attr("d", d3.line().x((d) => x(d.year)).y((d) => y(d.v)));
      });
      drawLegend(svg, life.countries, theme.palette);
    },

    btc(host, { btc }, { theme }) {
      window.__lcTheme = theme;
      const pts = btc.map((d) => ({ x: d.date, v: d.close }));
      const { svg, x, y } = mkFrame(host, {
        xDomain: d3.extent(pts, (d) => d.x),
        yDomain: [0, d3.max(pts, (d) => d.v) * 1.05],
        pad: { left: 54 },
      });
      // 4k points as one <path> — SVG handles it fine at this size
      const line = d3.line().x((d) => x(d.x)).y((d) => y(d.v));
      svg.append("path").datum(pts).attr("fill", "none")
        .attr("stroke", theme.palette[0]).attr("stroke-width", 1.25).attr("d", line);
      crosshair(host, svg, x, y, pts, (d) =>
        `${d.x.toISOString().slice(0, 10)} &nbsp; <b>$${Math.round(d.v).toLocaleString()}</b>`);
    },
  },
});
