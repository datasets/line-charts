# line-charts — announcement blurbs

Copy to paste when announcing publicly. Three lengths; pick per channel. The dated launch record is `changelog/2026-09-04-line-charts-bakeoff.md`.

Live: https://linecharts.datahub.io/

---

## Short (social / one-liner)

We drew the same four charts with seven line-charting libraries — D3, Observable Plot, Vega-Lite, Plotly.js, Chart.js, ECharts, µPlot — same data, same colour-blind-safe palette, source visible under every chart. Then we scored them → https://linecharts.datahub.io/

---

## Medium (newsletter / LinkedIn / post intro)

Which JavaScript line-charting library should you reach for? We stopped comparing feature lists and drew the same four charts seven times instead: D3, Observable Plot, Vega-Lite, Plotly.js, Chart.js, Apache ECharts, and µPlot — same datasets (CO₂ at Mauna Loa, electricity generation, life expectancy with real missing years, ~4,000 noisy BTC-USD points), same palette, source shown inline under each chart.

Unlike our tables bake-off, this one commits to a verdict:

- **Default choice: Observable Plot** — best-looking chart per line of code, ~65 KB.
- **Published, diffable spec: Vega-Lite** — when non-developers author or review the charts.
- **Interaction-heavy: Plotly.js or Apache ECharts** — Plotly for exploratory tools, ECharts for production dashboards.
- **Bundle size or deadline dominates: Chart.js.** Point count is the whole problem: **µPlot** at ~18 KB.

Full method in ANALYSIS.md, full reasoning in EVALUATION.md: https://linecharts.datahub.io/

---

## Long (blog post / full writeup intro)

**Comparing line-charting libraries by drawing, not by reading.**

This is a 2026 rebuild of [datopian/line-charts](https://github.com/datopian/line-charts) from 2016. The premise is the same: pick the leading open-source line-charting libraries, draw the *same* charts with each, and compare what you actually get — default quality, API, how each handles real-world mess — rather than trusting marketing pages.

**The seven libraries**

D3 · Observable Plot · Vega-Lite · Plotly.js · Chart.js · Apache ECharts · µPlot. Highcharts is excluded (not free for commercial use); React-only libraries (Recharts, visx, Nivo) are out of scope for this framework-free site.

**The four charts**

- **CO₂ at Mauna Loa, monthly** — one series with trend and seasonality plus a deseasonalised overlay; ~800 points, non-zero y-axis.
- **Electricity generation by source** — five series, crossing lines, a five-colour categorical legend.
- **Life expectancy, five countries** — deliberate missing years: does the line break or bridge? Wide value range, a COVID dip.
- **BTC-USD daily** — ~4,000 noisy points. Render speed, zoom/pan, optional log scale.

Every library gets the same data from the same loader and the same colour-blind-safe categorical palette (light and dark). Each chart's render function is shown in full under the chart.

**The verdict**

The front page carries a subjective 1–5 scorecard across default look, API ergonomics, custom ceiling, built-in interactivity, performance, bundle size, a11y/SSR, and docs. The short version:

- **Default choice: Observable Plot.** The best-looking chart per line of code of anything tested, with sane gap handling and axis defaults, at ~65 KB.
- **When you need a published, diffable spec: Vega-Lite.** If charts live in a CMS or notebook where non-developers author or review them, "the chart *is* this JSON" is worth the extra weight.
- **When the chart needs to do things: Plotly.js or Apache ECharts.** Plotly wins on interaction density with zero configuration (pay for it in ~1.1 MB); ECharts is the production-grade sibling — the only library here scoring 5 on both interactivity and performance.
- **When bundle size or a deadline dominates: Chart.js.** Still the right default for "a line chart, quickly, that a junior dev can maintain."
- **When the point count is the whole problem: µPlot.** ~18 KB, ~4,000 points with room to spare — reach for it once another library's overhead is the bottleneck.

Method and caveats: `ANALYSIS.md`. Full reasoning: `EVALUATION.md`.
