# line-charts

Seven open-source JavaScript line-chart libraries (D3, Observable Plot, Vega-Lite, Plotly.js, Chart.js, Apache ECharts, µPlot), each building the same three charts from real data, live, with the source shown and its lines counted:

- **Oil:** an annotated editorial chart of Brent and WTI daily prices, 1986–2026, including WTI's −$36.98 day.
- **Grid:** a dense interactive chart of Britain's electricity generation every half hour since 2009: 1.25M points, zoom, pan and a crosshair.
- **npm:** a many-series chart of weekly downloads for 22 charting packages, on a log scale, with hover highlight, an indexed view and small multiples.

Plus a small missing-data test. A modern rebuild of [datopian/line-charts](https://github.com/datopian/line-charts) (2016).

**Live: https://linecharts.datahub.io/** · [verdict](https://linecharts.datahub.io/verdict) ([EVALUATION.md](./EVALUATION.md)) · [method](https://linecharts.datahub.io/method) ([ANALYSIS.md](./ANALYSIS.md)) · [build notes](https://linecharts.datahub.io/build-notes) ([docs/BUILD-NOTES.md](./docs/BUILD-NOTES.md))

## Run it locally

No build step. The demos load their libraries from jsDelivr and read the data with `fetch()`, so you need an `http://` server, not `file://`.

The site uses extensionless URLs (`/demos/d3`, `/method`), which the host maps to `.html` files. Python's server does not, so with it the front page's iframes and the doc-page links 404. Either use a server that maps clean URLs:

```sh
npx serve .          # maps /demos/d3 to demos/d3.html; open http://localhost:3000/
npx wrangler dev     # serves exactly as production does, from wrangler.jsonc
```

or use Python and open the pages by file name:

```sh
python3 -m http.server 8080
# http://localhost:8080/demos/d3.html             all four charts, with source
# http://localhost:8080/demos/d3.html?chart=grid  one chart (add &bare=1 for the embed view)
# http://localhost:8080/method.html               method page (also verdict.html, build-notes.html)
```

## Deploy

Static files only, no CI. Deployed to Cloudflare from `main` as static assets (configuration in `wrangler.jsonc`; unknown paths serve `404.html` rather than the front page). Other branches get preview deploys.

## Layout

```
index.html               front page: verdict, then the seven libraries live, one test at a time
verdict.html             renders EVALUATION.md       (/verdict)
method.html              renders ANALYSIS.md         (/method)
build-notes.html         renders docs/BUILD-NOTES.md (/build-notes)
changelog.html           renders changelog/*.md, listed in changelog/manifest.json
EVALUATION.md            the verdict
ANALYSIS.md              the method: tests, data, ground rules, line counts, timings, scope
docs/
  TESTS.md               the builders' brief: every requirement, the decimation ladder, what to report
  BUILD-NOTES.md         what building each test was like, per library
  ROADMAP.md             the brief the September version was built to (historical)
assets/
  css/site.css           theme tokens (validated palette, light and dark) and page chrome
  js/
    data.js              lazy loaders, the spec constants (HERO, GRID, NPM), aggregate(), DATASETS card copy
    page.js              demo-page framework: cards, render badge, line counts, source panel,
                         shared helpers spreadLabels() and viewSwitch()
    theme.js             palette and light/dark helpers
    doc.js               renders a repo Markdown file into verdict/method/build-notes
    markdown.js, changelog.js   the changelog page
  data/                  the CSVs, with provenance in data/README.md
  og/                    social preview images
demos/
  <library>.html         loads the library from jsDelivr (pinned) and the framework
  <library>.js           one render function per test: hero (oil), grid, npm, life
```

## Add a library

1. Read [docs/TESTS.md](./docs/TESTS.md), then `demos/observable-plot.js`, the reference implementation.
2. Copy a pair such as `demos/uplot.html` + `demos/uplot.js` to `demos/<name>.{html,js}` and swap the pinned CDN `<script>` or import.
3. Write the render functions in `mountDemo({ meta, charts })`: `hero`, `grid`, `npm`, `life`. Each is `(host, data, { theme, report })` and may return a cleanup function or a promise of one. Read every dataset value from `HERO`, `GRID` and `NPM` in `assets/js/data.js`; don't retype numbers. For grid, follow the decimation ladder and call `report({ points, step, note })` with the solar peak you drew.
4. Fill in `meta` (name, version, licence, bundle size, notes) and `meta.cardNotes` for each test, including the grid ladder timings.
5. Check 900 px and 360 px, light and dark, with no console errors.
6. Add the slug to `LIBS` in `index.html`, a URL to `sitemap.xml`, and the library to EVALUATION.md.

Data loading, palette, dark mode, the source panel, the line count and the render badge are handled by `assets/js/page.js`.

## Data

Full provenance and trimming steps: [assets/data/README.md](./assets/data/README.md).

| File | Test | Source | Licence |
|---|---|---|---|
| `oil-brent-daily.csv`, `oil-wti-daily.csv` | oil | U.S. Energy Information Administration spot prices, via the DataPressr snapshot of 2026-09-05 | public domain (DataPressr copy PDDL-1.0) |
| `gb-grid-halfhourly.csv` | grid | NESO, Historic GB Generation Mix | NESO Open Data Licence |
| `gb-grid-annual.csv` | grid (checks the 2012 coal share) | annual sums of the same NESO file | NESO Open Data Licence |
| `npm-chart-libs-weekly.csv` | npm | npm download counts API | npm registry terms |
| `life-expectancy.csv` | missing data | World Bank WDI life expectancy (`SP.DYN.LE00.IN`), with 15 country-years removed on purpose | CC BY 4.0 |

Retired and unused: `energy-mix.csv` (the synthetic September hero), `co2-mauna-loa-monthly.csv`, `btc-usd-daily.csv`.

## Licence

MIT for the code in this repo. Each charting library keeps its own licence, shown on its demo page. Data licences as above.
