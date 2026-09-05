import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

/* `Chart` is a UMD global; the date-fns adapter bundle registers the
 * time scale and chartjs-plugin-annotation registers itself. Each render
 * makes a <canvas>, news up a Chart, and returns chart.destroy as the
 * cleanup. */
function canvas(host, height = 300) {
  // responsive + maintainAspectRatio:false means the canvas fills its parent,
  // so the parent is what has to carry the height
  host.style.height = height + "px";
  const c = document.createElement("canvas");
  host.appendChild(c);
  return c;
}

const grid = (theme) => ({
  grid: { color: theme.grid, drawTicks: false },
  border: { color: theme.baseline },
  ticks: { color: theme.muted, font: { size: 10 } },
});
// x-axes get their own tick policy so category years don't collide/rotate
const xGrid = (theme) => ({
  ...grid(theme),
  ticks: { ...grid(theme).ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
});

const common = (theme, scales) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { labels: { color: theme.textSecondary, boxWidth: 12, font: { size: 10 } } },
    tooltip: { enabled: true },
  },
  elements: { point: { radius: 0, hitRadius: 12 }, line: { borderWidth: 2 } },
  scales,
});

mountDemo({
  meta: {
    name: "Chart.js",
    version: "4.5.1",
    bundleKB: 70,
    license: "MIT",
    tagline:
      "The popular default. Canvas-rendered, small, friendly config object, good docs, huge plugin ecosystem. The editorial furniture is all there — but only via chartjs-plugin-annotation, a separate 30 KB dependency, and only up to a point: there is no end-of-line label, so the direct labels drop out of the config object and into hand-written canvas calls in a bespoke plugin.",
    docs: "https://www.chartjs.org/docs/latest/",
    cdn: "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.js",
    notes:
      "Core build + <code>chartjs-adapter-date-fns</code> for the time axis + <code>chartjs-plugin-annotation@3.1.0</code> (~30 KB) for the band, the reference line, the leader line with its arrowhead and the annotation text. The end-of-line labels are the inline <code>endLabels</code> plugin in the snippet below — <code>ctx.fillText</code> at scale pixels, because canvas output cannot be styled after the fact.",
  },
  charts: {
    hero(host, { energy }, { theme }) {
      const { band, ref, note } = HERO;
      const w = host.clientWidth || 640;
      const h = Math.max(280, Math.min(380, Math.round(w * 0.55)));
      const ink = (s) => (s === "wind" ? theme.palette[2] : s === "solar" ? theme.palette[3] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const order = [...HERO.context, ...HERO.emphasis];
      const last = energy.wide[energy.wide.length - 1];
      /* No end-label support anywhere in Chart.js or the annotation plugin,
       * so this draws them straight onto the canvas after the datasets. */
      const endLabels = {
        id: "endLabels",
        afterDatasetsDraw(chart) {
          const { ctx, scales } = chart;
          ctx.save();
          ctx.textBaseline = "middle";
          spreadLabels(
            order.map((s) => ({ s, v: scales.y.getPixelForValue(last[s]) })),
            13, [scales.y.top, scales.y.bottom]
          ).forEach((d) => {
            ctx.fillStyle = ink(d.s);
            ctx.font = `${lead(d.s) ? 600 : 400} 11px ${theme.fontSans}`;
            ctx.fillText(d.s, scales.x.right + 5, d.v);
          });
          ctx.restore();
        },
      };
      const chart = new Chart(canvas(host, h), {
        type: "line",
        plugins: [endLabels],
        data: {
          datasets: order.map((s) => ({
            label: s,
            data: energy.wide.map((r) => ({ x: r.year, y: r[s] })),
            borderColor: ink(s), borderWidth: lead(s) ? 2.6 : 1.5,
            tension: 0.35, pointRadius: 0,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          layout: { padding: { right: 60, top: 6 } },
          scales: {
            x: { type: "linear", min: 1997, max: 2023, grid: { display: false },
              border: { color: theme.baseline },
              ticks: { color: theme.muted, font: { size: 10 }, stepSize: 5,
                maxRotation: 0, callback: (v) => String(v) } },
            y: { min: 0, max: HERO.yMax, grid: { color: theme.grid, drawTicks: false },
              border: { display: false },
              ticks: { color: theme.muted, font: { size: 10 }, maxTicksLimit: 5 } },
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
            annotation: {                                   // the whole editorial layer
              annotations: {
                band: { type: "box", drawTime: "beforeDatasetsDraw",
                  xMin: band.x0, xMax: band.x1, backgroundColor: theme.grid,
                  borderWidth: 0 },
                bandLabel: { type: "label", xValue: (band.x0 + band.x1) / 2, yValue: band.labelY,
                  content: band.label, color: theme.muted, font: { size: 10 } },
                ref: { type: "line", yMin: ref.y, yMax: ref.y, borderColor: theme.baseline,
                  borderWidth: 1, borderDash: [4, 3],
                  label: { display: true, content: ref.label, position: "start",
                    color: theme.muted, font: { size: 10 }, yAdjust: -9,
                    backgroundColor: "transparent" } },
                leader: { type: "line", xMin: note.x, xMax: note.x,          // leader + arrowhead
                  yMin: note.to, yMax: note.from,
                  borderColor: theme.textSecondary, borderWidth: 1,
                  arrowHeads: { start: { display: true, length: 7, width: 4,
                    fill: true, backgroundColor: theme.textSecondary,
                    borderColor: theme.textSecondary } } },
                note: { type: "label", xValue: note.x, yValue: note.textY,
                  content: note.text, color: theme.text, font: { size: 11.5 } },
              },
            },
          },
        },
      });
      return () => chart.destroy();
    },

    life(host, { life }, { theme }) {
      const chart = new Chart(canvas(host), {
        type: "line",
        data: {
          labels: life.years,
          datasets: life.countries.map((c, i) => ({
            label: c, data: life.wide.map((r) => r[c]),   // nulls → gaps
            borderColor: theme.palette[i], spanGaps: false, tension: 0.3,
          })),
        },
        options: common(theme, {
          x: { ...xGrid(theme) },
          y: { min: 35, max: 88, ...grid(theme) },
        }),
      });
      return () => chart.destroy();
    },
  },
});
