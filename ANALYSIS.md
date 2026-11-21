# Method

How the bake-off is set up, what is measured, and what is not. The verdict is on [the verdict page](./EVALUATION.md). What building each chart was like is in [the build notes](./docs/BUILD-NOTES.md). The builders' brief, word for word, is [docs/TESTS.md](./docs/TESTS.md).

## Why three kinds of line chart

Line charts are used in roughly three ways. Journalists and report writers make the annotated story chart: few series, decades of data, and the meaning sits in the labels, bands and callouts (the FT's Visual Vocabulary puts the line first under "change over time"; Datawrapper's line-chart guidance is almost all about that furniture). Monitoring and ops tools make the dense interactive chart: hundreds of thousands to millions of points, zoom by drag, a crosshair (Grafana's default time-series panel is built on µPlot). Science and analytics tools make the many-series chart: twenty or more lines, a log scale, a few highlighted against a grey field, an index-to-100 view (Our World in Data's Grapher is the model). Each kind ranks the libraries differently, which is the point of testing all three. Sparklines, step charts and dual axes are variations one of these can carry, so they are not tested separately.

## The three tests

Each test is one real dataset and a fixed list of requirements. The requirements below are the ones shown on every card. The fuller builder's version, with the exact spec constants, is in [docs/TESTS.md](./docs/TESTS.md).

### Oil: the annotated editorial chart

Brent and WTI daily spot prices, 1986–2026, about 20,000 points. Five shocks, four US recessions, and 20 April 2020, when WTI settled at −$36.98. It stresses the annotation layer, an axis that crosses zero, drawing behind the data, emphasis, and callouts that adapt to width.

1. Direct end labels ("Brent $96", "WTI $91"), no legend, not overlapping.
2. Callouts with leader lines to the true data point; the −$36.98 point marked with a dot.
3. Four NBER recession bands behind the lines, one label.
4. y-axis crosses zero: domain includes −37, a distinct zero line, ticks "−$40 … $160".
5. Brent full ink, WTI muted but readable; decade ticks on x.
6. Narrow widths: callouts dropped in the declared order (`HERO.calloutBudget`), never piled up.

### Grid: the dense interactive chart

GB electricity generation by fuel, every half hour since 2009: 312,816 half-hours × 4 series = 1,251,264 points. Coal falls from 42% of generation in 2012 to zero, wind rises, solar is a daily hump. It stresses raw point count, time to first paint, zoom and pan, a crosshair tooltip, and honest decimation.

1. Draw all 1.25M points if you can; otherwise step down the ladder (full → hour → day) and report the step.
2. Zoom and pan (wheel + drag), down to one week, with a reset.
3. Crosshair with one tooltip listing all four series at the nearest timestamp.
4. Decimation honesty: does the solar peak survive at full zoom-out (true peak 16,289 MW)?
5. Event markers: a rule at "Ratcliffe, last coal plant, closes 30 Sep 2024" and the "2012: coal 42%" label.
6. Time to first paint on the card (the badge waits for the frame).

### npm: the many-series chart

Weekly npm downloads of 22 charting packages, March 2015 to November 2026: the seven in colour, fifteen others in grey. The headline is that Recharts out-downloads all seven. It stresses many series, a log scale, highlighting one line of many, end-label collision, a normalise transform and small multiples.

1. Log y with ticks 1k … 100M; empty weeks are missing, not zero.
2. All 22 drawn; hover highlights the nearest line (not point) with its name and value.
3. The seven in colour with non-colliding end labels; the rest grey.
4. A toggle to the indexed view (15 Jan 2024 = 100), with the library's own transform if it has one.
5. Small multiples of the seven on a shared log scale.
6. Identifiable without a legend at 640 px.

### Side test: missing data

World Bank life expectancy at birth for five countries, 1960–2022, with 15 country-years removed on purpose (India 1969, 1980, 1991, 2002, 2013; Nigeria 1994–1997; China 1960–1965) to make gaps. One requirement: a null year breaks the line and is not bridged. Every library now receives the same explicit nulls (see "What the September version got wrong").

## Data

All the datasets are snapshots committed to the repo, so every library reads byte-identical input. Full provenance, row counts and trimming steps are in [assets/data/README.md](./assets/data/README.md).

| Test | Source | Licence |
|---|---|---|
| Oil | U.S. Energy Information Administration, spot prices RBRTE and RWTC, via the cleaned DataPressr snapshot of 2026-09-05 (EIA's current files have dropped ~890 Brent and ~740 WTI historical days) | US Government work, public domain (DataPressr copy PDDL-1.0) |
| Grid | NESO, Historic GB Generation Mix (`df_fuel_ckan.csv`), trimmed to four integer-MW columns; wind is transmission plus embedded | NESO Open Data Licence |
| npm | npm download counts API, daily counts summed to Monday-start weeks | npm registry terms (factual telemetry) |
| Missing data | World Bank, World Development Indicators, `SP.DYN.LE00.IN`, 1960–2022, with 15 country-years removed on purpose | CC BY 4.0 |

Every number in an annotation (−$36.98, $143.95, 16,289 MW, coal on the day Ratcliffe closed) was checked against these files; coal's 42% in 2012 against the annual totals committed beside the grid file (`gb-grid-annual.csv`), since its denominator, total generation, is not in the half-hourly file. The closure date itself is from press reports of the operator's announcement, cited in the data README. npm downloads count CI runs and mirrors, not people.

## Ground rules

- **Same data, same spec constants.** Every dataset-specific value (domains, ticks, tick formats, colours, callout positions and text, event dates, end-label format, heights) lives in one constant per test (`HERO`, `GRID`, `NPM` in `assets/js/data.js`). No library retypes a number.
- **Same palette.** One colour-blind-safe palette, light and dark, fed into each library's own theming rather than its defaults.
- **Pinned versions,** loaded from jsDelivr:
  - D3 7.9.2
  - Observable Plot 0.6.19
  - Vega-Lite 6.5.0, with Vega 6.4.0 and vega-embed 7.4.0
  - Plotly.js 4.3.0 (`plotly.js-dist-min`, the full bundle)
  - Chart.js 4.6.1, with chartjs-plugin-annotation 3.1.0, chartjs-plugin-zoom 2.2.0, hammerjs 2.0.8, luxon 3.7.2 and chartjs-adapter-luxon 1.3.1
  - Apache ECharts 6.1.0
  - µPlot 1.6.32
- **Zero build step.** Plain HTML and ES modules. This is how these libraries get dropped into a static page or a data story.
- **Source shown as it ran.** The code under each chart is the render function itself, via `Function.prototype.toString()`, so the shown code cannot drift from the code that drew the chart.
- **Idiomatic, not golfed.** Builders were told to write what a competent user of the library would write, and where a requirement would need heroic code, to do the honest minimum and say so in the card note.
- **Comparable, not identical.** The charts follow one spec, but each library draws with its own text metrics, hit-testing and defaults. Differences in the finished pictures are partly library and partly implementation choice; the build notes say which where it matters.

## How lines are counted

The number on each card is the line count of that chart's render function as displayed: signature, comments and closing brace included, blank lines included. It describes these implementations, not an intrinsic property of the library.

Excluded for everyone:

- The spec constants (`HERO`, `GRID`, `NPM`), which are data.
- Shared, library-agnostic helpers in `assets/js/`, which any library may call without penalty: `spreadLabels` (13 lines of end-label de-collision, used by six of the seven; ECharts lays out its own end labels), `viewSwitch` (the npm view toggle), `aggregate` and `toRows` (the grid ladder), and `ink` (resolves a palette slot or theme token).
- Card titles and descriptions, which are HTML.

Library-specific theme helpers sit outside the render functions and are not counted either. They do the job Plot's one-line `style` option does, so they are disclosed here rather than added:

- ECharts: a 24-line `houseStyle()` theme object passed to `echarts.init()`. Without it each chart would need roughly 8–15 more lines of axis colour options.
- Plotly: a ~15-line layout `template()`, applied to every axis including the small multiples.
- Chart.js: a `themed()` function of eight `Chart.defaults` settings (10 lines with its braces), called by every chart.
- Vega-Lite: a ~24-line `embed()` wrapper (the vega-embed call plus the theme as Vega-Lite `config`) and a 1-line `fmt()` that registers a spec formatter as a Vega expression function.
- µPlot: about 6 lines of tooltip CSS in its HTML page, used by the grid and npm tooltips (Plot's tooltip is built in).

D3's three render functions are standalone: scales, axes, gridlines and interaction are all in the counted code.

| Library | Oil | Grid | npm |
|---|---|---|---|
| D3 | 60 | 100 | 100 |
| Observable Plot | 44 | 32 | 77 |
| Vega-Lite | 53 | 51 | 81 |
| Plotly.js | 49 | 44 | 82 |
| Chart.js | 70 | 67 | 96 |
| Apache ECharts | 51 | 49 | 85 |
| µPlot | 65 | 80 | 85 |

Read a line count together with the requirements it meets. Plot's 32-line grid has no zoom or pan and draws daily means; D3's 98 draws every point with zoom, pan and a crosshair.

## How timings are measured

The "rendered in N ms" badge starts when the render function is called and stops when its returned promise (if any) resolves and two animation frames have passed, so it includes the library's first paint. It excludes downloading and evaluating the library, and fetching and parsing the data (the parse time is shown separately, on hover over the points line).

The numbers quoted on this site are single runs, at 900 px wide unless stated, on one machine and one browser. They vary from run to run, often by 30% or more, and are slower when the machine is busy. They are there to show orders of magnitude (50 ms against 2 s against 13 s), not to rank libraries that are within a factor of two of each other. This is not a benchmark. Libraries also differ in renderer: SVG (D3 for oil and npm, Plot, Vega-Lite except its grid), Canvas (D3 and Vega-Lite for the grid, Chart.js, ECharts, µPlot) and WebGL (Plotly's grid). That choice is part of what is being compared.

Bundle sizes on the demo pages were measured on 21 November 2026: gzip of the pinned CDN files each page loads, in KB of 1,000 bytes (D3 109 KB as its 30 ES modules, Observable Plot 181 KB with the D3 it imports, Vega-Lite 283 KB with Vega and vega-embed, Plotly.js 1,483 KB, Chart.js 122 KB with its plugins, ECharts 368 KB, µPlot 22 KB). The breakdown is in EVALUATION.md. None of them is the size of a tree-shaken production build.

## The decimation ladder

The grid test gives every library the same ladder: try all 1,251,264 points; if first paint takes more than about 3 s or the page locks up, step down to hourly means (625,632 points), then daily means (26,068). The shared `aggregate()` builds each step, so every library that steps down draws the same buckets. A library may use its own downsampling at the full step (Chart.js's decimation plugin, ECharts' `sampling`) and must say which.

Which step a library ships is part of the finding, not a footnote, because decimation changes what the reader sees. Daily means flatten the solar peak from 16,289 MW to 5,444 MW: a chart that paints in 0.3 s but tells you solar never passed 5.5 GW. So every library reports the solar peak it actually drew. Per-pixel min/max methods (Chart.js `min-max`, ECharts `minmax`, µPlot's line builder) keep the true peak; averaging does not.

## What the September version got wrong

The first version (September 2026) drew one synthetic electricity chart plus the missing-data test. A pre-launch review found real problems:

- **Synthetic data** with real-sounding units, disclosed only in the README. Now every chart uses real, sourced data.
- **One kind of chart, a general verdict.** A 135-point annotated chart cannot tell you which library suits a dashboard. Now there are three kinds, and the verdict says which kind each recommendation is for.
- **The missing-data test fed different data to different libraries.** Two got sparse rows with no nulls; five got explicit nulls. All seven now get the same explicit nulls.
- **Inconsistent standards.** Chart.js was counted with a hand-written canvas plugin for end labels when its annotation plugin plus the shared label helper would do, and a hand-drawn arrowhead counted as a feature in D3 but a gap in Vega-Lite.
- **Timings read as a speed ranking** (4 ms against 80 ms, SVG against Canvas, single runs). Now they are framed as above.
- **"Identical geometry" was overclaimed**: libraries used different curve interpolations and one ignored a spec value. Now the claim is "comparable".
- **Old major versions** (ECharts 5, Vega-Lite 5, Plotly 3). Now the current majors.

## How it was built

In November 2026, one AI coding agent per library built that library's three charts from the shared brief ([docs/TESTS.md](./docs/TESTS.md)), working only in its own `demos/<library>.js` and `.html`, with the data, spec constants and page framework frozen. Observable Plot was built first as the reference implementation. That is a disclosed bias: the brief was written alongside it. Each implementation was then reviewed against the requirements, with screenshots at 900 and 360 px, light and dark, and no console errors or warnings. The builders' notes are distilled in [the build notes](./docs/BUILD-NOTES.md).

Corrections from people who know these libraries well are welcome. If a requirement can be met more idiomatically or in fewer lines, open an issue or a pull request and the count will change.

## Scope and exclusions

- **Permissive open source only.** Highcharts is excluded because it is not free for commercial use.
- **Framework-free.** React-only libraries (Recharts, visx, Nivo) are out of scope; Recharts appears in the npm chart as data, not as a contestant.
- **Not tested:** ApexCharts, Chartist, Frappe Charts, billboard.js, full Vega (Vega-Lite stands for the family), TradingView lightweight-charts and others. Not tested means exactly that; it is not a claim that they would do worse.
- **Not measured:** accessibility, server-side rendering, live data append, memory use, print output, and the size of a production build.
