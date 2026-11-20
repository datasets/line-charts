import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

/* `uPlot` is an IIFE global. Data is columnar: [xs, ...ys]. It wants a
 * pixel width, so each render reads host.clientWidth and returns
 * u.destroy as cleanup. Grid/axis colours come from the theme. */
const W = (host) => Math.max(host.clientWidth - 4, 320);

const axes = (theme, opts = {}) => [
  {
    stroke: theme.muted, size: 34,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.grid, width: 1 },
    ...opts.x,
  },
  {
    stroke: theme.muted, size: 50,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.grid, width: 1 },
    ...opts.y,
  },
];

mountDemo({
  meta: {
    name: "µPlot",
    version: "1.6.32",
    bundleKB: 18,
    license: "MIT",
    tagline:
      "The performance option: ~18 KB, renders and rescales hundreds of thousands of points on Canvas in a couple of milliseconds. In return you get a spartan API and no annotation model whatsoever — no band, no reference line, no label, no arrow. Everything editorial is your own canvas code inside a draw hook, in device pixels, with no scene graph to hit-test or restyle afterwards. It is the only library here where the annotated chart is mostly not a chart-library problem.",
    docs: "https://github.com/leeoniya/uPlot/tree/master/docs",
    cdn: "https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js",
    notes:
      "The hero chart uses three hooks: <code>drawClear</code> (before anything) for the band, <code>drawAxes</code> (after the gridlines, before the series) for the reference line, and <code>draw</code> (after the series) for the leader, the arrowhead and every label. Every size is multiplied by the static <code>uPlot.pxRatio</code> because hooks work in device pixels, not CSS pixels. Drag horizontally on the life-expectancy chart to zoom; double-click to reset.",
  },
  charts: {
    // RETIRED v1 hero (synthetic energy data), kept only as a reference for
    // the annotation machinery. Not in KEYS, so it never runs; HERO no longer
    // has the fields it reads. Delete once hero/grid/npm are built (docs/TESTS.md).
    energyV1(host, { hero }, { theme }) {
      const { band, ref, note } = HERO;
      const w = host.clientWidth || 640;
      const h = Math.max(280, Math.min(380, Math.round(w * 0.55)));
      const order = [...HERO.context, ...HERO.emphasis];
      const ink = (s) => (s in HERO.slot ? theme.palette[HERO.slot[s]] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const last = hero.wide[hero.wide.length - 1];
      /* Hooks hand you a raw 2D context in device pixels: every coordinate
       * comes back from valToPos(…, true) and every size — line width, font,
       * gap — has to be scaled by the device pixel ratio by hand. The ratio
       * is a static, uPlot.pxRatio, not a property of the instance. */
      const px = (u, v, axis) => u.valToPos(v, axis, true);
      const text = (u, str, x, y, fill, size = 11, weight = 400, align = "center") => {
        u.ctx.fillStyle = fill;
        u.ctx.textAlign = align;
        u.ctx.textBaseline = "middle";
        u.ctx.font = `${weight} ${size * uPlot.pxRatio}px ${theme.fontSans}`;
        u.ctx.fillText(str, x, y);
      };
      const u = new uPlot({
        width: w, height: h,
        padding: [10, 64, 0, 0],       // room on the right for the end labels
        cursor: { show: false }, legend: { show: false },
        scales: { x: { time: false, range: HERO.x.domain }, y: { range: [0, HERO.yMax] } },
        series: [
          {},
          ...order.map((s) => ({
            label: s, stroke: ink(s), width: lead(s) ? 2.6 : 1.5,
            alpha: HERO.opacity[s] ?? 1,
            paths: uPlot.paths.spline(), points: { show: false },   // monotone cubic
          })),
        ],
        axes: [
          { stroke: theme.muted, size: 30, font: `10px ${theme.fontSans}`,
            grid: { show: false }, ticks: { stroke: theme.baseline, size: 4 },
            incrs: [HERO.x.step, 2 * HERO.x.step],   // whole steps, never fractions
            values: (u, vals) => vals.map((v) => String(v)) },
          { stroke: theme.muted, size: 38, font: `10px ${theme.fontSans}`,
            grid: { stroke: theme.grid, width: 1 }, ticks: { show: false } },
        ],
        hooks: {
          // behind everything, gridlines included
          drawClear: [
            (u) => {
              const ctx = u.ctx;
              const x0 = px(u, band.x0, "x"), x1 = px(u, band.x1, "x");
              ctx.save();
              ctx.fillStyle = theme.grid;
              ctx.globalAlpha = 0.7;
              ctx.fillRect(x0, u.bbox.top, x1 - x0, u.bbox.height);
              ctx.restore();
            },
          ],
          // after the gridlines, before the series: the dashed reference line
          drawAxes: [
            (u) => {
              const ctx = u.ctx, r = uPlot.pxRatio, ry = px(u, ref.y, "y");
              ctx.save();
              ctx.strokeStyle = theme.baseline;
              ctx.lineWidth = r;
              ctx.setLineDash([4 * r, 3 * r]);
              ctx.beginPath();
              ctx.moveTo(u.bbox.left, ry);
              ctx.lineTo(u.bbox.left + u.bbox.width, ry);
              ctx.stroke();
              ctx.restore();
            },
          ],
          // on top of the series
          draw: [
            (u) => {
              const ctx = u.ctx, r = uPlot.pxRatio;
              const nx = px(u, note.x, "x"), tip = px(u, note.to, "y");
              ctx.save();
              ctx.strokeStyle = theme.textSecondary;
              ctx.fillStyle = theme.textSecondary;
              ctx.lineWidth = r;
              ctx.beginPath();                         // leader line
              ctx.moveTo(nx, px(u, note.from, "y"));
              ctx.lineTo(nx, tip - 5 * r);
              ctx.stroke();
              ctx.beginPath();                         // arrowhead
              ctx.moveTo(nx, tip);
              ctx.lineTo(nx - 3.5 * r, tip - 7 * r);
              ctx.lineTo(nx + 3.5 * r, tip - 7 * r);
              ctx.fill();
              text(u, note.text, nx, px(u, note.textY, "y"), theme.text, 11.5);
              text(u, band.label, px(u, (band.x0 + band.x1) / 2, "x"),
                px(u, band.labelY, "y"), theme.muted, 10);
              text(u, ref.label, px(u, ref.labelX, "x"), px(u, ref.labelY, "y"),
                theme.muted, 10, 400, "left");
              spreadLabels(                            // direct labels
                order.map((s) => ({ s, v: px(u, last[s], "y") })),
                13 * r, [u.bbox.top, u.bbox.top + u.bbox.height]
              ).forEach((d) => {
                text(u, d.s, u.bbox.left + u.bbox.width + 5 * r, d.v,
                  ink(d.s), 11, lead(d.s) ? 600 : 400, "left");
              });
              ctx.restore();
            },
          ],
        },
      }, [hero.wide.map((r) => r.x), ...order.map((s) => hero.wide.map((r) => r[s]))], host);
      return () => u.destroy();
    },

    life(host, { life }, { theme }) {
      const data = [
        life.years,
        ...life.countries.map((c) => life.wide.map((r) => r[c])),  // nulls break the line by default
      ];
      const u = new uPlot({
        width: W(host), height: 300,
        scales: { x: { time: false }, y: { range: [35, 88] } },
        series: [
          { label: "year" },
          ...life.countries.map((c, i) => ({
            label: c, stroke: theme.palette[i], width: 2,
          })),
        ],
        axes: axes(theme, { x: { values: (u, v) => v.map((x) => String(x)) } }),
      }, data, host);
      return () => u.destroy();
    },
  },
});
