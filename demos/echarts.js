import { mountDemo, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink } from "../assets/js/data.js";

/* `echarts` is a UMD global. init() needs a sized element, so each render
 * fixes the host height, inits an instance and returns dispose() as cleanup.
 * The house style is tamed once, the ECharts way: a theme object passed to
 * init() (`echarts.init(host, houseStyle(theme))`), so the render functions
 * hold only chart logic. */
const houseStyle = (t) => {
  const axis = {
    axisLine: { lineStyle: { color: t.baseline } },
    axisTick: { show: false },
    axisLabel: { color: t.textSecondary, fontSize: 11 },
    splitLine: { lineStyle: { color: t.grid } },
  };
  return {
    color: t.palette,
    backgroundColor: "transparent",
    textStyle: { fontFamily: t.fontSans, color: t.text },
    timeAxis: { ...axis, splitLine: { show: false } },
    valueAxis: { ...axis, axisLine: { show: false } },
    logAxis: { ...axis, axisLine: { show: false } },
    categoryAxis: axis,
    legend: { textStyle: { color: t.textSecondary, fontSize: 11 } },
    tooltip: { backgroundColor: t.surface, borderColor: t.grid, textStyle: { color: t.text, fontSize: 12 } },
    toolbox: { iconStyle: { borderColor: t.muted } },
    dataZoom: { textStyle: { color: t.textSecondary }, borderColor: t.grid, fillerColor: "rgba(137,135,129,0.14)",
      dataBackground: { lineStyle: { color: t.muted }, areaStyle: { color: t.grid } },
      selectedDataBackground: { lineStyle: { color: t.textSecondary }, areaStyle: { color: t.baseline } },
      handleStyle: { color: t.surface, borderColor: t.muted }, moveHandleStyle: { color: t.baseline } },
  };
};

// the v1 `life` chart still uses this small helper (SVG renderer, unchanged)
function chart(host, height = 300) {
  host.style.height = height + "px";
  return window.echarts.init(host, null, { renderer: "svg" });
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
    version: "6.1.0",
    bundleKB: 368,
    license: "Apache-2.0",
    tagline:
      "Production-hardened, Apache-governed, used at very large scale. Canvas or SVG renderer, built-in dataZoom, rich tooltips, min-max sampling for dense series, and SSR. The option object gets deep and imperative for elaborate charts, and the house style needs taming, but the annotation layer — markArea, markLine, markPoint, endLabel — is the most complete here, and it is the safest pick for a heavy-duty dashboard.",
    docs: "https://echarts.apache.org/en/option.html",
    cdn: "https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js",
    notes:
      "Full build via UMD, Canvas renderer (the default) for the three tests; the house style is one theme object handed to <code>init()</code>, outside the counted render functions. Every piece of chart furniture is a first-class option: <code>endLabel</code> + <code>labelLayout</code> for de-collided direct labels, <code>markArea</code> for bands, <code>markLine</code> for rules and leaders, <code>markPoint</code> for callout text, <code>dataZoom</code> and <code>toolbox</code> for zoom.",
    cardNotes: {
      defaults: "A symbol on every one of the ~20k points, seven-year ticks and a y-axis from −60 to 150; no legend and no tooltip (both are components you opt into). The default light theme ignores dark mode.",
      hero: "Everything is an option, nothing is drawn by hand: <code>markArea</code> bands, <code>markLine</code> zero rule and leaders, <code>markPoint</code> dots and callout text, and <code>endLabel</code> with <code>labelLayout: { moveOverlap }</code> de-collides the end labels itself. Explicit decade and dollar ticks need <code>customValues</code> (5.5.1+).",
      grid: "All 1.25M points, no ladder step: the typed arrays go straight into a column-keyed <code>dataset</code>, Canvas renderer, <code>sampling: \"minmax\"</code> (per-pixel min and max, so the solar peak survives). First paint about 100 ms; unsampled it still paints in about 0.3 s but hover and zoom drop to ~5 fps. <code>dataZoom</code> (wheel, drag, slider) and <code>toolbox</code> (box zoom, reset) are built in. One catch: sampled series keep different timestamps, so the stock axis tooltip lists one series; the formatter reads the whole dataset row instead.",
      npm: "Log axis, <code>endLabel</code> + <code>labelLayout</code> (de-collided), <code>emphasis.focus: \"series\"</code> dimming and the matrix-laid small multiples are all options. Two things are by hand: the index (no normalise transform) and nearest-line hover, because ECharts hit-tests a line only on its stroke and line events carry no data index, so ~10 lines find the nearest series at the hovered week and dispatch <code>highlight</code> + <code>showTip</code>.",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      const w = host.clientWidth || 640;
      host.style.height = HERO.height(w) + "px";
      const c = echarts.init(host, houseStyle(theme));
      const date = (d) => +new Date(d);
      const shown = HERO.callouts.filter((d) => d.rank <= HERO.calloutBudget(w));
      const band = HERO.bands[HERO.bandLabel.band];
      // a callout's text sits at `at`: valign picks the side, anchor the alignment
      const side = (d) => ({ bottom: "top", top: "bottom" })[d.valign] ?? (d.anchor === "end" ? "left" : "right");
      const align = { start: "left", middle: "center", end: "right" };
      const text = (coord, label) => ({ coord, symbolSize: 0, label: { show: true, color: theme.text, ...label } });
      c.setOption({
        animation: false,
        grid: { top: 10, right: 76, bottom: 24, left: 44 },
        xAxis: { type: "time", min: date(HERO.x.domain[0]), max: date(HERO.x.domain[1]),
          axisLabel: { customValues: HERO.x.ticks.map(date), formatter: HERO.x.format } },
        yAxis: { min: HERO.y.domain[0], max: HERO.y.domain[1],
          axisLabel: { customValues: HERO.y.ticks, formatter: HERO.y.format },
          axisTick: { customValues: HERO.y.ticks } },          // splitLines follow the ticks
        tooltip: { trigger: "axis", valueFormatter: (v) => HERO.y.format(+v.toFixed(2)) },
        series: HERO.series.map((s, i) => ({
          type: "line", name: s.label, showSymbol: false, z: 2 + i,
          data: Array.from(oil.cols[s.key].t, (t, j) => [t, oil.cols[s.key].y[j]]),
          color: ink(theme, s.color), lineStyle: { width: s.width },
          endLabel: { show: true, formatter: (p) => HERO.endLabel(s, p.value[1]),
            color: ink(theme, s.color), fontWeight: 600 },
          labelLayout: { moveOverlap: "shiftY" },                // de-collides the end labels
          emphasis: { disabled: true },
          ...(i === 0 ? {                                         // under the lines
            markArea: { silent: true, itemStyle: { color: theme.grid, opacity: 0.8 },
              data: HERO.bands.map((b) => [{ xAxis: date(b.from) }, { xAxis: date(b.to) }]) },
            markLine: { silent: true, symbol: "none", label: { show: false },
              lineStyle: { color: theme.baseline, type: "solid" }, data: [{ yAxis: HERO.zero.y }] },
            markPoint: { silent: true, data: [text([date(band.from), HERO.bandLabel.y],
              { formatter: HERO.bandLabel.text, position: "right", distance: 0, color: theme.muted, fontSize: 10 })] },
          } : {                                                   // over the lines
            markLine: { silent: true, symbol: "none", label: { show: false },
              lineStyle: { color: theme.textSecondary, width: 1, type: "solid" },
              data: shown.map((d) => [{ coord: [date(d.date), d.value] }, { coord: [date(d.at[0]), d.at[1]] }]) },
            markPoint: { silent: true, data: [
              ...shown.map((d) => ({ coord: [date(d.date), d.value], symbol: "circle", symbolSize: 6,
                itemStyle: { color: theme.text }, label: { show: false } })),
              ...shown.map((d) => text([date(d.at[0]), d.at[1]],
                { formatter: d.lines.join("\n"), position: side(d), align: align[d.anchor], lineHeight: 13 })),
            ] },
          }),
        })),
      });
      report({ points: oil.rows.length, step: "full" });
      return () => c.dispose();
    },

    defaults(host, { defaults: oil }) {
      host.style.height = "400px";
      const c = echarts.init(host);
      c.setOption({
        xAxis: { type: "time" },
        yAxis: {},
        series: oil.keys.map((k) => ({ type: "line", name: k,
          data: Array.from(oil.cols[k].t, (t, i) => [t, oil.cols[k].y[i]]) })),
      });
      return () => c.dispose();
    },
    grid(host, { grid }, { theme, report, range }) {
      const w = host.clientWidth || 640;
      host.style.height = GRID.height(w) + 66 + "px";             // + legend row and zoom slider
      const c = echarts.init(host, houseStyle(theme));            // Canvas: SVG would choke
      const date = (d) => +new Date(d);
      const mw = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const [rule, note] = GRID.events;
      c.setOption({
        animation: false,
        color: GRID.series.map((s) => ink(theme, s.color)),
        legend: { top: 0, left: 40, icon: "roundRect", itemWidth: 12, itemHeight: 3, itemGap: 8 },
        toolbox: { right: 6, top: 0, itemSize: 13, feature: { dataZoom: { yAxisIndex: "none" }, restore: {} } },
        grid: { top: 52, right: 16, bottom: 68, left: 48 },
        // the typed arrays go in as-is: a column-keyed dataset, no row objects
        dataset: { source: { t: grid.t, ...Object.fromEntries(GRID.series.map((s) => [s.key, grid[s.key]])) } },
        xAxis: { type: "time" },
        yAxis: { min: GRID.y.domain[0], max: GRID.y.domain[1], interval: GRID.y.ticks[1] - GRID.y.ticks[0],
          axisLabel: { formatter: GRID.y.format } },
        // Ctrl/⌘ + wheel or pinch zooms, so a plain wheel still scrolls the page
        dataZoom: [{ type: "inside", zoomOnMouseWheel: "ctrl" }, { type: "slider", bottom: 10, height: 26 }]
          .map((z) => ({ ...z, minValueSpan: GRID.zoom.minSpanMs, startValue: range?.[0], endValue: range?.[1] })),
        // sampled series keep different timestamps, so the tip reads the whole
        // dataset row of the point it snapped to: all four true half-hour values
        tooltip: { trigger: "axis", confine: true, formatter: ([p]) => {
          const [t, ...v] = p.value;
          return `${new Date(t).toISOString().slice(0, 16).replace("T", " ")} UTC<br>` + GRID.series.map((s, i) =>
            `<span style="color:${ink(theme, s.color)}">●</span> ${s.label} <b style="float:right;margin-left:12px">${mw(v[i])}</b>`).join("<br>");
        } },
        series: GRID.series.map((s, i) => ({
          type: "line", name: s.label, encode: { x: "t", y: s.key },
          showSymbol: false, lineStyle: { width: 1 }, emphasis: { disabled: true },
          sampling: "minmax",                                      // per-pixel min+max: peaks survive
          ...(i === 0 ? {
            markLine: { silent: true, symbol: "none", data: [{ xAxis: date(rule.date) }],
              lineStyle: { color: theme.textSecondary, type: [3, 3], width: 1 },
              label: { formatter: rule.label, position: "insideEndTop", rotate: 0, color: theme.text, fontSize: 11 } },
            markPoint: { silent: true, data: [{ coord: [date(note.date), note.y], symbolSize: 0,
              label: { show: true, formatter: note.label, position: "right", distance: 0, color: theme.text, fontSize: 11 } }] },
          } : {}),
        })),
      });
      c.getZr().on("dblclick", () => c.dispatchAction({ type: "dataZoom", start: 0, end: 100 }));   // reset
      // decimation honesty: read the solar points ECharts actually kept after sampling
      const drawn = c.getModel().getSeriesByName("Solar")[0].getData();
      const peak = drawn.getDataExtent(drawn.mapDimension("y"))[1];
      report({ points: grid.n * GRID.series.length, step: "full+minmax",
        note: `solar peak drawn ${mw(peak)} of ${mw(GRID.peaks.solar.mw)}` });
      return () => c.dispose();
    },

    npm(host, { npm }, { theme, report }) {
      const w = host.clientWidth || 640;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      const name = (k) => seven.get(k)?.label ?? k;
      const color = (k) => ink(theme, seven.get(k)?.color ?? NPM.others.color);
      const order = [...npm.keys.filter((k) => !seven.has(k)), ...seven.keys()];   // greys first
      const i0 = npm.weeks.findIndex((d) => +d === +new Date(NPM.index.date));
      const init = (out, h) => ((out.style.height = h + "px"), echarts.init(out, houseStyle(theme)));
      const logY = (Y, ticks = Y.ticks) => ({ type: "log", min: Y.domain[0], max: Y.domain[1],
        axisLabel: { customValues: ticks, formatter: Y.format }, axisTick: { customValues: ticks } });

      const lines = (indexed, out) => {
        const Y = indexed ? NPM.index : NPM.y, from = indexed ? i0 : 0;
        // the index transform, by hand: ECharts datasets have filter/sort but no normalise
        const val = (k, i) => (indexed && npm.cols[k][i] != null ? (100 * npm.cols[k][i]) / npm.cols[k][i0] : npm.cols[k][i]);
        const c = init(out, NPM.height(w));
        c.setOption({
          animation: false,
          grid: { top: 10, right: 110, bottom: 28, left: 44 },
          xAxis: { type: "time", axisPointer: { triggerEmphasis: false } },
          yAxis: logY(Y),
          // shown by hand below (triggerOn "none"); the axis tooltip finds the week
          tooltip: { trigger: "axis", triggerOn: "none", confine: true, axisPointer: { type: "none" },
            formatter: (ps) => { const p = ps.find((p) => p.seriesName === near);
              return p && `<b>${name(near)}</b><br>${new Date(p.value[0]).toISOString().slice(0, 10)}: ${Y.format(p.value[1])}${indexed ? "" : " / week"}`; } },
          series: order.map((k, n) => ({
            type: "line", name: k, showSymbol: false,
            data: npm.weeks.slice(from).map((d, j) => [+d, val(k, from + j)]),
            color: color(k),
            lineStyle: seven.has(k) ? { width: 1.75 } : { width: NPM.others.width, opacity: NPM.others.opacity },
            emphasis: { focus: "series", lineStyle: { width: 2.5, opacity: 1, ...(seven.has(k) ? {} : { color: theme.text }) } },
            blur: { lineStyle: { opacity: 0.12 } },
            endLabel: { show: seven.has(k) || NPM.alsoLabel.includes(k), fontWeight: 600,
              color: seven.has(k) ? color(k) : theme.muted,
              formatter: (p) => (indexed ? NPM.index : NPM).endLabel(seven.get(k) ?? { label: k }, p.value[1]) },
            labelLayout: { moveOverlap: "shiftY" },
            markLine: indexed && n === 0 ? { silent: true, symbol: "none", label: { show: false },
              lineStyle: { color: theme.muted, type: "solid" }, data: [{ yAxis: 100 }] } : undefined,
          })),
        });
        /* highlight the nearest whole line, not just the one under the cursor:
         * ECharts' line hit-test needs the pointer on the stroke, so find the
         * line nearest in log space at the hovered week and highlight it */
        let near = null;
        const zr = c.getZr();
        zr.on("mousemove", (e) => {
          const [t, y] = c.convertFromPixel("grid", [e.offsetX, e.offsetY]);
          const i = Math.max(from, npm.t.findLastIndex((x) => x <= t));
          const d = (k) => (val(k, i) > 0 ? Math.abs(Math.log10(val(k, i) / y)) : Infinity);
          const k = c.containPixel("grid", [e.offsetX, e.offsetY]) ? order.reduce((a, b) => (d(b) < d(a) ? b : a)) : null;
          if (k !== near) c.dispatchAction({ type: "downplay" }), k && c.dispatchAction({ type: "highlight", seriesName: k });
          near = k;
          c.dispatchAction(k ? { type: "showTip", x: e.offsetX, y: e.offsetY } : { type: "hideTip" });
        });
        zr.on("globalout", () => (c.dispatchAction({ type: "downplay" }), c.dispatchAction({ type: "hideTip" }), (near = null)));
        return () => c.dispose();
      };

      const multiples = (out) => {
        const cols = NPM.multiples.columns(w), rows = Math.ceil(NPM.seven.length / cols);
        const c = init(out, rows * NPM.multiples.height + 24);
        const cell = (i) => [i % cols, Math.floor(i / cols)];
        const hidden = { show: false, itemStyle: { borderWidth: 0 } };
        const y = logY(NPM.y, NPM.y.ticks.filter((t, i) => i % 2 === 0));   // 1k, 100k, 10M
        c.setOption({
          animation: false,
          // ECharts 6's matrix coordinate system lays the grids out in cells
          matrix: { left: 40, right: 8, top: 0, bottom: 24, backgroundStyle: { borderWidth: 0 },
            x: { ...hidden, data: Array(cols).fill("") }, y: { ...hidden, data: Array(rows).fill("") },
            body: { itemStyle: { borderWidth: 0 }, label: { position: "insideTopLeft", fontWeight: 600, color: theme.text },
              data: NPM.seven.map((s, i) => ({ coord: cell(i), value: s.label })) } },
          grid: NPM.seven.map((s, i) => ({ coordinateSystem: "matrix", coord: cell(i), top: 22, bottom: 4, left: 4, right: 12 })),
          xAxis: NPM.seven.map((s, i) => ({ type: "time", gridIndex: i, min: +npm.weeks[0], max: +npm.weeks.at(-1),
            minInterval: 4 * 365 * 864e5, axisLabel: { show: i + cols >= NPM.seven.length, formatter: "{yyyy}" } })),
          yAxis: NPM.seven.map((s, i) => ({ ...y, gridIndex: i, axisLabel: { ...y.axisLabel, show: i % cols === 0 } })),
          series: NPM.seven.map((s, i) => ({ type: "line", xAxisIndex: i, yAxisIndex: i, showSymbol: false,
            color: color(s.key), lineStyle: { width: 1.25 }, data: npm.weeks.map((d, j) => [+d, npm.cols[s.key][j]]) })),
        });
        return () => c.dispose();
      };

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      return viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" },
        (v, out) => (v === "multiples" ? multiples(out) : lines(v === "indexed", out)));
    },

    life(host, { life }, { theme }) {
      const c = chart(host, 300);
      c.setOption(baseOption(theme, {
        xAxis: { type: "category", boundaryGap: false,
          data: life.years, ...axisCommon(theme) },
        yAxis: { type: "value", min: 35, max: 88, ...axisCommon(theme) },
        series: life.countries.map((country) => ({
          name: country, type: "line", smooth: true, showSymbol: false,   // nulls break the line by default
          data: life.wide.map((r) => r[country]),
        })),
      }));
      return () => c.dispose();
    },
  },
});
