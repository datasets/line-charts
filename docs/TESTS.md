# The three tests: builder's brief

Seven libraries build the same three charts plus the missing-data side test. This file is the method: what each chart must do, what is shared, and what to write down. The reference implementation is `demos/observable-plot.js`; read it first.

## Ground rules

- Work only in `demos/<lib>.js` (and `demos/<lib>.html` if you need another script tag or plugin). Everything shared (data, specs, page framework) is in `assets/js/` and is frozen; if something there is wrong, report it, don't patch it.
- One render function per chart key in `mountDemo({ meta, charts })`: `hero`, `grid`, `npm`, `life`. Signature `(host, data, ctx) => cleanup | Promise<cleanup> | void`. `data` is `{ [key]: dataset }`, loaded lazily for that card only. `ctx` is `{ theme, datasets, key, report }`. A missing key shows a "not built yet" card, so ship each one as it works.
- **Read every dataset-specific value from the spec constants** (`HERO`, `GRID`, `NPM` in `assets/js/data.js`): domains, ticks, tick formats, colours, callout positions and text, event dates, end-label format, heights. Don't retype a number. Colours in specs are a palette slot or theme token: resolve with `ink(theme, spec.color)`.
- The line count is the render function's own source (`Function.prototype.toString()`), so helpers outside it are free; keep library-specific helpers inside the function, or count them honestly in your notes. Shared helpers that every library may use without penalty: `spreadLabels` (end-label de-collision), `viewSwitch` (the npm view toggle), `aggregate` / `toRows` (the grid ladder), `ink`.
- Idiomatic and concise: write what a competent user of the library would write. If a requirement needs heroic code, do the honest minimum and say so in a card note rather than faking it.
- Size to `host.clientWidth`; height from the spec (`HERO.height(w)`, `GRID.height(w)`, `NPM.height(w)`). Check 900 px and 360 px. Return a cleanup that destroys the instance (resize and theme changes re-render).
- No console errors or warnings.

## Test A: `hero`, Forty years of oil (annotated editorial)

Data `{ hero: oil }`: `oil.rows` (long `{date, series, price}`), `oil.cols[key].{t,y}` (typed arrays, epoch ms), `oil.aligned` (one shared x; a null there is a holiday: bridge it with spanGaps/connectNulls, unlike the life test).

1. Direct end labels at `HERO.x.domain[1]`, text from `HERO.endLabel(series, lastValue)`, de-collided (`spreadLabels`), no legend.
2. Callouts from `HERO.callouts`: a dot at `date`/`value`, a leader from the point to `at`, text at `at` with `anchor` and `valign` (bottom = text sits above the anchor point), lines from `lines`. Show only `rank <= HERO.calloutBudget(width)`.
3. `HERO.bands` (NBER recessions) behind everything, one label `HERO.bandLabel` (text-anchor start at its band's `from`).
4. y-domain `HERO.y.domain` (crosses zero), ticks `HERO.y.ticks` with `HERO.y.format` ("−$40"), a zero rule drawn darker than the grid.
5. Series order and style from `HERO.series` (WTI muted underneath, Brent in slot 0 on top, widths given). x ticks are `HERO.x.ticks` (decades).
6. 360 px: nothing overlaps. A crosshair/tooltip is welcome, not required.

## Test B: `grid`, The grid, every half hour since 2009 (dense interactive)

**One of these will be the front-page centrepiece**, embedded as `demos/<lib>.html?chart=grid&bare=1` at ~1100 px wide. It must look good full-width and must support **zoom/pan and a hover tooltip wherever the library can**.

Data `{ grid }`: columnar, `grid.t` (Float64Array, epoch ms; µPlot wants seconds or `ms: 1`), `grid.coal|gas|wind|solar` (Float64Array MW), `grid.n`, `grid.keys`, `grid.step`. `toRows(grid, "long"|"wide")` if you need objects.

**The decimation ladder** (identical for everyone, so results are comparable):

1. Try `full` (1,251,264 points). If your library has its own downsampling (ECharts `sampling: "lttb"`, Chart.js decimation plugin, Plotly `scattergl`), you may use it at this step; say which.
2. If first paint takes more than ~3 s, or the page locks up, step down to `aggregate(grid, "hour")` (625k), then `aggregate(grid, "day")` (26k). Same object shape at every step; buckets are means, with `.min[k]` / `.max[k]` if you want to draw the envelope.
3. Keep the step that paints in a reasonable time and **record the timings of the steps you tried** in the card note (render badge numbers, two runs each).

Requirements:

1. Series, order and colours from `GRID.series`; y from `GRID.y` (domain, ticks, "GW" format); a legend or direct labels.
2. Zoom and pan (wheel and/or drag-select), never narrower than `GRID.zoom.minSpanMs` (one week), with a reset (double-click is fine). If the library has none, say so in the card note; don't build 200 lines of it.
3. Crosshair with one tooltip listing all four series at the nearest timestamp.
4. Decimation honesty: report the solar peak you actually drew against `GRID.peaks.solar.mw` (16,289).
5. Events from `GRID.events`: a rule at "Ratcliffe, last coal plant, closes 30 Sep 2024" (label text-anchor end, at the top) and the "2012: coal 42%" text (anchor start).
6. Call `report({ points, step, note })`: `points` = points handed to the library, `step` = `"full"|"hour"|"day"` (append "+lttb" etc. if the library decimated further), `note` = `"solar peak drawn X MW of 16,289 MW"`.

The badge measures from the call until two animation frames after your promise resolves, so return a promise if your library draws asynchronously. On the front page grid cells render one at a time.

## Test C: `npm`, Who actually installs these? (many series)

Data `{ npm }`: `npm.keys` (22 packages), `npm.weeks` (Date[]), `npm.t`, `npm.cols[pkg]` ((number|null)[]), `npm.rows` (long `{week, package, downloads}`). Null = no downloads that week (missing, not zero).

1. Log y: `NPM.y` (domain [100, 1e8], clip below; ticks 1k … 100M; `NPM.y.format`).
2. All 22 lines; the seven from `NPM.seven` in their palette slots, the rest `NPM.others` grey. Draw greys first.
3. End labels for the seven plus `NPM.alsoLabel` (recharts, in muted ink): `NPM.endLabel(s, last)`, de-collided in log space.
4. Hover highlights the nearest whole line (dim the rest) with a tooltip showing package and value.
5. Views via `viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" }, (view, out) => …)`:
   - indexed: weeks from `NPM.index.date` on, each series ÷ its value that week × 100, log y `NPM.index` (domain, ticks, format, `endLabel`), a rule at 100. Use the library's transform if it has one (Plot `normalizeY`, Vega-Lite `joinaggregate`/`calculate`), else by hand; it is part of the line count.
   - multiples: the seven, `NPM.multiples.columns(width)` columns × `NPM.multiples.height` px, shared log y.
6. Readable without a legend at 640 px.
7. `report({ points, step: "full" })`.

## `life`: missing data

World Bank life expectancy, five countries, with years removed on purpose (see assets/data/README.md); the loader turns each removed year into an explicit null. A null must break the line. Leave it as it is unless it is broken.

## What counts as done

- All four keys render at 900 and 360 px, light and dark, no console errors, nothing overlapping.
- Every requirement above is met or a card note says plainly which isn't and why.
- `meta.cardNotes = { hero, grid, npm }`: one or two sentences each on what the library made easy or hard, shown on the card. For grid, include the ladder timings.
- Retire your `energyV1` function (the old hero, kept only for reference) once `hero` is done.

## What to write down (return to the coordinator, ~150 words)

Per test: line count, render time (two runs), for grid the ladder step and timings of each step tried plus the solar peak drawn, which requirements were met natively / by hand / not at all, and the one thing a reader should know about this library from building it.
