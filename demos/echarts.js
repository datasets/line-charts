import { mountDemo } from "../assets/js/page.js";

/* `echarts` is a UMD global. init() needs a sized element, so each
 * render fixes the host height, inits an SVG instance, and returns
 * dispose() as cleanup. One shared base option carries the theme. */
function chart(host, theme) {
  host.style.height = "300px";
  const c = window.echarts.init(host, null, { renderer: "svg" });
  return c;
}

const axisCommon = (theme) => ({
  axisLine: { lineStyle: { color: theme.baseline } },
  axisLabel: { color: theme.muted, fontSize: 10 },
  splitLine: { lineStyle: { color: theme.grid } },
  axisTick: { show: false },
});

const baseOption = (theme, extra) => ({
  color: theme.palette,
  textStyle: { fontFamily: theme.fontSans },
  grid: { top: 34, right: 16, bottom: 28, left: 48 },
  tooltip: { trigger: "axis", backgroundColor: theme.surface, borderColor: theme.grid,
    textStyle: { color: theme.text } },
  legend: { top: 4, textStyle: { color: theme.textSecondary, fontSize: 10 } },
  ...extra,
});

mountDemo({
  meta: {
    name: "Apache ECharts",
    version: "5.6.0",
    bundleKB: 330,
    license: "Apache-2.0",
    tagline:
      "Production-hardened, Apache-governed, used at very large scale. Canvas or SVG renderer, built-in dataZoom (slider + inside), rich tooltips, visualMap, progressive rendering for huge series, and SSR. The option object gets deep and imperative for elaborate charts, and the house style needs taming, but it is the safest pick for a heavy-duty dashboard.",
    docs: "https://echarts.apache.org/en/option.html",
    cdn: "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js",
    notes:
      "Full build via UMD. BTC card enables <code>dataZoom</code> (drag the slider, or scroll/drag inside the plot). SVG renderer chosen here for parity with the others; Canvas is the default and is faster on very large series.",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      const c = chart(host, theme);
      c.setOption(baseOption(theme, {
        legend: { top: 4, data: ["monthly", "trend"], textStyle: { color: theme.textSecondary, fontSize: 10 } },
        xAxis: { type: "time", ...axisCommon(theme) },
        yAxis: { type: "value", scale: true, ...axisCommon(theme) },
        series: [
          { name: "monthly", type: "line", showSymbol: false, color: theme.palette[0],
            lineStyle: { width: 1, opacity: 0.35 }, data: co2.map((d) => [d.date, d.ppm]) },
          { name: "trend", type: "line", showSymbol: false, color: theme.palette[0],
            lineStyle: { width: 2 }, data: co2.map((d) => [d.date, d.trend]) },
        ],
      }));
      return () => c.dispose();
    },

    energy(host, { energy }, { theme }) {
      const c = chart(host, theme);
      c.setOption(baseOption(theme, {
        xAxis: { type: "category", boundaryGap: false,
          data: energy.wide.map((r) => r.year), ...axisCommon(theme) },
        yAxis: { type: "value", ...axisCommon(theme) },
        series: energy.sources.map((s) => ({
          name: s, type: "line", smooth: true, showSymbol: false,
          data: energy.wide.map((r) => r[s]),
        })),
      }));
      return () => c.dispose();
    },

    life(host, { life }, { theme }) {
      const c = chart(host, theme);
      c.setOption(baseOption(theme, {
        xAxis: { type: "category", boundaryGap: false,
          data: life.years, ...axisCommon(theme) },
        yAxis: { type: "value", min: 35, max: 88, ...axisCommon(theme) },
        series: life.countries.map((country) => ({
          name: country, type: "line", smooth: true, showSymbol: false, connectNulls: false,
          data: life.wide.map((r) => r[country]),
        })),
      }));
      return () => c.dispose();
    },

    btc(host, { btc }, { theme }) {
      const c = chart(host, theme);
      c.setOption(baseOption(theme, {
        legend: { show: false },
        grid: { top: 16, right: 16, bottom: 54, left: 56 },
        xAxis: { type: "time", ...axisCommon(theme) },
        yAxis: { type: "value", scale: true, ...axisCommon(theme) },
        dataZoom: [
          { type: "inside" },
          { type: "slider", height: 18, bottom: 8, borderColor: theme.grid },
        ],
        series: [
          { type: "line", showSymbol: false, lineStyle: { width: 1.2 },
            data: btc.map((d) => [d.date, d.close]), sampling: "lttb" },
        ],
      }));
      return () => c.dispose();
    },
  },
});
