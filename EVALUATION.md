# The verdict

Which JavaScript line-chart library to use in 2026, for a website or an app. We built the same three charts from real data in seven libraries. The method is on the [method page](./method), library-by-library notes are in the [build notes](./build-notes), and every chart on the site is live with its source under it.

**Use Apache ECharts, unless the chart is going into an article: then use Observable Plot.**

## The ranking

For someone choosing one line-chart library today, with no framework constraint and nothing already invested. This is our judgement for DataHub, not a score. The criteria, roughly by weight:

1. **Native or by hand**, across the three tests: each requirement done as an option or a mark, or with event code, pixel maths or canvas calls.
2. **Interaction on the dense chart**: zoom, pan, reset and hover, working embedded in a page and on touch.
3. **Dense-data honesty**: can it draw all 1.25M points, and does what it draws keep the true extremes.
4. **Finished appearance**: how close the result is to a chart we would publish without restyling.
5. **Bundle**, as loaded from a CDN.

Line counts are context, not a criterion: they describe our code and never move a library up or down. Speed counts only where it changes what you can build.

| # | Library | Use it when | Why it sits here |
|---|---|---|---|
| 1 | **Apache ECharts** 6.1.0 | You want one library for everything from an annotated story chart to a 1.25M-point dashboard | One of five that met every requirement, and the one that met most of them as options rather than code: end-label layout, bands, leaders, zoom, pan, slider, one-week floor and sampling are all config. 1.25M points in about 100 ms, all interactive. Caveat: with sampling on, the stock tooltip shows wrong values (a 5-line formatter fixes it). 368 KB gzipped. |
| 2 | **Observable Plot** 0.6.19 | The chart is going into an article, a report or a static page | Least code and cleanest result on the editorial chart (44 lines) and the many-series chart (77, index and small multiples native). Static SVG, so it renders at build time. No zoom or pan. Raw 1.25M points take 9 to 13 s, so it draws a daily mean line over a low-to-high band: true solar peak, about 0.4 s. |
| 3 | **D3** 7.9.2 | The chart is the product, or you already think in D3 | Did everything, including 1.25M points on canvas through the same `d3.line()` generator in about 70 ms, with zoom and pan. The sharpest result. Every piece of furniture is by hand. |
| 4 | **Plotly.js** 4.3.0 | You want callouts as single objects and zoom in config, and can pay 1.5 MB | Best annotation model: a callout is one object, leader and dot included. `scattergl` draws all 1.25M points, but default hover took 1 to 1.8 s per mouse move until tuned (a 2-line fix found by profiling), and a drag-zoom redraws in 0.3 to 1 s. 1.48 MB gzipped, four times ECharts. |
| 5 | **µPlot** 1.6.32 | Speed and size are the whole problem | 1.25M points in about 25 ms, redraws in about 20 ms, 23 KB. No annotation model: about 45 of the oil chart's 65 lines are canvas furniture. Drag-zoom and reset are built in; wheel and pinch zoom, panning and the one-week floor are about 40 lines of hooks (it has no touch handling). Fifth because it does least for you; first if point count is the problem. |
| 6 | **Chart.js** 4.6.1 | You already use it | Met every requirement; all 1.25M points in about 85 ms with built-in min-max decimation. Below µPlot by our preference, not capability: five extra scripts to load and keep in step, canvas only, and the most small traps (no tick list option, decimation breaks index-mode tooltips, local-time axis until you set the zone, reversed draw order). |
| 7 | **Vega-Lite** 6.5.0 | The chart must be a JSON spec, and the data is small | Fewest lines of interaction code: zoom, pan, crosshair and whole-line hover are a few lines of `params` each. A fine editorial chart. Does not scale: at full resolution the lines took 3.7 s and the shipped chart 17.8 s; even at hourly each zoom step took 0.9 s. No decimation, no minimum zoom span. |

### By use case

- **Editorial and article charts: Observable Plot.** Bands, leaders, dots and labels are ordinary marks, mark order is z-order, and it renders static SVG in Node. You write end-label layout yourself (our shared helper is 13 lines); if labels must survive data you have not seen, ECharts does it for you.
- **Dashboards and dense time series: Apache ECharts.** `sampling: "minmax"` keeps the true 16,289 MW solar peak, `dataZoom` gives wheel, drag, slider and a one-week floor in config, and typed arrays go in as a column dataset with no reshaping. For hundreds of thousands of live points and nothing else: µPlot (about 25 ms, 23 KB).
- **Many series, exploratory: ECharts if interactive, Plot if static.** ECharts dims the other 21 lines and their labels with one option (`emphasis.focus: "series"`) and lays out end labels itself; picking the nearest line is about 12 lines by hand. Plot's `normalizeY` and facets make the indexed view and small multiples a few lines each.
- **You already have one:**
  - Chart.js: add `chartjs-plugin-annotation` and `chartjs-plugin-zoom`.
  - Plotly: set `hoverdistance` before you ship a big chart.
  - Vega-Lite: keep it while charts stay in the tens of thousands of points.
  - D3: keep it if the team already writes it.

### What DataHub uses

We did this to choose for ourselves. DataPressr, the engine behind DataHub's data stories, renders charts with Observable Plot to static SVG at build time, and that stays: for a published chart pointing at a specific moment in the data, Plot is the least code and the best result. For interactive and dense charts, where the reader needs to zoom into seventeen years of half-hourly data, DataHub will use ECharts.

## Scorecards

Three tests, each a different kind of line chart, built to one shared brief in all seven libraries. "Native" means an option or a mark; "by hand" means event handlers, pixel maths or canvas calls. Line counts are the render function as shown on the page; render times are medians of six warm runs at 900 px on one machine. See [how to read the numbers](#how-to-read-the-numbers) and the [method](method.html).

### Oil, 1986 to 2026: the annotated editorial chart

EIA daily Brent and WTI spot prices, 20,203 points. All seven met every requirement; what differs is how. The requirements:

- end labels, no legend
- five callouts with leader lines (fewer as the chart narrows)
- four recession bands behind the lines
- a y-axis that crosses zero for WTI at −$36.98 on 20 April 2020
- decade ticks
- nothing overlapping at 360 px

| Library | Lines | End labels (de-collision) | Callouts | Bands and zero rule | Exact ticks | Render (median) |
|---|---|---|---|---|---|---|
| ECharts | 51 | **Native**: `endLabel` + `labelLayout.moveOverlap` | Native: `markPoint` + `markLine` | Native: `markArea`, `markLine` | `customValues` on both label and tick | 58 ms |
| Plot | 44 | By hand (shared helper) | Marks: `link` + `dot` + `text` | Marks: `rect`, `ruleY` | Native | 45 ms |
| Plotly | 49 | By hand (no annotation collision handling) | Native: one annotation each, leader and dot included | Native: `shapes` below, axis `zeroline` | Native | 48 ms |
| Vega-Lite | 53 | By hand | Native layers: `rule`, `circle`, multi-line `text` | Native | Custom formatter needs `customFormatTypes: true`, or it is dropped with a console warning and the default format used | 65 ms |
| Chart.js | 70 | By hand (annotation-plugin labels, `clip: false`) | Native via plugin: three annotations each | Native via plugin | `afterBuildTicks` hook, no tick list option | 35 ms |
| D3 | 60 | By hand | By hand: a `g` of line, circle and tspans | By hand | Native | 11 ms |
| µPlot | 65 | By hand on canvas | By hand on canvas, in device pixels | By hand on canvas | Native (`splits`) | 15 ms |

Six of seven de-collide the end labels with the same shared helper; only ECharts does it itself. About 45 of µPlot's 65 lines are the editorial layer; the chart itself is about 20.

### The grid, every half hour since 2009: the dense interactive chart

NESO GB generation by fuel: 312,816 half-hours × 4 series = 1,251,264 points. The requirements:

- draw as many points as you can
- zoom and pan down to one week, with a reset
- a crosshair tooltip with all four series
- event markers
- report the solar peak drawn against the true 16,289 MW

| Library | Lines | Points in, and what is drawn | First paint (median) | Solar peak drawn | Zoom and pan, one-week floor | Crosshair tooltip |
|---|---|---|---|---|---|---|
| ECharts | 49 | 1,251,264 in; `sampling: "minmax"` keeps each pixel column's min and max (~2k per series at 1,100 px) | 103 ms | **16,289** | **Native**: wheel, drag, slider, box zoom, restore button, `minValueSpan`; double-click reset is a one-line handler | Native, but a 5-line formatter is needed once sampling is on (see below) |
| µPlot | 106 | 1,251,264 in; the path builder keeps each pixel column's min and max | 24 ms | **16,289** | Partly: drag zoom and reset native; wheel and pinch zoom, Shift-drag and touch pan, and the floor are ~40 lines of hooks | Crosshair native, tooltip ~10 lines by hand |
| D3 | 100 | 1,251,264 in, every point stroked on canvas | 69 ms | **16,289** | By hand: `d3.zoom` + `rescaleX`, ~10 lines; ~7 fps fully zoomed out, smooth zoomed in | By hand (bisect) |
| Chart.js | 67 | 1,251,264 in; the decimation plugin keeps a min and max per pixel column | 86 ms | **16,289** | Via `chartjs-plugin-zoom`: wheel, drag, `minRange` | 7-line inline crosshair; tooltip reads raw arrays, because decimated datasets no longer share an index |
| Plotly | 48 | 1,251,264 in, every point drawn by `scattergl` | 696 ms | **16,289** | Native (pan is the modebar's pan tool; drag zooms; on touch dragging starts off, so the page can scroll); floor is a short `relayout` handler; drag-zoom redraws in 0.3 to 1 s | Native (`x unified`), 1 to 1.8 s per move at default `hoverdistance`; 72 to 184 ms at `hoverdistance: 1` |
| Vega-Lite | 57 | the daily step: 6,517 days × 4 series × 3 statistics (min, mean, max) as a mean line over a low-to-high band (78,204 values), canvas renderer | 219 ms | **16,289** | Partly: one param (`bind: "scales"`), no minimum span possible; did not pan or zoom on touch in our tests | Native, one param |
| Plot | 38 | the daily step: 6,517 days × 4 series × 3 statistics (min, mean, max) as a mean line over a low-to-high band (78,204 values), SVG | 431 ms | **16,289** | **Not met**: no zoom or pan | Native (`pointerX` + `tip`) |

**Plot and Vega-Lite cannot draw the raw 1.25M points in reasonable time** (single runs timed by hand at 1,100 px while building, not re-run since):

- Full resolution: Plot (SVG) 9 to 13 s; Vega-Lite 3.7 s for the lines alone, 17.8 s with the nearest-point crosshair.
- Hourly: about 5 s and 7 to 9 s.
- So both ship the daily step: each day's mean as a line, and its lowest and highest half-hour as a band behind it. The band keeps the extremes, so the solar peak drawn is the true 16,289 MW (a mean line alone shows 5,444).
- What it loses is detail when you zoom in: Vega-Lite zoomed to a week still shows seven days, not 336 half-hours, and Plot has no zoom.
- Vega-Lite at hourly, lines only, still took 0.9 s per wheel step, because the whole dataflow re-runs per frame.

### npm downloads: the many-series chart

Weekly downloads of 22 charting packages, March 2015 to November 2026: 11,268 points. Points means non-null weekly values; the table is 611 weeks × 22 = 13,442 cells, and the rest are weeks before a package existed or with no downloads, which a log scale cannot show. The requirements:

- log scale
- the seven in colour with end labels, the rest grey
- hover highlights a whole line
- an indexed view (15 January 2024 = 100), using the library's own transform if it has one
- small multiples on a shared log scale

| Library | Lines | End labels | Whole-line hover | Indexed view | Small multiples | Render (median) |
|---|---|---|---|---|---|---|
| Plot | 77 | By hand | By hand: ~12 lines of DOM on `plot.value` | **Native** `normalizeY` | **Native** facets | 86 ms |
| Vega-Lite | 81 | By hand | **Native**: a `point` param selecting by package, used as a condition | **Native**: `filter`, `window`, `calculate` | **Native** `facet` | 302 ms |
| Plotly | 83 | By hand | By hand: `plotly_hover` + `restyle`, ~10 lines | By hand (transforms removed in v3) | Native `layout.grid`, ~15 lines of `xaxisN` keys | 43 ms |
| ECharts | 85 | **Native** (`endLabel`, de-collided, dimmed on hover) | Partly: dimming native (`emphasis.focus`), nearest-line pick ~12 lines by hand | By hand | **Native** (`matrix` coordinate system, new in 6) | 64 ms |
| µPlot | 85 | By hand on canvas | **Native** (`cursor.focus.prox`) | By hand | Seven instances with a synced cursor | 24 ms |
| Chart.js | 96 | By hand (plugin labels) | By hand: scriptable `borderColor` + `onHover`, ~10 lines | By hand | Seven separate charts | 77 ms |
| D3 | 100 | By hand | By hand: Delaunay nearest point | By hand | Data join of seven cells | 27 ms |

### Missing data: the side test

Five countries of World Bank life expectancy, with years removed on purpose and turned into explicit nulls; the same input to all seven.

- All seven break the line at explicit nulls: six by default, D3 with `.defined()` (without it the path is invalid from the first null on).
- All seven draw straight across a row that is simply absent from the data. A gap your loader does not turn into a null is not a gap to any library.

## What surprised us

- **Decimation decides what the chart says.** At full zoom-out the true solar peak is 16,289 MW. The five libraries that draw every point or keep each pixel column's min and max (µPlot, D3, Plotly, Chart.js, ECharts with `minmax`) show it. A daily-mean line shows 5,444 MW, which is why Plot and Vega-Lite draw a daily low-to-high band under theirs; the band shows 16,289.
  - ECharts' own samplers at 1,100 px: `minmax` 16,289, `max` 16,289, `lttb` 16,095, `average` 5,310.
  - The number each library drew is in its card's footer.
- **Plotly paints 1.25M points in about 0.7 s, then hovers at one frame a second.** With `hovermode: "x unified"`, `scattergl` checks every point within `hoverdistance` (default 20 px) across the full plot height: about 6,000 half-hours × 4 series per mouse move, 1 to 1.8 s. `hoverdistance: 1` brings it to 72 to 184 ms. Nothing warns you.
- **ECharts' sampling has a tooltip gotcha.** Unsampled, 1.25M points paint in about 0.3 s (timed by hand while building) but hover and zoom run at ~5 fps; `sampling: "minmax"` fixes that. Then the stock axis tooltip lists only the series whose sampled point matches the snapped time, often one of four, with plausible-looking values. The fix is a five-line formatter that reads the whole dataset row; you only find you need it by checking the numbers.
- **Vega-Lite's interactivity is one line; its scale ceiling is low.** Zoom and pan is `{select: {type: "interval", encodings: ["x"]}, bind: "scales"}`, the crosshair tooltip is one more param, and whole-line highlight is a condition. But there is no decimation (`sample` is random reservoir sampling), no minimum span on bound scales, and the nearest-point crosshair alone cost 5 to 14 s of the 17.8 s full-resolution paint, on the canvas renderer.
- **Only ECharts lays out end-of-line labels.** The other six needed the same shared de-collision helper on both the oil and npm charts. On the npm chart ECharts also dims the labels of the other 21 lines when you hover one.
- **The same chart looks different at full resolution.** At 300 half-hours per pixel column the series overplot into solid envelopes, with solar a yellow mass on top. Plot's and Vega-Lite's daily bands look calmer and still reach the peak. Both are the data; zoom to a month and the lines separate.
- **Chart.js was quick on the dense chart.** All 1.25M points in, min-max decimation, about 85 ms, every half-hour visible once zoomed in. The work is elsewhere:
  - five extra `<script>` tags for the annotation and zoom plugins and their dependencies, none needed for the decimation itself
  - `order: -i` plus `legend.reverse` to get last-on-top
  - a time axis that formats in local time while the tooltip says UTC (the luxon adapter with `zone: "UTC"` fixes it)
- **Only D3 shares one line generator between SVG and canvas.** The same `d3.line()` with `.context(ctx)` strokes all 1.25M points on a canvas, with zoom, pan and a crosshair in an SVG layer on top. It is the normal D3 route for big data, not a workaround.

## How to read the numbers

- **Render times**
  - Timed from the render call until two animation frames after the library's promise resolves. Library download, data fetch and parse are excluded.
  - Table figures are medians of six warm runs per chart (after one first run, reported separately), read from each chart's badge by a script.
  - Apple M4 MacBook, Chrome 158, 900 × 700 viewport. The [measurement record](docs/measurements/timings-2026-11-21.md) has every run, the min and max, and a DPR 2 repeat.
  - The badge on each live card is a single run in your browser and will differ.
  - Interaction timings (hover, zoom redraws) and grid steps a library did not ship were timed by hand while building, and are labelled as such.
  - SVG and canvas libraries finish at different points, and Vega-Lite and Plotly are timed until their render promise resolves, so the figures are what each chart cost here, not a library's throughput. Treat anything under a factor of two as the same.
- **Line counts**
  - The render function exactly as it ran (`Function.prototype.toString()`), comments included, printed under each chart.
  - Excluded for all: the shared helpers (`spreadLabels`, 13 lines; `viewSwitch`; `aggregate`; `between`; `toRows`; `ink`) and each library's own theme helper.
  - The theme helpers differ in size: ECharts 24-line theme object, Plotly ~15-line layout template, Chart.js 10-line `Chart.defaults` setter, Vega-Lite 20-line `embed` with the theme as config, Plot one-line `style`, D3 and µPlot none.
  - A rough guide to our implementation, not the library: formatting and helper placement move a count by five or ten lines either way. Good for "about half" or "about the same", never "12% fewer".
- **Bundle sizes**
  - `gzip -9` of every file each demo page fetches from jsDelivr, captured from the network, in KB of 1,000 bytes, on 21 November 2026 ([record](docs/measurements/bundles-2026-11-21.md), per file).
  - These are the full builds you get from a CDN tag, which is how these pages load them.
  - D3: 118 KB, as the 35 ES module files the page loads (`+esm` resolves some of D3's own dependencies to two versions, so four modules arrive twice; the single-file `d3.min.js` is 93 KB).
  - Observable Plot: 190 KB as loaded, 72 KB plus the same D3 modules, which it imports.
  - Vega-Lite: 283 KB, 82 KB plus Vega 180 KB plus vega-embed 21 KB.
  - Plotly.js: 1,480 KB, the full `plotly.js-dist-min` (the `basic` and `gl2d` partial bundles are smaller and untested).
  - Chart.js: 122 KB, 71 KB plus annotation 13, zoom 6, hammer 7, luxon 24 and the adapter 1.
  - Apache ECharts: 368 KB (a custom build can be much smaller).
  - µPlot: 23 KB, 22 KB plus 1 KB of CSS.
- **Native, by hand, partly**
  - Our calls after building, backed by the source on each page.
  - A plugin a library needed (Chart.js annotation and zoom) counts as native, with the dependency noted.
