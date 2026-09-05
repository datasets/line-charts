# Analysis & method

How this bake-off is scoped, and why. The verdict is in [EVALUATION.md](./EVALUATION.md); the build log the verdict rests on is in [docs/BUILD-NOTES.md](./docs/BUILD-NOTES.md).

## Starting point

This is a 2026 rebuild of [datopian/line-charts](https://github.com/datopian/line-charts) (2016), which compared Vega, Vega-Lite, Plotly, D3, Chart.js and Bokeh with one dataset each and a hand-scored shortlist. Ten years on: Bokeh is Python-first and awkward to embed as a static JS demo, jQuery/Bootstrap/D3v3 are gone, and the field has two strong new entrants (Observable Plot, ECharts) plus a legitimate performance specialist (µPlot) that didn't exist in 2016. Kept from the original: one folder per library, a shared `data/` directory, and a scorecard. New: the same chart repeated across libraries rather than a different one-off chart per library, visible source under every chart (their issue #21, never done), and a validated colour-blind-safe palette applied identically everywhere.

## Why the method changed

The first version of this site drew four datasets — CO₂ at Mauna Loa, an energy mix, life expectancy, four thousand days of BTC — in all seven libraries, and produced seven charts that looked about equally good. That is a real result, and it is useless: every modern charting library is good at "plot a line and let the defaults do the work", and 4,000 points does not stress anything (every library drew them in under 30 ms). A comparison where everyone scores well is measuring the wrong thing.

So the question changed from *can it draw this data* to *what does it cost to publish this chart*. The test is now one chart that asks for the things a data story actually needs and that library demos rarely show: labels attached to lines, a sentence pointing at a specific moment in the data, an event marked behind the series, a threshold called out, and two series made to matter more than three. Those are the requirements libraries genuinely differ on, and the differences turn out to be large — 46 lines to 104, and one library that cannot draw an arrowhead at all.

## The hero chart

Electricity generation by source (`assets/data/energy-mix.csv`, 5 series × 27 years, TWh), drawn identically by all seven libraries, with these requirements in roughly increasing order of how much they separate the libraries:

1. **Direct end-of-line labels**, colour-matched to each line. No legend.
2. **An annotation with a leader line** pointing at the 2011 coal/gas crossover, reading "gas overtakes coal".
3. **A shaded x-range band** across 2008–09 labelled "financial crisis", behind the lines.
4. **Emphasis**: wind and solar at full colour and weight; coal, gas and nuclear muted to one grey and told apart by their labels.
5. **A dashed, labelled reference line** at 100 TWh.
6. **Responsive behaviour**: nothing collides or overflows as the chart narrows.

Every library reads the same geometry — band edges, reference value, annotation text and its anchor points — from a single `HERO` constant in `assets/js/data.js`, so no library is drawing a slightly different chart. The chart's title and standfirst are card HTML for all seven equally: no library was asked to lay out running text, because that would measure something else.

## The second chart

**Life expectancy at birth** (5 countries × 63 years, with deliberate missing years) stays from v1 because it produced the sharpest finding there and still does: only Observable Plot breaks a line at a `null` without being told to. Every other library needs an explicit flag, and the failure mode is silent — a real gap in the data becomes a confident straight line between two known points.

CO₂ at Mauna Loa and BTC-USD were retired. Neither differentiated anything. Their CSVs remain in `assets/data/`.

## How the line counts are measured

The number under each hero chart and on the front page is the `hero()` render function exactly as it ran, via `Function.prototype.toString()` — so the displayed code and the counted code cannot drift from what drew the chart. The count includes the function's own comments and signature. It excludes three things, identically for every library:

- `spreadLabels()` in `assets/js/page.js` — 17 lines of shared, library-agnostic end-label de-collision. Five of the seven libraries need it (ECharts has `labelLayout`; D3 and the rest do not). It is shared rather than copied so that five identical blocks of code do not inflate five line counts by the same amount.
- The `HERO` geometry constants, which are data.
- The card's title and description, which are HTML.

Where a library's hero function still leans on a module-level helper, the build notes say so. D3's does not: its hero chart is deliberately standalone, axes and gridlines included, which is why it is the only count that includes roughly 20 lines the other six get for free.

## What "good" means here

Quality of the finished chart above all, and what it cost to get there. Not GitHub stars, not benchmark throughput: which library, given the same data and the same colours, produces the chart a data journalist would actually publish, with the least fighting — and, separately, which one keeps producing it when the data changes and two labels land on the same pixel.

Scoring dimensions, all 1–5 and all filled in after building rather than before: annotation API, direct labels, whether it worked first try, editorial quality of the result, escape hatch when the API runs out, bundle size, and docs/ecosystem. Plus the measured line count, which is not a score at all.

## Ground rules

1. **Same data, same geometry, same palette.** The validated categorical reference palette (colour-blind-safe in light and dark) is fed into each library's own theming rather than using its defaults, so "quality" is not partly a measure of colour choice. The two emphasised series take palette slots; the three context series share one grey from the same theme.
2. **Zero build step.** Plain HTML + ES modules, libraries from jsDelivr at pinned versions. This mirrors how these libraries actually get dropped into a static site or a data story, and keeps the repo trivially deployable with no CI.
3. **Source is always visible**, and for the hero chart it is expanded by default rather than hidden behind a disclosure — "what does it take to build this" is the question the site exists to answer.
4. **Failures are recorded, not worked around.** Where a library could not do something — Vega-Lite's missing arrowhead, µPlot's reference line that had to move on top of the data — the closest honest approximation is shipped and the loss is written down in the build notes.

## Libraries in scope, and why

Picked to cover the real decision space: a low-level toolkit, a modern grammar of graphics, a declarative-spec option, a batteries-included option, the popular default, a production/enterprise option, and a raw-performance option.

- **D3** — the ceiling. Everything else is measured against what full control costs in code.
- **Observable Plot** — D3's own answer to "D3 is too much code for a standard chart".
- **Vega-Lite** — the other declarative-grammar lineage, JSON-spec rather than JS-object.
- **Plotly.js** — the batteries-included interactive option.
- **Chart.js** — the incumbent default; smallest API surface, biggest ecosystem.
- **Apache ECharts** — the enterprise/production option; built for dashboards at scale.
- **µPlot** — the performance specialist; what you reach for once a chart library's overhead is itself the bottleneck.

Deliberately **excluded** (reasoning on the front page under "Considered, not included"): Highcharts (not free for commercial use — this project only compares permissive OSS), React-only libraries (Recharts/visx/Nivo — this site is framework-free by design), full Vega (Vega-Lite represents the family), and several libraries that don't clearly beat the seven above on any axis this brief cares about (ApexCharts, Chartist, Frappe Charts, billboard.js).

## Extending this later

- **More libraries.** Copy `demos/uplot.html` + `demos/uplot.js` (the smallest pair), swap the CDN script and the two render functions, add a cell to the grid in `index.html`. Data loading, palette, layout, the source panel, the line count and light/dark are all handled by `assets/js/{data,theme,page}.js`.
- **A harder responsive test.** The annotation text is placed in data coordinates in all seven libraries, which is right at desktop width and starts to graze the coal line below about 400 px. A version that reflows or drops annotations by width would separate the libraries again.
- **A React-flavoured page**, for Recharts/visx/Nivo, since this site is intentionally framework-free.
