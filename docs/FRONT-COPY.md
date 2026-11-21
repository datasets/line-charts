# Front page copy

The words for `index.html`, in page order. Numbers match `EVALUATION.md` (served as `/verdict`); if one changes, change both. Chips are short evidence labels to sit under each ranking row.

## Title and lede

**Title:** Which JavaScript line-chart library should you use?

**Lede:** We built the same three charts in seven libraries, from real data, so you don't have to. Here is the pick, the evidence, and the source under every chart.

## The verdict

**Use Apache ECharts, unless the chart is going into an article: then use Observable Plot.**

## The ranking

Ranked for someone choosing one library in 2026 for a website or an app, with no framework constraint. Tested on real data: forty years of oil prices, Britain's grid every half hour since 2009, and a decade of npm downloads.

Criteria line under the list: Weighed for DataHub, in this order: what the library does natively rather than by hand, interaction on the dense chart, keeping the true extremes in dense data, the finished appearance, then bundle size. Line counts are colour, never a criterion.

1. **Apache ECharts**: use it when you want one library for everything, from an annotated story chart to a 1.25M-point dashboard. Chips: `all three tests met, mostly as options` · `1.25M pts in ~100 ms, zoom + slider built in` · `end labels laid out for you` · `368 KB gzipped`
2. **Observable Plot**: use it when the chart is going into an article, a report or a static page. Chips: `44 lines, the fewest` · `renders to static SVG at build time` · `no zoom or pan` · `dense chart: a daily mean and low–high band`
3. **D3**: use it when the chart is the product, or the team already writes D3. Chips: `1.25M pts on canvas in ~70 ms` · `everything met, everything by hand` · `60/100/100 lines, 1.3 to 2.6× Plot`
4. **Plotly.js**: use it when you want callouts as single objects and zoom in config, and can pay 1.5 MB. Chips: `best callout model: one object each` · `1.25M pts in ~0.7 s via scattergl` · `hover 1 to 1.8 s per move until tuned` · `1.48 MB gzipped`
5. **µPlot**: use it when speed and size are the whole problem. Chips: `1.25M pts in ~25 ms` · `23 KB` · `no annotation model` · `wheel zoom and pan are hooks you write`
6. **Chart.js**: use it when you already use it. Chips: `all three tests met` · `1.25M pts in ~85 ms, decimation built in` · `five extra scripts to load and keep in step` · `canvas only, and the most small traps`
7. **Vega-Lite**: use it when the chart must be a JSON spec and the data is small. Chips: `zoom, pan and hover in a few lines of params` · `zoom redraw 0.9 s per frame at hourly` · `no decimation, no minimum zoom span` · `dense chart: a daily mean and low–high band`

Per-use-case line under the list: **Articles:** Plot. **Dashboards and dense data:** ECharts (µPlot if only speed matters). **Many series:** ECharts interactive, Plot static. **Already have one:** keep it; the verdict says what to add.

## We're choosing for DataHub

We did this to choose for ourselves. DataPressr, which renders DataHub's data stories, draws its charts with Observable Plot to static SVG at build time, and that stays: for a published chart with a sentence pointing at the data, Plot is the least code and the best result. For interactive and dense charts on DataHub we will use ECharts. Two libraries, each where it won.

## The centrepiece

Show the grid chart in **Apache ECharts** by default. Reasons: zoom, pan, the slider, box zoom, the restore button and the one-week floor are all config; it takes all 1,251,264 points and keeps the true solar peak; and it is the library we are recommending, so the reader is testing the verdict. µPlot is four times faster but its wheel zoom, pan and all touch handling are hand-written hooks; D3 is 7 fps fully zoomed out. Open on a readable fortnight so the daily solar hump and the overnight wind are visible as lines.

Two things for whoever builds it: (1) an `inside` dataZoom takes the scroll wheel, so a reader scrolling the front page will get stuck zooming; set `zoomOnMouseWheel: "ctrl"` (or equivalent) and word the hint to match. (2) Nobody has tested this on a phone yet; pinch and the slider should work, double-click will not, so point touch users at the restore button. Check it before launch.

**Caption and hint: per library**, set by the switcher from `STAGE_LIBS` in `index.html`, because each library does something different with the two-week window. Every caption ends: "Coal was 42% of generation in 2012, its highest year here; Ratcliffe, Britain's last coal plant, closed on 30 September 2024."

- **ECharts**, **D3**, **Plotly**, **Chart.js**, **µPlot**: all 1,251,264 points loaded (with how each keeps every pixel's high and low, or draws every point), opened on two weeks of April 2026 with the record solar peak. Hint: that library's real controls (ECharts adds the slider and restore button; Plotly's drag zooms and pan is its pan tool, and on touch it starts with dragging off so the page scrolls; µPlot's drag zooms and Shift + drag or one finger pans), plus "Zoomed out, each pixel holds days of half-hours and the series become solid bands: that is the data, not a bug."
- **Plot**: no zoom, so it draws only the two weeks, at full resolution (2,688 points), as static SVG; its full chart draws seventeen years as a daily mean over a daily low-to-high band. Hint: hover for the crosshair; no zoom or pan.
- **Vega-Lite**: redraws everything per zoom frame, so it loads only the two weeks, at full resolution: zoom out and the rest is empty; its full chart is the daily band. Hint: Ctrl/⌘ + scroll or trackpad pinch to zoom, drag to pan, double-click to reset; no one-week floor; on touch it did not pan or zoom in our tests.

**Switcher label:** Same chart, same data, other library: D3 · Plot · Vega-Lite · Plotly · Chart.js · µPlot.

## The evidence

Three tests, each a different kind of line chart, each built to one shared brief in all seven libraries. Every cell below is live; the source and the measured line count are under each one.

- **Oil, 1986–2026** (EIA, 20k points): the annotated editorial chart. End labels, callouts with leaders, recession bands, an axis that crosses zero for WTI at −$36.98 on 20 April 2020.
- **Grid, half-hourly** (NESO, 1.25M points): the dense interactive chart. Zoom and pan to one week, a crosshair tooltip, and a straight answer to "did you draw the solar peak?"
- **npm downloads** (22 libraries, 2015–2026): the many-series chart. Log scale, highlight one of 22, an indexed view and small multiples.

Footnote: a missing-data side test (World Bank life expectancy, years removed on purpose) gives all seven the same explicit nulls. All seven implementations break the line at a null: six by default, D3 with `.defined()`.

## How we judged

- **What the library did itself.** Each requirement is marked native, by hand or not met, with the source on the page as proof. A chart that needs forty lines of canvas is a different answer from one that needs an option.
- **How it fought back.** Silent failures, defaults that mislead, plugins and hooks needed to get there. Build notes record every one.
- **What it costs and how it looks.** Lines of code as displayed (a rough guide, not a score), gzipped bundle as loaded from the CDN, render times (medians of six warm runs on one machine, linked to the method page), and whether the result is a chart you would publish.

## Versions and date

Measured 20–21 November 2026 on D3 7.9.2, Observable Plot 0.6.19, Vega-Lite 6.5.0 (Vega 6.4.0, vega-embed 7.4.0), Plotly.js 4.3.0, Chart.js 4.6.1 (annotation 3.1.0, zoom 2.2.0), Apache ECharts 6.1.0 and µPlot 1.6.32, all loaded from jsDelivr at those pins.

## FAQ

**Is the data real?** Yes. Oil prices are EIA daily spot prices, the grid is NESO's half-hourly GB generation mix, the npm numbers are the registry's download API, and the missing-data side test is World Bank life expectancy with some years removed on purpose to make gaps. Provenance and the exact files are in the repo. The September version used a synthetic electricity mix titled as if it were fact; we replaced it.

**Why not Highcharts, Recharts, ApexCharts or Nivo?** Highcharts is not free for commercial use and everything here is permissive open source. Recharts, Nivo and visx are React wrappers; this site is framework-free and a React page is a separate job. ApexCharts, Chartist, Frappe and billboard.js were not tested, so we make no claim about them.

**Aren't line counts meaningless?** Nearly. They count the render function as it ran, comments included, and exclude shared helpers for everyone and each library's theme helper (which ranges from one line to 24). Formatting moves them by five or ten lines. We use them to say "about half", never to rank. The finding is what is native and what is not, and that is on each page.

**Was this built by AI?** Yes, by AI coding agents under our direction, each library by a separate agent working from one shared brief and a Plot reference. We reviewed every chart against the requirements, re-measured the numbers, and the source is under every chart so you can check our work. The verdict page says exactly how.

**Why quote full bundles?** Because that is what a CDN tag loads, and it is how these pages use them. Sizes are gzip -9 of every file each page fetches from the CDN, CSS and imported modules included: µPlot 23 KB, D3 118 KB, Chart.js 122 KB with its plugins, Plot 190 KB with the D3 it imports, Vega-Lite 283 KB with Vega, ECharts 368 KB, Plotly 1.48 MB. ECharts custom builds, Plotly partial bundles and D3 submodules are all smaller; we did not test them.

**SVG or canvas, and what about accessibility?** Plot and D3 draw SVG here (D3 can draw canvas too, and does for the grid). Vega-Lite via vega-embed defaults to canvas; we used SVG except on the grid. Plotly draws SVG, and WebGL for `scattergl`. Chart.js and µPlot are canvas only. ECharts defaults to canvas, with an SVG renderer and server-side SVG rendering available. SVG text is selectable and inspectable, and Plot, D3 and Vega render it in Node at build time; canvas gives a screen reader nothing without extra work. Plot draws the grid at a daily step because SVG is too slow for 1.25M points; Vega-Lite does because its dataflow is, even on canvas.

**I use React. Does this apply?** The ranking does: ECharts, Plot and the rest all mount in a React component as they do here. Recharts, Nivo and visx are not tested, and a React page is the obvious next bake-off.

**Why does the Plot grid chart look different from the others?** It draws one value per day instead of every half-hour, because full resolution took 9 to 13 s in SVG: each day's mean as a line, over a band from that day's lowest to highest half-hour. The band keeps the true solar peak (16,289 MW); a mean line alone would show 5,444. Vega-Lite does the same, because its dataflow re-runs on every zoom frame: even hourly data took 0.9 s per wheel step. Zoomed in, a daily step shows days, not half-hours. The footer under each chart says what was drawn.

## Links

- `/verdict`: **Read the full verdict**: the ranking with reasons, scorecards for all three tests, what surprised us, and what we got wrong in September.
- `/method`: **How we tested**: the brief each library was built to, the data, and how the numbers are measured.
- `/build-notes`: **Build notes, library by library**: what fought back and what was a pleasure, from the agents who built each one.
