import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

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
    version: "7.9.0",
    bundleKB: 90,
    license: "ISC / BSD",
    tagline:
      "Not a chart library — a low-level toolkit of scales, shape generators, axes and selections. You build the chart. The quality ceiling is the highest here and nothing is off-limits: the annotation, the band and the labels are the same kind of object as the lines, so none of them is a special case you have to hope the library supports. Every pixel is your code, and the hero chart is roughly three times the code of the declarative options.",
    docs: "https://d3js.org/",
    cdn: "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm",
    notes:
      "The hero chart below is standalone — scales, axes, gridlines, band, reference line, leader line, arrowhead and labels are all in the snippet, nothing hidden in a helper. The life-expectancy card uses a shared ~35-line <code>mkFrame()</code> helper shown at the top of the module instead.",
  },
  charts: {
    hero(host, { energy }, { theme }) {
      const { band, ref, note } = HERO;
      const w = host.clientWidth || 640;
      const h = Math.max(280, Math.min(380, Math.round(w * 0.55)));
      const m = { top: 14, right: 64, bottom: 24, left: 42 };
      const ink = (s) => (s === "wind" ? theme.palette[2] : s === "solar" ? theme.palette[3] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const svg = d3.select(host).append("svg")
        .attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
      const x = d3.scaleLinear([1997, 2023], [m.left, w - m.right]);
      const y = d3.scaleLinear([0, HERO.yMax], [h - m.bottom, m.top]);

      // 1. the band, first so everything else lands on top of it
      svg.append("rect")
        .attr("x", x(band.x0)).attr("width", x(band.x1) - x(band.x0))
        .attr("y", m.top).attr("height", h - m.top - m.bottom)
        .attr("fill", theme.grid).attr("opacity", 0.7);
      svg.append("text")
        .attr("x", x((band.x0 + band.x1) / 2)).attr("y", y(band.labelY))
        .attr("text-anchor", "middle").attr("fill", theme.muted).attr("font-size", 10)
        .text(band.label);

      // 2. axes and gridlines
      svg.append("g").attr("transform", `translate(0,${h - m.bottom})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")).tickSizeOuter(0))
        .call((g) => g.selectAll(".domain").attr("stroke", theme.baseline))
        .call((g) => g.selectAll("text").attr("fill", theme.muted).attr("font-size", 10));
      svg.append("g").attr("transform", `translate(${m.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll(".tick line").clone()
          .attr("x2", w - m.left - m.right).attr("stroke", theme.grid))
        .call((g) => g.selectAll("text").attr("fill", theme.muted).attr("font-size", 10));

      // 3. the dashed reference line
      svg.append("line")
        .attr("x1", m.left).attr("x2", w - m.right).attr("y1", y(ref.y)).attr("y2", y(ref.y))
        .attr("stroke", theme.baseline).attr("stroke-dasharray", "4 3");
      svg.append("text")
        .attr("x", x(ref.labelX)).attr("y", y(ref.labelY))
        .attr("fill", theme.muted).attr("font-size", 10).text(ref.label);

      // 4. the lines: muted context first, emphasis over the top
      const line = d3.line().x((d) => x(d.year)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
      [...HERO.context, ...HERO.emphasis].forEach((s) => {
        svg.append("path")
          .datum(energy.wide.map((r) => ({ year: r.year, v: r[s] })))
          .attr("fill", "none").attr("stroke", ink(s))
          .attr("stroke-width", lead(s) ? 2.6 : 1.5)
          .attr("stroke-opacity", s === "nuclear" ? 0.65 : 1)
          .attr("d", line);
      });

      // 5. the annotation: leader line, a hand-drawn arrowhead, and the text
      svg.append("line")
        .attr("x1", x(note.x)).attr("x2", x(note.x))
        .attr("y1", y(note.from)).attr("y2", y(note.to) - 5)
        .attr("stroke", theme.textSecondary);
      svg.append("path")
        .attr("d", `M${x(note.x)},${y(note.to)} l-3.5,-7 l7,0 Z`)
        .attr("fill", theme.textSecondary);
      svg.append("text")
        .attr("x", x(note.x)).attr("y", y(note.textY)).attr("text-anchor", "middle")
        .attr("fill", theme.text).attr("font-size", 11.5).text(note.text);

      // 6. direct labels, pushed apart in pixel space
      const last = energy.wide[energy.wide.length - 1];
      spreadLabels(
        [...HERO.context, ...HERO.emphasis].map((s) => ({ s, v: y(last[s]) })),
        13, [m.top, h - m.bottom]
      ).forEach((d) => {
        svg.append("text")
          .attr("x", w - m.right + 5).attr("y", d.v).attr("dy", "0.32em")
          .attr("fill", ink(d.s)).attr("font-size", 11)
          .attr("font-weight", lead(d.s) ? 600 : 400)
          .text(d.s);
      });
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
      drawLegend(svg, life.countries, theme.palette, width);
    },
  },
});
