import { mountDemo, spreadLabels } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

/* `Chart` is a UMD global and chartjs-plugin-annotation registers itself. Each render
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
      "The popular default. Canvas-rendered, small, friendly config object, good docs, huge plugin ecosystem. The editorial furniture is all there — but only via chartjs-plugin-annotation, a separate 30 KB dependency, and with one gap: there is no end-of-line label, so the direct labels are one plugin label per series, which the plugin places but does not keep apart.",
    docs: "https://www.chartjs.org/docs/latest/",
    cdn: "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.js",
    notes:
      "Core build + <code>chartjs-plugin-annotation@3.1.0</code> (~30 KB) for the band, the reference line, the leader line with its arrowhead, the annotation text and the end-of-line labels. The end labels are <code>type: \"label\"</code> annotations at the last x value, with the plugin's <code>clip</code> turned off so they can sit in the right-hand padding, de-collided by the shared <code>spreadLabels()</code> helper like the other libraries.",
  },
  charts: {
    hero(host, { hero }, { theme }) {
      const { band, ref, note } = HERO;
      const w = host.clientWidth || 640;
      const h = Math.max(280, Math.min(380, Math.round(w * 0.55)));
      const ink = (s) => (s in HERO.slot ? theme.palette[HERO.slot[s]] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const order = [...HERO.context, ...HERO.emphasis];
      const last = hero.wide[hero.wide.length - 1];
      // the annotation plugin places labels but never moves them apart, so
      // the end labels are de-collided first, in data units (13px through the y scale)
      const ends = spreadLabels(order.map((s) => ({ s, v: last[s] })),
        (13 * HERO.yMax) / (h - 30), [0, HERO.yMax]);
      const chart = new Chart(canvas(host, h), {
        type: "line",
        data: {
          datasets: order.map((s) => ({
            label: s,
            data: hero.wide.map((r) => ({ x: r.x, y: r[s] })),
            borderColor: Chart.helpers.color(ink(s)).alpha(HERO.opacity[s] ?? 1).rgbString(),
            borderWidth: lead(s) ? 2.6 : 1.5,
            cubicInterpolationMode: "monotone", pointRadius: 0,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          layout: { padding: { right: 60, top: 6 } },
          scales: {
            x: { type: "linear", min: HERO.x.domain[0], max: HERO.x.domain[1], grid: { display: false },
              border: { color: theme.baseline },
              ticks: { color: theme.muted, font: { size: 10 }, stepSize: HERO.x.step,
                maxRotation: 0, callback: (v) => String(v) } },
            y: { min: 0, max: HERO.yMax, grid: { color: theme.grid, drawTicks: false },
              border: { display: false },
              ticks: { color: theme.muted, font: { size: 10 }, maxTicksLimit: 5 } },
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
            annotation: {                                   // the whole editorial layer
              clip: false,                                  // end labels sit outside the plot
              annotations: {
                band: { type: "box", drawTime: "beforeDatasetsDraw",
                  xMin: band.x0, xMax: band.x1, backgroundColor: theme.grid + "b3",   // 70%
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
                ...Object.fromEntries(ends.map((d) => [d.s, { type: "label",   // direct labels
                  xValue: HERO.x.domain[1], yValue: d.v, content: d.s, color: ink(d.s),
                  position: { x: "start", y: "center" }, xAdjust: 5, padding: 0,
                  font: { size: 11, weight: lead(d.s) ? 600 : 400 } }])),
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
            label: c, data: life.wide.map((r) => r[c]),   // nulls break the line by default
            borderColor: theme.palette[i], tension: 0.3,
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
