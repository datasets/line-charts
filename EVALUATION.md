# The verdict

Which JavaScript line-chart library to use in 2026, for a website or an app, decided by building the same three charts in seven libraries from real data. The method is on the [method page](./method); what each build was like, library by library, is in the [build notes](./build-notes); every chart on the site is live and its source is under it.

**Use Apache ECharts, unless the chart is going into an article: then use Observable Plot.**

## The ranking

For someone choosing one line-chart library today, with no framework constraint and no existing investment. The ranking weighs how much of each chart the library did itself, how much it fought back, how the result looks, and what it costs to load. Speed counts where it changes what you can build, not as a league table.

| # | Library | Use it when | Why it sits here |
|---|---|---|---|
| 1 | **Apache ECharts** 6.1.0 | You want one library for everything from an annotated story chart to a 1.25M-point dashboard | Five libraries met every requirement; ECharts met the most of them as options rather than code: end-label layout, bands, leaders, zoom, pan, slider, one-week floor and sampling are all config. 1.25M points in 163 ms with everything interactive. Two things to know: its stock tooltip shows wrong values once sampling is on (a 5-line formatter fixes it), and 368 KB gzipped is the price. |
| 2 | **Observable Plot** 0.6.19 | The chart is going into an article, a report or a static page | The least code and the cleanest result on the editorial chart (44 lines) and on the many-series chart (77, with the index and the small multiples native). Static SVG, so it renders at build time. No zoom or pan, and on the dense chart it draws daily means: 26k points paint in a third of a second, 626k hourly points took about 5 s, and we did not test in between. |
| 3 | **D3** 7.9.2 | The chart is the product, or you already think in D3 | Did everything, including 1.25M points on canvas through the same `d3.line()` generator in 173 ms with zoom and pan, and the result is the sharpest. It costs 1.3 to 3 times Plot's code (60/100/100 lines), every piece of furniture by hand. |
| 4 | **Plotly.js** 4.3.0 | You want callouts as single objects and zoom in config, and can pay 1.5 MB | The best annotation model in the set (a callout is one object, leader and dot included), and `scattergl` draws all 1.25M points. But at that size the default hover took 1 to 1.8 s per mouse move until tuned (a 2-line fix you find by profiling), a drag-zoom redraws in 0.3 to 1 s, and the bundle is 1.48 MB gzipped, four times ECharts. |
| 5 | **µPlot** 1.6.32 | Speed and size are the whole problem | 1.25M points in 44 ms, redraws in about 20 ms, 22 KB. No annotation model at all: about 45 of the oil chart's 65 lines are canvas furniture. Wheel zoom, pan and the one-week floor are hooks you write, and drag-to-zoom does not work on touch. Fifth overall because it does least for you; first if the point count is the problem. |
| 6 | **Chart.js** 4.6.1 | You already use it | Met every requirement, and handled all 1.25M points in 236 ms with the built-in min-max decimation. But it needed five extra scripts to do so (annotation, zoom, hammer, luxon and its adapter), the most code on the oil chart (70) and second-most on npm (96), and the most small traps: inverted draw order, no explicit tick list, decimation that breaks index tooltips, a time axis that formats in local time. |
| 7 | **Vega-Lite** 6.5.0 | The chart must be a JSON spec, and the data is small | The fewest lines of interaction code of the seven (zoom, pan, crosshair and whole-line hover are each a few lines of `params`, no event code) and a fine editorial chart. But scale is where it hurts: at full resolution the lines alone took 3.7 s and the shipped chart with its crosshair 17.8 s; even at hourly, each zoom step took 0.9 s because the whole dataflow re-runs per frame; there is no decimation and no minimum zoom span. |

### By use case

- **Editorial and article charts: Observable Plot.** Bands, leaders, dots and labels are ordinary marks, mark order is z-order, and it renders to static SVG in Node. The one gap is end-label layout, which you write yourself (we use a 13-line shared helper). If labels must survive data you have not seen, ECharts does that layout for you.
- **Dashboards and big or dense time series: Apache ECharts.** `sampling: "minmax"` keeps the solar peak at the true 16,289 MW, `dataZoom` gives wheel, drag, slider and a one-week floor in config, and the typed arrays go in as a column dataset with no reshaping. If you are drawing hundreds of thousands of points live and nothing else, µPlot: 44 ms, 22 KB.
- **Many series, exploratory: Apache ECharts for an interactive page, Plot for a static one.** ECharts dims the other 21 lines and their labels with one option (`emphasis.focus: "series"`) and lays out the end labels itself, though picking the nearest line under the pointer is about 12 lines by hand; Plot's `normalizeY` and facets make the indexed view and the small multiples a few lines each.
- **You already have one:** keep Chart.js and add `chartjs-plugin-annotation` and `chartjs-plugin-zoom`; keep Plotly and set `hoverdistance` before you ship a big chart; keep Vega-Lite while your charts stay in the tens of thousands of points; keep D3 if the team already writes it.

### What DataHub uses

We did this to choose for ourselves. DataPressr, the engine behind DataHub's data stories, renders its charts with Observable Plot to static SVG at build time, and nothing here changes that: for a published chart with a sentence pointing at a specific moment in the data, Plot is the least code and the best result. For interactive and dense charts on DataHub, where the reader needs to zoom into seventeen years of half-hourly data, we will use ECharts.

## Scorecards

Three tests, each a different kind of line chart, built to one shared brief in all seven libraries. "Native" means the library did it as an option or a mark; "by hand" means event handlers, pixel maths or canvas calls; the key number follows. Line counts are the render function as displayed on the page (see [how to read the numbers](#how-to-read-the-numbers)). Render times are a single run at 900 px on one machine.

### Oil, 1986 to 2026: the annotated editorial chart

EIA daily Brent and WTI spot prices, 20,203 points. End labels with no legend, five callouts with leader lines (fewer as the chart narrows), four recession bands behind the lines, a y-axis that crosses zero for WTI at −$36.98 on 20 April 2020, decade ticks, nothing overlapping at 360 px. All seven met every requirement; what differs is how.

| Library | Lines | End labels (de-collision) | Callouts | Bands and zero rule | Exact ticks | Render |
|---|---|---|---|---|---|---|
| ECharts | 51 | **Native**: `endLabel` + `labelLayout.moveOverlap` | Native: `markPoint` + `markLine` | Native: `markArea`, `markLine` | `customValues` on both label and tick | 121 ms |
| Plot | 44 | By hand (shared helper) | Marks: `link` + `dot` + `text` | Marks: `rect`, `ruleY` | Native | 120 ms |
| Plotly | 49 | By hand (no annotation collision handling) | Native: one annotation each, leader and dot included | Native: `shapes` below, axis `zeroline` | Native | 126 ms |
| Vega-Lite | 53 | By hand | Native layers: `rule`, `circle`, multi-line `text` | Native | Custom formatter needs `customFormatTypes: true`, or it is dropped with a console warning and the default format used | 128 ms |
| Chart.js | 70 | By hand (annotation-plugin labels, `clip: false`) | Native via plugin: three annotations each | Native via plugin | `afterBuildTicks` hook, no tick list option | 94 ms |
| D3 | 60 | By hand | By hand: a `g` of line, circle and tspans | By hand | Native | 52 ms |
| µPlot | 65 | By hand on canvas | By hand on canvas, in device pixels | By hand on canvas | Native (`splits`) | 19 ms |

Six of seven de-collide the end labels with the same shared helper; ECharts is the only one that does it itself. Of µPlot's 65 lines, about 45 are the editorial layer; the chart itself is about 20.

### The grid, every half hour since 2009: the dense interactive chart

NESO GB generation by fuel, 312,816 half-hours × 4 series = 1,251,264 points. Draw as many as you can, zoom and pan down to one week with a reset, a crosshair tooltip with all four series, event markers, and report the solar peak you drew against the true 16,289 MW.

| Library | Lines | Points in, and what is drawn | First paint | Solar peak drawn | Zoom and pan, one-week floor | Crosshair tooltip |
|---|---|---|---|---|---|---|
| ECharts | 49 | 1,251,264 in; `sampling: "minmax"` keeps each pixel column's min and max (~2k per series at 1,100 px) | 163 ms | **16,289** | **Native**: wheel, drag, slider, box zoom, restore button, `minValueSpan`; double-click reset is a one-line handler | Native, but a 5-line formatter is needed once sampling is on (see below) |
| µPlot | 80 | 1,251,264 in; the path builder keeps each pixel column's min and max | 44 ms | **16,289** | Partly: drag zoom and reset native; wheel, pan and the floor are ~20 lines of hooks; no touch drag-zoom | Crosshair native, tooltip ~10 lines by hand |
| D3 | 100 | 1,251,264 in, every point stroked on canvas | 173 ms | **16,289** | By hand: `d3.zoom` + `rescaleX`, ~10 lines; ~7 fps fully zoomed out, smooth zoomed in | By hand (bisect) |
| Chart.js | 67 | 1,251,264 in; the decimation plugin keeps a min and max per pixel column | 236 ms | **16,289** | Via `chartjs-plugin-zoom`: wheel, drag, `minRange` | 7-line inline crosshair; tooltip reads raw arrays, because decimated datasets no longer share an index |
| Plotly | 44 | 1,251,264 in, every point drawn by `scattergl` | 1,695 ms | **16,289** | Native; floor is a 4-line `relayout` handler; drag-zoom redraws in 0.3 to 1 s | Native (`x unified`), 1 to 1.8 s per move at default `hoverdistance`; 72 to 184 ms at `hoverdistance: 1` |
| Vega-Lite | 51 | 26,068 in (daily means), every point drawn, canvas renderer | 461 ms | 5,444 | Partly: one param (`bind: "scales"`), no minimum span possible | Native, one param |
| Plot | 32 | 26,068 in (daily means), every point drawn, SVG | 343 ms | 5,444 | **Not met**: no zoom or pan | Native (`pointerX` + `tip`) |

The ladder: full resolution took 9 to 13 s in Plot (SVG) and in Vega-Lite 3.7 s for the lines alone, 17.8 s with the nearest-point crosshair; hourly about 5 s and 7 to 9 s. Both ship the daily step, which draws in a third of a second and flattens the solar peak to a third of its true value. Plot's 32 lines buy a chart that does less. Vega-Lite at hourly, lines only, still took 0.9 s per wheel step, because the whole dataflow re-runs per frame, so even where it paints it does not zoom.

### npm downloads: the many-series chart

Weekly downloads of 22 charting packages, March 2015 to November 2026, 11,268 points. Log scale, the seven in colour with end labels and the rest grey, hover highlights a whole line, an indexed view (15 January 2024 = 100) using the library's own transform if it has one, small multiples on a shared log scale.

| Library | Lines | End labels | Whole-line hover | Indexed view | Small multiples | Render |
|---|---|---|---|---|---|---|
| Plot | 77 | By hand | By hand: ~12 lines of DOM on `plot.value` | **Native** `normalizeY` | **Native** facets | 205 ms |
| Vega-Lite | 81 | By hand | **Native**: a `point` param selecting by package, used as a condition | **Native**: `filter`, `window`, `calculate` | **Native** `facet` | 757 ms |
| Plotly | 82 | By hand | By hand: `plotly_hover` + `restyle`, ~10 lines | By hand (transforms removed in v3) | Native `layout.grid`, ~15 lines of `xaxisN` keys | 104 ms |
| ECharts | 85 | **Native** (`endLabel`, de-collided, dimmed on hover) | Partly: dimming native (`emphasis.focus`), nearest-line pick ~12 lines by hand | By hand | **Native** (`matrix` coordinate system, new in 6) | 99 ms |
| µPlot | 85 | By hand on canvas | **Native** (`cursor.focus.prox`) | By hand | Seven instances with a synced cursor | 37 ms |
| Chart.js | 96 | By hand (plugin labels) | By hand: scriptable `borderColor` + `onHover`, ~10 lines | By hand | Seven separate charts | 173 ms |
| D3 | 100 | By hand | By hand: Delaunay nearest point | By hand | Data join of seven cells | 71 ms |

### Missing data: the side test

Five countries with explicit nulls, the same input to all seven. All seven break the line at a null by default. D3 needs `.defined()` to draw past the first null (without it the path is invalid from that point on). And every one of the seven draws straight across a row that is simply absent from the data: a gap your loader does not turn into a null is not a gap to any library.

## What surprised us

- **Decimation decides what the chart says.** At full zoom-out the true solar peak is 16,289 MW. The five libraries that draw every point or keep each pixel column's min and max (µPlot, D3, Plotly, Chart.js, ECharts with `minmax`) show it. Daily means (Plot, Vega-Lite) show 5,444 MW. ECharts' own samplers at 1,100 px: `minmax` 16,289, `max` 16,289, `lttb` 16,095, `average` 5,310. The number each library drew is in its card's footer.
- **Plotly paints 1.25M points in 1.7 s and then hovers at one frame a second.** `hovermode: "x unified"` asks `scattergl` for every point within `hoverdistance` (default 20 px) across the full plot height; at the zoomed-out view that is about 6,000 half-hours × 4 series per mouse move, 1 to 1.8 s. `hoverdistance: 1` brings it to 72 to 184 ms. A reader who copies the defaults gets a chart that paints fast and hovers slowly, and nothing warns them.
- **ECharts' sampling has a tooltip gotcha.** Unsampled, 1.25M points paint in about 0.3 s but hover and zoom run at ~5 fps; `sampling: "minmax"` fixes that. Then the stock axis tooltip lists only the series whose sampled point matches the snapped time, often one of four, with values that look plausible. The fix is a formatter that reads the whole dataset row. It is five lines, and you would only know to write them by checking the numbers.
- **Vega-Lite's interactivity is one line, and its scale ceiling is low.** Zoom and pan is `{select: {type: "interval", encodings: ["x"]}, bind: "scales"}`; the crosshair tooltip is one more param; whole-line highlight is a condition. It is the fewest lines of interaction code of the seven. But there is no decimation (`sample` is random reservoir sampling), no minimum span on bound scales, and the nearest-point crosshair alone cost 5 to 14 s of the 17.8 s full-resolution paint, on the canvas renderer.
- **Only ECharts lays out end-of-line labels.** Still true after the rebuild: six of seven needed the same shared de-collision helper on both the oil and the npm charts. On the npm chart ECharts also dims the labels of the other 21 lines when you hover one.
- **The same chart looks different at full resolution.** With 300 half-hours per pixel column the series overplot into solid envelopes, solar a yellow mass on top. Plot's daily means look calmer and prettier and hide the peak. Both are the data. Zoom to a month and the lines separate.
- **Chart.js was quick on the dense chart.** All 1.25M points in, min-max decimation, 236 ms, every half-hour visible once zoomed in. The cost is elsewhere: five extra `<script>` tags, `order: -i` plus `legend.reverse` to get last-on-top, and a time axis that formats in local time while the tooltip says UTC (the luxon adapter with `zone: "UTC"` fixes it).
- **Only D3 shares one line generator between SVG and canvas.** The same `d3.line()` with `.context(ctx)` strokes all 1.25M points on a canvas, with zoom, pan and a crosshair in an SVG layer on top. It is the idiomatic D3 route for big data, not a workaround, and no other library here lets the two renderers share the drawing code.
- **The missing-data finding we published in September was a test bug.** Plot and Vega-Lite were handed sparse rows, the other five were handed nulls, and the flags we credited were already the defaults. With equal input, all seven break at a null. See below.

## How to read the numbers

- **Render times** are the badge under each chart: from the render call until two animation frames after the library's promise resolves. They exclude library download, data fetch and parse. The numbers in the tables are a single run at 900 px on one developer laptop in Chromium; the build notes give two or more runs each, and they vary by 20 to 50%. Treat anything under a factor of two as the same. SVG and canvas libraries measure different completion points, and the async libraries differ in what the badge waits for: Vega-Lite's render returns its embed promise, so its badge includes Vega's draw, while Plotly's npm render returns synchronously and its badge does not wait for `newPlot`. So the figures say what each chart cost here, not a library's throughput, and the Vega-Lite npm time (757 ms single run, 651 to 672 ms in the builder's runs) is the one number here measured more strictly than its neighbours.
- **Line counts** are the render function exactly as it ran, via `Function.prototype.toString()`, printed under each chart, comments included. Shared helpers every library may use (`spreadLabels`, 13 lines; `viewSwitch`; `aggregate`; `toRows`; `ink`) are excluded for all. Each library's own theme helper outside the counted function is also excluded, and it is not the same size: ECharts has a 24-line theme object, Plotly a ~15-line layout template, Chart.js a 9-line `Chart.defaults` setter, Vega-Lite a ~20-line `embed` with the theme as config, Plot a one-line `style`, D3 and µPlot none. A library's count describes our implementation of this brief in that library; formatting and where the helpers sit move it by five or ten lines either way. We use the counts to say "about half" or "about the same", never "12% fewer".
- **Bundle sizes** are `gzip -9` of the pinned CDN files the demo pages load, in KB of 1,000 bytes, measured on 21 November 2026: D3 93 KB as the single-file build, 109 KB as the 30 ES modules the demo page loads; Observable Plot 72 KB plus those D3 modules, which it imports, so about 180 KB as loaded; Vega-Lite 82 KB plus Vega 180 KB plus vega-embed 21 KB, 283 KB; Plotly.js 1,480 KB (the full `plotly.js-dist-min`; the `basic` and `gl2d` partial bundles are smaller and untested); Chart.js 71 KB plus annotation 13, zoom 6, hammer 7, luxon 24 and the adapter 1, about 122 KB; Apache ECharts 368 KB (a custom build can be much smaller); µPlot 22 KB plus 1 KB of CSS. These are the full builds you get from a CDN tag, which is how these pages, and most static sites, load them.
- **Native, by hand, partly** are our calls after building, backed by the source on each page. Where a library needed a plugin (Chart.js annotation and zoom), the plugin counts as native and the dependency is noted.

## What we got wrong in September

The first version of this comparison, built in September 2026, got its position roughly right and several of its arguments wrong. Two independent reviews found them before readers did; the November rebuild fixed them.

- **Synthetic data, titled as fact.** The hero chart said "wind and solar overtook coal" about an electricity mix we had generated. Every chart now draws real, sourced data (EIA, NESO, npm), with the provenance in the repo.
- **An unequal missing-data test.** Plot and Vega-Lite received sparse rows, the other five received explicit nulls, and we then credited Plot with breaking gaps nobody else broke. The flags we told readers to set (`spanGaps: false`, `connectgaps: false`, `connectNulls: false`) were already the defaults. All seven now get the same nulls, and all seven break.
- **Unfair claims about Chart.js and Vega-Lite.** We wrote a canvas plugin for Chart.js end labels and counted it against the library when the annotation plugin's labels do the job (80 lines became 70). We said Vega-Lite "cannot draw an arrowhead" (it has directional shapes with `angle`) and that "layers do not share a scale unless every layer says so" (they share by default). We also praised Vega-Lite's emphasis encoding while it was silently not applied, because of a point-scale default. And we said `u.pxRatio` did not exist in µPlot; it is the static `uPlot.pxRatio`.
- **Old versions.** ECharts 5, Plotly 3 and Vega-Lite 5 were each a major behind. Everything now runs the November 2026 releases, listed on every page.
- **Numbers that implied more than they measured.** Millisecond comparisons between SVG and canvas renders of a 135-point chart, bundle sizes that were estimates (Plotly "~1.1 MB" is 1.48 MB measured), and line counts as a headline. The numbers are still here; the section above says what they mean.
- **The verdict was a raw markdown file.** It is now this page, and the front page leads with it.

## How this was made

Built in November 2026 by AI coding agents (Claude Code) under our direction. We wrote the brief: three charts, their requirements, the shared data, specs and palette, and a reference implementation in Observable Plot. Each of the other six libraries was then built by a separate agent working from that one brief, which could read the Plot reference but not the other builds, and each agent returned a build note with its timings, what it met natively, by hand or not at all, and what fought back. We reviewed every chart against the requirements at 900 and 360 px, light and dark, read the notes against the source, and re-measured the numbers we quote. Two further agents reviewed the September site adversarially before the rebuild; their findings are the list above. The prose was drafted by an agent and edited by us. All of it is checkable: every chart on the site is live, its source is under it, and the data and build notes are in the repository.
