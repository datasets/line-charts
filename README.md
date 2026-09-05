# line-charts

A 2026 bake-off of leading open-source line-charting libraries. All seven build the **same annotated, editorial-quality chart** — direct end-of-line labels, an annotation with a leader line, a shaded event band, a dashed reference line, two series emphasised against three muted ones — from identical data, identical geometry and the same colour-blind-safe palette. The front page renders all seven live, side by side, with each one's measured line count. Every chart's source is on its page, expanded.

Not "can it draw a line": every modern library can, which is exactly why the first version of this site failed to tell you anything. The spread on the annotated chart is 46 lines to 104, and one library cannot draw an arrowhead at all.

A modern rebuild of [datopian/line-charts](https://github.com/datopian/line-charts) (2016).

**[→ open the site](./index.html)** · method in [ANALYSIS.md](./ANALYSIS.md) · verdict in [EVALUATION.md](./EVALUATION.md) · build log in [docs/BUILD-NOTES.md](./docs/BUILD-NOTES.md)

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

It's static HTML — any static host works, no build step and no CI. This copy is deployed to Cloudflare Workers from `main` via `wrangler.jsonc` (unknown paths serve `404.html` rather than soft-404ing to the index); non-production branches get preview deploys.

## Layout

```
index.html                 the comparison itself: seven live cells + one chart selector
ANALYSIS.md                method: the hero chart's requirements, how lines are counted
EVALUATION.md              the verdict: scorecard + recommendation
docs/
  BUILD-NOTES.md           what building the hero chart was actually like, per library
  ROADMAP.md               the brief this version was built to
assets/
  css/site.css             shared theme tokens (validated palette, light+dark) + chrome
  js/
    theme.js               palette + dark-mode helpers
    data.js                CSV loading, the two shared datasets, and HERO — the hero
                           chart's geometry, identical for all seven libraries
    page.js                demo-page framework: layout, source panel, timing, line counts
  data/                    the CSVs (co2 and btc are retired but kept)
demos/
  <library>.html           loads the library's CDN build + the page framework
  <library>.js             two render functions: hero, life
```

## Add a library

1. Copy `demos/uplot.html` + `demos/uplot.js` (the smallest pair) to `demos/<name>.{html,js}`.
2. Swap the CDN `<script>`/import for the new library.
3. Rewrite the two render functions (`hero`, `life`) in `mountDemo({ meta, charts })` — each gets `(host, data, { theme })` and returns an optional cleanup function (or a promise of one, for async libraries). Read the hero chart's geometry from `HERO` in `assets/js/data.js` rather than inventing your own, or the comparison stops being one.
4. Add the slug to `LIBS` in `index.html`, a card to the library grid, and a row to the scorecard in EVALUATION.md.

Data loading, the shared palette, dark mode, the source panel, the measured line count and the "rendered in N ms" badge are all handled by `assets/js/page.js` — a new library page only needs the two render functions.

## Data

In use: `energy-mix.csv` (the hero chart — 5 series × 27 years) and `life-expectancy.csv` (the gap test — deliberately has missing years). Both synthetic but shape-realistic, generated once and never regenerated, so every library draws byte-identical input.

Retired but kept: `co2-mauna-loa-monthly.csv` (real NOAA Mauna Loa monthly CO₂, reused from the `co2-ppm` dataset in the neighbouring `datapressr` repo) and `btc-usd-daily.csv`. Neither differentiated the libraries — see ANALYSIS.md, "Why the method changed".

## License

MIT for the code in this repo. Each charting library keeps its own license — noted on its demo page and in EVALUATION.md.
