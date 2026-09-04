import { mountDemo } from "../assets/js/page.js";

/* `Chart` is a UMD global; the date-fns adapter bundle registers the
 * time scale. Each render makes a <canvas>, news up a Chart, and
 * returns chart.destroy as the cleanup. */
function canvas(host) {
  const c = document.createElement("canvas");
  c.style.maxHeight = "300px";
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
      "The popular default. Canvas-rendered, small, friendly config object, good docs, huge plugin ecosystem (zoom, annotations, financial). Fine-grained visual control and text-heavy bespoke layouts are harder than in D3/Plot, and canvas output can't be inspected or styled with CSS. Handles a few thousand points comfortably; tens of thousands needs the decimation plugin.",
    docs: "https://www.chartjs.org/docs/latest/",
    cdn: "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.js",
    notes:
      "Core build + <code>chartjs-adapter-date-fns</code> for the time axis. Point radius is 0 with a 12px hit radius so the hover still works on dense data.",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      const chart = new Chart(canvas(host), {
        type: "line",
        data: {
          datasets: [
            { label: "monthly", data: co2.map((d) => ({ x: +d.date, y: d.ppm })),
              borderColor: theme.palette[0] + "66", borderWidth: 1 },
            { label: "trend", data: co2.map((d) => ({ x: +d.date, y: d.trend })),
              borderColor: theme.palette[0], borderWidth: 2 },
          ],
        },
        options: common(theme, {
          x: { type: "time", time: { unit: "year" }, ...xGrid(theme) },
          y: { ...grid(theme) },
        }),
      });
      return () => chart.destroy();
    },

    energy(host, { energy }, { theme }) {
      const chart = new Chart(canvas(host), {
        type: "line",
        data: {
          labels: energy.wide.map((r) => r.year),
          datasets: energy.sources.map((s, i) => ({
            label: s, data: energy.wide.map((r) => r[s]),
            borderColor: theme.palette[i], tension: 0.35,
          })),
        },
        options: common(theme, { x: { ...xGrid(theme) }, y: { beginAtZero: true, ...grid(theme) } }),
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

    btc(host, { btc }, { theme }) {
      const chart = new Chart(canvas(host), {
        type: "line",
        data: {
          datasets: [
            { label: "BTC-USD", data: btc.map((d) => ({ x: +d.date, y: d.close })),
              borderColor: theme.palette[0], borderWidth: 1.2 },
          ],
        },
        options: common(theme, {
          x: { type: "time", time: { unit: "year" }, ...xGrid(theme) },
          y: { ...grid(theme) },
        }),
      });
      return () => chart.destroy();
    },
  },
});
