# Build notes

What it took to build the three tests in each library: what fought back, what was a pleasure, and the numbers. Distilled from the notes each builder kept in November 2026. The tests and how things are counted and timed are on [the method page](../ANALYSIS.md); the brief is [docs/TESTS.md](./TESTS.md).

Timings are badge numbers (render call to two frames after paint), single runs or small sets, on one machine. Treat them as orders of magnitude, not a benchmark.

## Numbers at a glance

One run each at 900 px, light theme, same machine.

| Library | Oil: lines / ms | Grid: lines / ms | Grid step | Solar peak drawn | npm: lines / ms |
|---|---|---|---|---|---|
| D3 | 60 / 52 | 100 / 173 | full | 16,289 MW | 100 / 71 |
| Observable Plot | 44 / 120 | 38 / 508–716 | day, mean + low–high band | 16,289 MW | 77 / 205 |
| Vega-Lite | 53 / 128 | 57 / 254–441 | day, mean + low–high band | 16,289 MW | 81 / 757 |
| Plotly.js | 49 / 126 | 45 / 1,695 | full (WebGL) | 16,289 MW | 83 / 104 |
| Chart.js | 70 / 94 | 67 / 236 | full + min-max | 16,289 MW | 96 / 173 |
| Apache ECharts | 51 / 121 | 49 / 163 | full + minmax | 16,289 MW | 85 / 99 |
| µPlot | 65 / 19 | 106 / 44 | full | 16,289 MW | 85 / 37 |

Grid zoom and pan with the one-week floor:

| Library | Zoom and pan | One-week floor | Crosshair tooltip, all four series |
|---|---|---|---|
| D3 | `d3.zoom`, ~10 lines | yes (`scaleExtent`) | by hand, `bisectCenter` |
| Observable Plot | none | n/a | native (`pointerX` + `tip`) |
| Vega-Lite | native, one param | no: Vega-Lite has no constraint on bound scales | native |
| Plotly.js | native (pan via the modebar's pan tool) | by hand, a short handler | native, after tuning `hoverdistance` |
| Chart.js | zoom plugin | yes (`limits.x.minRange`) | partly by hand |
| Apache ECharts | native `dataZoom` | yes (`minValueSpan`) | native, with a formatter fix |
| µPlot | drag-zoom native; wheel, pinch and pan (Shift + drag, touch) by hand | by hand, ~10 lines | crosshair native, tooltip by hand |

## D3 (7.9.2)

Every chart is self-contained: scales, axes, gridlines, bands, callouts, labels, zoom and tooltips are all in the counted code. The only shared helpers used are `spreadLabels`, `viewSwitch` and `ink`.

**Oil, 60 lines, 23–41 ms.** All six requirements met, all by hand, which is what D3 is. Each callout is a data join to a `g` with a line, a circle and a text. Turning `anchor` and `valign` into tspan `dx`/`dy` offsets took about 6 lines; multi-line SVG text with vertical alignment is the one place D3 makes you think about typography. Bands are a data join of rects drawn first; the zero rule is a separate line in baseline ink. No tooltip (optional; about 15 more lines).

**Grid, 100 lines, full resolution.** All 1,251,264 points, no decimation, 100–170 ms to first paint at 1,100 px. The lines go on a `<canvas>` through the same `d3.line()` generator via `.context(ctx)`; axes, legend, events and crosshair are SVG on top. That is the idiomatic route for big data in D3, not a workaround. `d3.zoom` on x with `rescaleX`, a `scaleExtent` for the one-week floor, a `translateExtent` clamp and double-click reset took about 10 lines. Redraw on a wheel step costs about 140 ms fully zoomed out (~7 fps) and falls to ~30 ms zoomed in: usable, visibly steppy at full zoom-out. Below 640 px the "Last coal" label drops a line to clear "2012: coal 42%".

**npm, 100 lines, 42–69 ms.** Everything by hand, and none of it hard. Nearest-line hover is `d3.Delaunay.from(points).find(pointer)` (2 lines, fast over 11k points) plus a `highlight()` that restyles every path and raises the picked one. The indexed view is a `bisectLeft` and a division; D3 has no transform for it. Small multiples are a data join of seven cells sharing one log scale.

**Fought back.** d3-axis sets `font-family` and `font-size` as attributes on its group, so axes ignore the page font until you add `.style("font", "inherit")` to every axis. SVG tooltips don't wrap, so the npm tooltip needed two lines and a start/middle/end anchor at 360 px.

**A pleasure.** One line generator for SVG and canvas. Zoom, rescale and bisect fit together exactly as documented.

## Observable Plot (0.6.19)

The reference implementation, written first. One helper (`base`) is used only by the missing-data chart; the three tests write their own `style` option inline.

**Oil, 44 lines, all requirements met.** Every piece of furniture is a mark: `rect` bands with no y span the frame, `ruleY` for zero, and `link` + `dot` + `text` per callout. Text anchors are options, not channels, so each callout's text is its own mark (a `.map()` over the shown callouts). End labels are de-collided by hand with `spreadLabels` in data units. A `tip` with `pointerX` adds the optional tooltip in two lines.

**Grid, 38 lines, daily step as a band, no zoom or pan.** Plot draws static SVG. Its pointer gives a crosshair (`ruleX` + `pointerX`) and a tooltip with all four series, but there is no zoom or pan, so requirement 2 is not met. Full resolution took 9–13 s to paint and hourly about 5 s, so it ships the daily step: each day's mean as a `lineY`, over an `areaY` from that day's lowest to highest half-hour (`y1`/`y2` from the shared aggregate's min and max). That paints in 0.5–0.7 s and keeps the true solar peak, 16,289 MW (the mean line alone, as first built, drew 5,444 in about 0.3 s). Opened on a window, as the front page does, it draws that window's half-hours at full resolution instead. The data is passed as row indices with the typed arrays as channels, so no row objects are built.

**npm, 77 lines.** The library does most of it: `type: "log"` with spec ticks, `normalizeY` with a custom basis (the index week's value ÷ 100) for the indexed view, and `fx`/`fy` facets for the small multiples. Hover highlighting a whole line is not built in: Plot gives you the pointed datum (`plot.value`) and about 12 lines of DOM work restyle the paths.

**Fought back.** No label layout (end labels need `spreadLabels`), no per-series highlight, and SVG at a million points.

**A pleasure.** The shortest code on all three tests (though its grid has no zoom), and an annotation layer that is just more marks.

## Vega-Lite (6.5.0, Vega 6.4.0, vega-embed 7.4.0)

Specs are rendered as SVG (canvas for the grid) through an `embed()` wrapper that carries the theme as `config`. Custom tick formats need `vega.expressionFunction` plus `config.customFormatTypes: true`; without the flag Vega-Lite drops them with a warning, not an error.

**Oil, 53 lines, 117–196 ms.** All six met. A leader is a `rule` with `x`/`y` → `x2`/`y2`, a dot is a `circle`, and an array of strings gives multi-line text natively. Per-callout `align`, `baseline`, `dx`, `dy` are mark properties, not channels, so they become `{expr: "datum.align"}` after a small JS map from the spec's start/middle/end to Vega's left/center/right. A `rect` with `x`/`x2` and no y spans the plot. End labels use `spreadLabels`.

One trap: putting the shared x scale (with an explicit domain) on the band layer that also has `x2` gave `WARN Conflicting scale property "domain"`. Moving the same definition to the line layer fixed it. A beginner would not know why.

**Grid, 57 lines, daily step as a band.** Interactivity is two params and no event code: `{select: {type: "interval", encodings: ["x"]}, bind: "scales"}` gives wheel zoom, drag pan and double-click reset, and a `point` param with `nearest: true` drives a crosshair rule with one tooltip for all four series. There is no minimum zoom span on bound scales; enforcing one would mean dropping to Vega signals, so the one-week floor is not met.

Scale is where it hurts. Ladder timings at 1,100 px: full 17.8 s (twice), hourly 7.1 and 8.8 s, daily 348–443 ms. Without the crosshair layer, full paints in 3.7 s and hourly in 1.8 s, so the nearest-point crosshair (a tuple and a Voronoi cell per timestamp) is most of the cost. Even lines-only at the hourly step, each zoom frame took about 0.9 s, because Vega re-runs the dataflow and redraws every path. At the daily step zoom is about 0.2 s a frame: usable, not smooth. Vega's `sample` transform is random reservoir sampling, not LTTB or min/max, so it is not a fair way down. So it ships the daily step, drawn as each day's mean (a `line`) over an `area` from its lowest to highest half-hour (`y`/`y2`): 0.25–0.45 s, and the solar peak drawn is the true 16,289 MW (a mean line alone drew 5,444). The long rows are pivoted back to one row per day for the tooltip. Opened on a window, as the front page does, it loads only that window, at full resolution.

**npm, 81 lines, 538–672 ms.** Whole-line hover highlight is native: a `point` param with `fields: ["package"]` and `nearest: true` on an invisible point layer, and conditional opacity and width on the lines. Selecting by field is what turns "nearest point" into "whole line". The indexed view uses Vega-Lite's own transforms (`filter`, `window` with `first_value`, `calculate`); small multiples are a `facet` with `columns`. One gap: a hovered grey line stays grey, where Plot and others darken it.

**Fought back.** `viewSwitch` expects a synchronous cleanup and `embed` is async, which costs every async library 2–3 lines.

**A pleasure.** The most declarative interactivity of the seven: zoom, crosshair and highlight with no handlers.

## Plotly.js (4.3.0)

Uses `plotly.js-dist-min`, 4.84 MB minified, 1.48 MB gzipped (measured). A partial bundle with `scattergl` would be smaller; not tried. A ~15-line layout `template()` themes every axis and is not counted.

**Oil, 49 lines, 104–141 ms.** This is the chart Plotly's annotation model was built for. One annotation per callout: `x,y` is the data point, `ax,ay` with `axref`/`ayref` set to the axes is the text anchor in data units, the spec's `valign` values are Plotly's `yanchor` values as they stand, and `arrowhead: 6` (a round head) is the dot. Bands are `shapes` with `layer: "below"`; the zero rule is the axis's own `zeroline`. End labels need `spreadLabels`, since annotations are not de-collided. `hovermode: "x unified"` gives a crosshair and tooltip free.

**Grid, 45 lines, full resolution in WebGL.** Switching the trace type to `scattergl` takes all 1,251,264 points from impossible to 1.2–2.2 s to first paint, no decimation, solar peak 16,289 MW. Zoom, pan, reset and spike lines are configuration. Plotly has range bounds (`minallowed`/`maxallowed`) but no minimum span, so a short `plotly_relayout` handler enforces the week. It has to read the axis range in both forms Plotly keeps it (epoch ms as given, UTC strings after a zoom): reading only strings sent the relayout into a loop when the chart opened on a window and you picked the pan tool. Drag zooms by default; pan is the modebar's pan tool.

The finding a Plotly user should know: with default settings the unified tooltip took 1.0–1.8 s per mouse move at full resolution. Profiling put almost all of it in the bundled point-cluster quadtree's range query, because `x unified` asks for every point in a box `hoverdistance` px wide (default 20) by the full plot height, which at full zoom-out is about 6,000 half-hours × 4 series. Setting `hoverdistance: 1`, and widening it to one sample's width when zoomed in, brings it to 72–184 ms. The defaults give a chart that paints fast and hovers slowly.

**npm, 83 lines, typically 60–150 ms.** `hovermode: "closest"` gives the nearest-line tooltip natively; whole-line highlight is a `plotly_hover` → `Plotly.restyle` with per-trace arrays (~10 lines). Plotly removed `transforms` in v3, so the index is a `.slice().map()`. Small multiples use `layout.grid` with `matches` on axes 2–7, and building `xaxisN`/`yaxisN` keys in a loop is the verbose part (~15 lines).

**Fought back.** The view switcher first drew only the first view: `drawn ??= newPlot(...)` skipped the render on every later switch, so Indexed and Small multiples came up blank, until fixed. Annotations count toward autorange (the npm x axis stretched to 2028 until pinned). No annotation collision avoidance. A `tickvals` without matching `ticktext` mislabels the axis with no warning.

**A pleasure.** Callouts as single objects, typed arrays straight in, and WebGL behind one word.

## Chart.js (4.6.1)

The page loads five extra scripts: chartjs-plugin-annotation 3.1.0 for the editorial furniture, chartjs-plugin-zoom 2.2.0 with hammerjs 2.0.8 for zoom and pan, and luxon 3.7.2 with chartjs-adapter-luxon 1.3.1 for the time axis (the luxon adapter, because it takes `zone: "UTC"`). Decimation needs none of them: it is built into core. A `themed()` function sets eight `Chart.defaults` values and is not counted.

**Oil, 70 lines, 77–101 ms.** The annotation plugin's model matched the spec almost one to one: each callout is a `point`, a `line` and a multi-line `label`, and the spec's anchor and valign map straight onto the label's `position` and `textAlign`. Bands are `box` annotations with `drawTime: "beforeDatasetsDraw"`. End labels are `label` annotations placed with `spreadLabels`; they need `clip: false`. Exact tick lists need an `afterBuildTicks` hook, because Chart.js has no `ticks: [...]` option. Dataset 0 draws on top, so the series list is reversed.

**Grid, 67 lines, full resolution plus min-max decimation.** All 1,251,264 points as `{x, y}` with `parsing: false`, `normalized: true` and the decimation plugin set to `min-max`: 232–350 ms to first paint, including building the point objects. Min-max keeps a min and max per pixel column, so the solar peak drawn is 16,289 MW, and it switches off when zoomed in, so a week shows every half-hour. The zoom plugin gives wheel zoom, pinch and drag pan, and `limits.x.minRange` enforces the week exactly; double-click reset is one listener. Updates take 30 ms fully zoomed out and 6–22 ms zoomed in; a pan step is about 70 ms.

The subtle part is the tooltip. After decimation the four datasets no longer share indices, so `mode: "index"` would mix timestamps. The fix looks the nearest half-hour up in the raw arrays and lists four lines, without colour swatches. There is no crosshair; it is a 7-line inline plugin.

**npm, 96 lines, 162–207 ms.** Nearest-line hover is native (`mode: "nearest"`); dimming the rest uses scriptable `borderColor`/`borderWidth` and an `onHover` that calls `chart.update("none")` (~10 lines). The highlighted line can't be raised without reordering datasets. No transforms, so the index is a 4-line function. No faceting, so small multiples are seven `Chart` instances in a CSS grid, which must use `minmax(0,1fr)` or the responsive canvases overflow.

**Fought back.** Draw order (dataset 0 on top; `order: -i` then needs a reversed legend). Time zones: the time scale formats in local time until the adapter is told UTC. Decimation silently breaking index-mode tooltips, which is not documented anywhere obvious.

**A pleasure.** The annotation plugin, honest decimation in two keys, and a zoom floor that is one option.

## Apache ECharts (6.1.0)

Canvas renderer, the default, for all three tests. A 24-line `houseStyle()` theme object, passed to `echarts.init()`, sets axis, tooltip, legend and dataZoom colours and is not counted. Without it each chart would need roughly 8–15 more lines.

**Oil, 51 lines, 123–130 ms.** Every piece of furniture is a first-class option. End labels are `series.endLabel` with `labelLayout: { moveOverlap: "shiftY" }`: ECharts is the only one of the seven that de-collides labels itself, so it does not use `spreadLabels`. Callouts are `markPoint` items for dots and text and `markLine` coordinate pairs for leaders; bands are `markArea`. Explicit ticks need `customValues` on both `axisLabel` and `axisTick`, and it is the second that moves the grid lines, which is not obvious. Annotation z-order is per series, so bands ride on WTI and callouts on Brent.

**Grid, 49 lines, full resolution with `sampling: "minmax"`.** The typed arrays go in untouched as a column-keyed `dataset`, no reshaping. First paint 209–297 ms; hover and wheel frames about 17 ms. `dataZoom` (inside and slider) with `minValueSpan` gives zoom, pan and the one-week floor natively; the toolbox adds box zoom and restore. Sampling re-runs on the visible window, so true half-hours appear when zoomed in. Solar peak drawn, read back from ECharts' own sampled data: 16,289 MW (`lttb` would keep 16,095; `average` 5,310).

Two things a reader should know. Without sampling, first paint still looks fine (~0.3 s), but hover runs at about 5 fps: `sampling` is what makes it interactive, not what makes it paint. And the stock axis tooltip breaks with sampling: each series keeps different timestamps, so it listed only some series, sometimes with values that didn't match the header time. A 5-line formatter that reads the whole dataset row fixes it.

**npm, 85 lines, 126–138 ms.** Dimming is native: `emphasis.focus: "series"` with a blur style dims the other 21 lines and their end labels. Picking the nearest line is not: ECharts hit-tests a line only on its stroke, and line events carry no data index, so ~12 lines find the series nearest in log space and dispatch `highlight` and `showTip`. Dataset transforms have no normalise, so the index is one line by hand. Small multiples use ECharts 6's new `matrix` coordinate system, a tidy native fit.

**Fought back.** The sampled axis tooltip, nearest-line hover, and the time-axis tick labeller in narrow panels (it needed `minInterval` to stop repeating "Jul"). `axisPointer.triggerEmphasis` is read from the axis, not from `tooltip.axisPointer`.

**A pleasure.** Native end-label layout, series focus and blur, and 1.25M points with zoom, slider and reset all as options.

## µPlot (1.6.32)

About 6 lines of tooltip CSS in the page are used by the grid and npm charts and are not counted.

**Oil, 65 lines, 21–37 ms.** All six met, by hand. µPlot has no annotation model, so bands, the zero rule, leaders, dots, callout text and end labels are canvas calls in its hooks, in device pixels (× `uPlot.pxRatio` everywhere), with multi-line text written line by line. Of the 65 lines, about 45 are that editorial layer and about 20 are the chart. The hook order (`drawClear` → grid → `drawAxes` → series → `draw`) maps exactly onto "behind, reference, on top". No tooltip: µPlot's readout is its legend, which the spec forbids here.

**Grid, 106 lines, full resolution, 46–69 ms.** All 1,251,264 points as typed arrays (`ms: 1` and `tzDate` handle epoch-ms UTC). The `linear` path builder keeps the min and max of each pixel column, so the solar peak drawn is the true 16,289 MW. A full redraw on zoom takes about 20 ms. Drag-select zoom, double-click reset and a snapping crosshair are built in. The one-week floor needs `drag.setScale: false` plus a clamped `setSelect` hook (~10 lines). Wheel zoom and pan are not in core (µPlot's demos ship them as a plugin), and µPlot has no touch handling at all. About 12 lines add trackpad-pinch/Ctrl-wheel zoom and horizontal-swipe pan, leaving the plain wheel to scroll the page. That swipe never reaches a chart embedded in the front page, which passes on only Ctrl/⌘ wheels so the page still scrolls, so about 25 more lines of pointer events add Shift + drag to pan with a mouse (a plain drag stays µPlot's select-to-zoom), one-finger pan and two-finger pinch on touch. The four-series tooltip is a ~9-line `setCursor` hook.

**npm, 85 lines, 30–56 ms.** Highlight-one-of-many is native: `cursor.focus.prox` with `focus.alpha` dims all but the nearest series. Focus resets each series' alpha, so the translucent greys need their transparency baked into the colour. The index is one line by hand. Small multiples are seven instances in a CSS grid, and `cursor.sync` makes hovering one show the same week in all seven, in one line. On a log axis µPlot passes `null` for crowded tick labels, which printed "null" until a `filter` kept every tick.

**Fought back.** No annotation layer at all; no minimum zoom span; default two-line time labels clipped by a fixed axis size.

**A pleasure.** Performance in another league, with the true extremes drawn and no decimation step.

## Cross-cutting findings

- **The grid separates the libraries by rendering pipeline, not by API.** Five drew every point: D3 (via canvas), Chart.js, ECharts and µPlot on canvas, Plotly in WebGL. The two grammars stepped down to the daily step: Plot because it draws SVG, Vega-Lite because every point is a tuple in its dataflow, even on its canvas renderer. Drawn as a mean line alone that lost two-thirds of the solar peak; drawn as a daily low-to-high band under the mean, as they now are, it keeps it, and loses only the detail inside each day.
- **Paint time is not interactivity.** ECharts without sampling and Plotly with its default hover both paint quickly and then respond slowly. The fix in both is one setting a user finds only by measuring.
- **Downsampling and tooltips interact.** In Chart.js and ECharts, per-series decimation leaves series on different timestamps and the stock multi-series tooltip quietly shows the wrong thing. Both needed a formatter that reads the raw data.
- **Min/max keeps peaks; means and LTTB don't guarantee them.** Chart.js `min-max`, ECharts `minmax` and µPlot's path builder drew 16,289 MW. A daily min-max band drew 16,289 too; daily means alone drew 5,444; ECharts' `lttb` 16,095; its `average` 5,310.
- **End-label collision is solved by one library.** ECharts' `labelLayout` is the only native de-collision; the other six use the shared 13-line `spreadLabels`.
- **Callout models vary more than anything else.** Plotly and the Chart.js annotation plugin take the spec's callout almost as written; Plot and Vega-Lite compose it from marks; D3 and µPlot draw it.
- **A one-week zoom floor is surprisingly rare.** Native in Chart.js (plugin) and ECharts; a few lines in D3, Plotly and µPlot; impossible in plain Vega-Lite; not applicable in Plot.
- **Normalise transforms exist in two libraries.** Plot (`normalizeY`) and Vega-Lite (`window` + `calculate`); everyone else divides by hand in one to four lines.
- **Small multiples:** native in Plot, Vega-Lite and ECharts 6; layout keys in Plotly; separate instances in Chart.js and µPlot (µPlot syncs their cursors for free).
