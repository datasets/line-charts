# line-charts

A 2026 bake-off of leading open-source line-charting libraries. Every library draws the same four datasets with the same colour-blind-safe palette, so what you're comparing is the library — its default quality, its API, how it handles real-world messiness (missing data, 4,000 noisy points, five crossing series) — not someone's styling effort. Every chart's source is visible inline.

A modern rebuild of [datopian/line-charts](https://github.com/datopian/line-charts) (2016).

**[→ open the site](./index.html)** · method in [ANALYSIS.md](./ANALYSIS.md) · verdict in [EVALUATION.md](./EVALUATION.md)

## Libraries

D3 · Observable Plot · Vega-Lite · Plotly.js · Chart.js · Apache ECharts · µPlot

## Run it

Zero build step. Any static file server works — the demos load their libraries from jsDelivr and read the sample data with `fetch()`, which needs `http://`, not `file://`:

```sh
python3 -m http.server 8080
# or: npx serve .
```

then open `http://localhost:8080/`.

## Deploy it

It's static HTML — push to a `gh-pages` branch (or enable Pages on `main` in repo settings) and it's live. No build step, no CI needed.

## Layout

```
index.html                 landing page + scorecard
ANALYSIS.md                method: datasets, scoring dimensions, library shortlist
EVALUATION.md               the verdict: scorecard reasoning + recommendation
assets/
  css/site.css              shared theme tokens (validated palette, light+dark) + chrome
  js/
    theme.js                palette + dark-mode helpers
    data.js                 CSV loading + the four shared datasets
    page.js                 demo-page framework: header, 2×2 grid, source-code panel, timing
  data/                     the four shared CSVs
demos/
  <library>.html            loads the library's CDN build + the page framework
  <library>.js               four render functions: co2, energy, life, btc
```

## Add a library

1. Copy `demos/uplot.html` + `demos/uplot.js` (the smallest pair) to `demos/<name>.{html,js}`.
2. Swap the CDN `<script>`/import for the new library.
3. Rewrite the four render functions (`co2`, `energy`, `life`, `btc`) in `mountDemo({ meta, charts })` — each gets `(host, data, { theme })` and returns an optional cleanup function (or a promise of one, for async libraries).
4. Add a card to `index.html`'s library grid and a row to the scorecard.

Data loading, the shared palette, dark mode, the source-code disclosure, and the "rendered in N ms" badge are all handled by `assets/js/page.js` — a new library page only needs the four render functions.

## Data

Real: `assets/data/co2-mauna-loa-monthly.csv` (NOAA Mauna Loa Observatory monthly CO₂, reused from the `co2-ppm` dataset in the neighbouring `datapressr` repo). Synthetic but shape-realistic: `energy-mix.csv`, `life-expectancy.csv` (deliberately has missing years), `btc-usd-daily.csv`.

## License

MIT for the code in this repo. Each charting library keeps its own license — noted on its demo page and in EVALUATION.md.
