import { mountDemo } from "../assets/js/page.js";
import { HERO } from "../assets/js/data.js";

/* `echarts` is a UMD global. init() needs a sized element, so each
 * render fixes the host height, inits an SVG instance, and returns
 * dispose() as cleanup. One shared base option carries the theme. */
function chart(host, height = 300) {
  host.style.height = height + "px";
  return window.echarts.init(host, null, { renderer: "svg" });
}

// hero charts size to the card and stay in a readable band of heights
const heroBox = (host) => {
  const w = host.clientWidth || 640;
  return { w, h: Math.max(280, Math.min(380, Math.round(w * 0.55))) };
};

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
      "Production-hardened, Apache-governed, used at very large scale. Canvas or SVG renderer, built-in dataZoom, rich tooltips, progressive rendering for huge series, and SSR. The option object gets deep and imperative for elaborate charts, and the house style needs taming, but the annotation layer — markArea, markLine, markPoint, endLabel — is the most complete here, and it is the safest pick for a heavy-duty dashboard.",
    docs: "https://echarts.apache.org/en/option.html",
    cdn: "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js",
    notes:
      "Full build via UMD, SVG renderer for parity with the others (Canvas is the default and is faster on very large series). Every piece of the hero chart's furniture is a first-class option: <code>series.endLabel</code> for the direct labels, <code>markArea</code> for the band, <code>markLine</code> for the reference line and the leader, <code>markPoint</code> for the annotation text.",
  },
  charts: {
    hero(host, { energy }, { theme }) {
      const { h } = heroBox(host);
      const c = chart(host, h);
      const ink = (s) => (s === "wind" ? theme.palette[2] : s === "solar" ? theme.palette[3] : theme.muted);
      const lead = (s) => HERO.emphasis.includes(s);
      const { band, ref, note } = HERO;
      c.setOption({
        textStyle: { fontFamily: theme.fontSans },
        animation: false,
        grid: { top: 14, right: 64, bottom: 24, left: 42 },
        xAxis: { type: "value", min: 1997, max: 2023, minInterval: 1,
          axisLabel: { color: theme.muted, fontSize: 10, formatter: (v) => String(v) },
          axisLine: { lineStyle: { color: theme.baseline } },
          splitLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: "value", min: 0, max: HERO.yMax,
          axisLabel: { color: theme.muted, fontSize: 10 },
          axisLine: { show: false }, axisTick: { show: false },
          splitLine: { lineStyle: { color: theme.grid } } },
        // context first so the emphasised series draw on top of them
        series: [...HERO.context, ...HERO.emphasis].map((s, i) => ({
          name: s, type: "line", smooth: true, showSymbol: false, z: lead(s) ? 4 : 2,
          data: energy.wide.map((r) => [r.year, r[s]]),
          lineStyle: { color: ink(s), width: lead(s) ? 2.6 : 1.5, opacity: s === "nuclear" ? 0.65 : 1 },
          endLabel: { show: true, formatter: s, color: ink(s), fontSize: 11,
            fontWeight: lead(s) ? 600 : 400, offset: [4, 0] },
          labelLayout: { moveOverlap: "shiftY" },   // keeps the end labels apart
          ...(i === 0 ? {
            markArea: {                              // the shaded event band
              silent: true, itemStyle: { color: theme.grid, opacity: 0.7 },
              label: { show: true, position: "insideTop", formatter: band.label,
                color: theme.muted, fontSize: 10, offset: [0, -2] },
              data: [[{ xAxis: band.x0 }, { xAxis: band.x1 }]],
            },
            markLine: {                              // reference line + leader line
              silent: true, symbol: "none", animation: false,
              data: [
                { yAxis: ref.y, lineStyle: { color: theme.baseline, type: "dashed", width: 1 },
                  label: { show: true, position: "insideStartTop", formatter: ref.label,
                    color: theme.muted, fontSize: 10 } },
                [{ coord: [note.x, note.from], label: { show: false },
                   lineStyle: { color: theme.textSecondary, width: 1, type: "solid" } },
                 { coord: [note.x, note.to], symbol: "arrow", symbolSize: 7, symbolRotate: 180 }],
              ],
            },
            markPoint: {                             // the annotation text itself
              silent: true, symbol: "circle", symbolSize: 0.1, animation: false,
              label: { show: true, formatter: note.text, color: theme.text, fontSize: 11.5 },
              data: [{ coord: [note.x, note.textY] }],
            },
          } : {}),
        })),
      });
      return () => c.dispose();
    },

    life(host, { life }, { theme }) {
      const c = chart(host, 300);
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
  },
});
