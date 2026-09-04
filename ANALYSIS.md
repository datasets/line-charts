# Analysis & plan

How this bake-off was scoped, and why. Written before building; see
[EVALUATION.md](./EVALUATION.md) for what came out of it.

## Starting point

This is a 2026 rebuild of [datopian/line-charts](https://github.com/datopian/line-charts)
(2016), which compared Vega, Vega-Lite, Plotly, D3, Chart.js and Bokeh with one
dataset each and a hand-scored shortlist (elegance / ease / performance / features
/ extensibility). Ten years on: Bokeh is Python-first and awkward to embed as a
static JS demo, jQuery/Bootstrap/D3v3 are gone, and the field has two strong new
entrants (Observable Plot, ECharts) plus a legitimate performance specialist
(µPlot) that didn't exist in 2016. Kept from the original: one folder per
library, a shared `data/` directory, and a scorecard. New: same chart repeated
across libraries (the original used a different one-off chart per library, which
made comparison harder), visible source under every chart (their issue #21,
never done), a stress-tested dataset with missing values (their issue #29, "add
a dataset with a lot of points" — extended to also test gaps), and a validated
colour-blind-safe palette applied identically everywhere.

## What "good" means here

The brief: quality of the chart output above all else. Not "which library has
the most GitHub stars" — which one, given the same data and the same colours,
produces the chart a data journalist or analyst would actually want to publish,
with the least fighting.

## Method

1. **One dataset shape, four instances.** Every library renders the same four
   datasets (below) so the only variable is the library.
2. **Same palette everywhere.** The validated categorical reference palette
   (5 slots, colour-blind-safe in both light and dark, from Anthropic's dataviz
   skill) is fed into each library's theme/config rather than using each
   library's own defaults — otherwise "quality" partly measures colour choice
   rather than the library.
3. **Zero build step.** Plain HTML + ES modules, libraries loaded from jsDelivr,
   pinned versions. This mirrors how these libraries actually get dropped into a
   static site or a data story, and keeps the repo trivially deployable
   (GitHub Pages, or any static host) with no CI.
4. **Source is always visible.** Each chart's render function is shown verbatim
   (via `Function.prototype.toString()`) in a "source" disclosure under the
   chart — no separate annotated write-up that can drift from the real code.
5. **Score after building, not before.** The scorecard on the front page and in
   EVALUATION.md reflects what it was actually like to build these 28 charts
   (7 libraries × 4 datasets), not library reputation.

## The four datasets, and what each stresses

| Dataset | Shape | Stresses |
|---|---|---|
| CO₂ at Mauna Loa, monthly | 1 series (+ 1 derived overlay), ~800 pts, real NOAA data | Smooth curves, two lines on one series, date axis, non-zero y-axis |
| Electricity generation by source | 5 series × 27 years | Categorical legend at 5 colours, crossing lines |
| Life expectancy at birth | 5 series × 63 years, **deliberate gaps** | Does a missing value break the line or silently bridge it? Wide y-range, a COVID dip |
| BTC-USD daily close | 1 series, ~4,000 pts | Render speed, noisy data, zoom/pan, optional log scale |

Real data was used where it was cheap and authoritative to get (NOAA Mauna Loa
CO₂, reused from the `co2-ppm` dataset in the neighbouring `datapressr` repo).
The other three are synthetic but shape-realistic — generated once, checked into
`assets/data/`, and never regenerated, so every library draws byte-identical
input.

## Libraries in scope for v1, and why

Picked to cover the real decision space: a low-level toolkit, a modern grammar
of graphics, a declarative-spec option, a batteries-included option, the
popular default, a production/enterprise option, and a raw-performance option.

- **D3** — the ceiling. Everything else is measured against what full control
  costs in code.
- **Observable Plot** — D3's own answer to "D3 is too much code for a standard
  chart."
- **Vega-Lite** — the other declarative-grammar lineage (Vega/ggplot2/Grammar of
  Graphics), JSON-spec rather than JS-object.
- **Plotly.js** — the batteries-included interactive option.
- **Chart.js** — the incumbent default; smallest API surface, biggest ecosystem.
- **Apache ECharts** — the enterprise/production option; the one built for
  dashboards at scale.
- **µPlot** — the performance specialist; what you reach for once a chart
  library's overhead is itself the bottleneck.

Deliberately **excluded** (reasoning on the front page under "Considered, not
included"): Highcharts (not free for commercial use — this project only
compares permissive OSS), React-only libraries (Recharts/visx/Nivo — this site
is framework-free by design), full Vega (Vega-Lite represents the family; full
Vega is much more verbose for the same charts), and several libraries that
don't clearly beat the seven above on any axis this brief cares about
(ApexCharts, Chartist, Frappe Charts, billboard.js).

## Extending this later

- **More libraries.** Copy `demos/uplot.html` + `demos/uplot.js` (the smallest
  pair), swap the CDN `<script>` tag(s) and the four render functions, add a
  card to `index.html`. The shared `assets/js/{data,theme,page}.js` do the rest
  — data loading, palette, layout, the source-code panel, and light/dark are
  all free.
- **A React-flavoured page**, for Recharts/visx/Nivo, since this site is
  intentionally framework-free.
- **A companion `tables/` sibling repo** for the same bake-off applied to data
  tables (mentioned as a follow-up, out of scope here).
