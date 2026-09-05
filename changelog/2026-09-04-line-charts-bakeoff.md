---
date: 2026-09-04
title: Line-charts bake-off — seven libraries, one palette
promote: true
---

Built a bake-off of seven open-source line-charting libraries — D3, Observable Plot, Vega-Lite, Plotly.js, Chart.js, Apache ECharts, and µPlot — each drawing the same four datasets (CO₂ at Mauna Loa, electricity generation by source, life expectancy across five countries, and ~4,000 noisy BTC-USD points) with the same colour-blind-safe palette, so what's compared is the library and not someone's styling effort. Every chart shows its own source inline.

See it live: [linecharts.datahub.io](https://linecharts.datahub.io/). It's a modern rebuild of the 2016 [datopian/line-charts](https://github.com/datopian/line-charts), with zero build step — plain HTML and ES modules.

Unlike the tables bake-off, this one commits to a verdict. Method is in `ANALYSIS.md`; the full reasoning is in `EVALUATION.md`, with a subjective 1–5 scorecard on the front page:

- **Default choice: Observable Plot** — the best-looking chart per line of code, and cheap to ship at ~65 KB.
- **For a published, diffable spec: Vega-Lite** — worth the extra weight when non-developers author or review the charts.
- **When the chart needs to *do* things: Plotly.js or Apache ECharts** — Plotly for exploratory tooling, ECharts for a production dashboard.
- **When bundle size or a deadline dominates: Chart.js.** When the point count is the whole problem: **µPlot** at ~18 KB.
