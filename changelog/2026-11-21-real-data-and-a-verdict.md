---
date: 2026-11-21
title: Real data, and a verdict up front
promote: true
---

The bake-off has been rebuilt around three tests on real data instead of the synthetic chart we started with: Brent and WTI oil prices since 1986 with annotations, Britain's electricity grid every half hour since 2009 (1.25 million points), and weekly npm downloads for 22 charting packages. All seven libraries build all three, with the source under every chart.

- **The answer comes first.** The front page now opens with a verdict and a ranking: use Apache ECharts, unless the chart is going into an article, in which case use Observable Plot. The evidence and the reasoning are one click down on the [verdict page](https://linecharts.datahub.io/verdict).
- **Try it on the page.** The grid chart on the [front page](https://linecharts.datahub.io/) is live: zoom from two weeks out to the whole of 2009 to 2026 with Ctrl/⌘ + scroll or the slider, and switch library to see the same chart drawn by each of the seven.
- **Current versions.** Everything was rebuilt and re-measured in November 2026 on the releases that are current now. Bundle sizes are gzip of the pinned CDN files.

![The grid chart on the front page, two weeks of gas, coal, wind and solar from 1.25M points](assets/changelog/2026-11-21-grid-chart.png)

We also corrected what we got wrong in September. The missing-data finding was a bug in our test: two libraries were given sparse rows and five were given nulls, so we credited flags that were already the defaults. With equal input all seven break the line at a gap. Some of the claims about individual libraries were unfair, and the synthetic data did not ask anything hard of any of them. The [verdict page](https://linecharts.datahub.io/verdict) lists what changed.
