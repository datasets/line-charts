# Roadmap — make the bake-off actually discriminate

Written 2026-09-04. The site works but fails its own brief: seven libraries all look about equally good, because the four datasets don't ask anything hard of them. Everything below follows from that.

## The core problem

The current four charts (CO₂, energy mix, life expectancy, BTC) are all "plot a line and let the defaults do the work." Every modern library is good at that, so the page shows seven near-identical results and the reader learns nothing. 4,000 points does not stress anything — every library rendered it in under 30 ms. The comparison only becomes real when the chart demands things libraries genuinely differ on.

## The hero chart

One chart, done properly, in every library. Modelled on an annotated New York Times / Financial Times editorial line chart — the thing you actually reach for a charting library to build in a data story.

Dataset: `assets/data/energy-mix.csv` (5 series, 1997–2023, TWh), already in the repo.

Required features, in rough order of how much they separate the libraries:

1. **Direct end-of-line series labels**, coloured to match each line. No legend.
2. **An annotation with a leader line** pointing at the coal/gas crossover (~2011), reading "gas overtakes coal".
3. **A shaded x-range band** across 2008–2009 labelled "financial crisis", sitting behind the lines.
4. **Emphasis**: wind and solar at full colour and weight; coal, gas and nuclear muted to context greys.
5. **A horizontal reference line** at 100 TWh, dashed and labelled.
6. **Responsive behaviour**: labels must not collide or overflow when the chart narrows.

This is the whole point of the exercise — it is expected that some libraries do this in ten declarative lines, some need an extra plugin, and some need a hand-written draw hook. That spread is the finding. Record honestly, per library: lines of code, whether a plugin or escape hatch to a lower-level API was needed, and anything that could not be done at all.

## Datasets: four down to two

Keep:
- **The hero chart** (above), primary on every page.
- **Life expectancy** — the gap-handling test. It stays because it produced the sharpest finding in EVALUATION.md: only Observable Plot breaks a line at a null without configuration, and a silent bridge across missing data is a genuinely misleading default.

Drop **CO₂** and **BTC-USD**. Neither differentiates. Leave their CSVs in `assets/data/` — they cost nothing and may be useful later.

## The front page becomes the comparison

A visitor should see the actual comparison immediately, without clicking or scrolling to a table.

- A **grid of every library rendering the same chart**, live, above the fold. A chart selector switches all cells at once.
- Each cell is a `<iframe>` onto `demos/<lib>.html?chart=<key>&bare=1`, labelled with the library name, linking through to the full page. Iframes because several libraries register globals and ship their own CSS; isolation is free this way.
- The scorecard table moves to EVALUATION.md. It is a conclusion, not a landing experience.

## Source code is the product, not a footnote

"What does it actually take to build this?" is the question the site exists to answer, so the code should not be behind a `<details>` disclosure.

- Show the hero chart's source expanded by default, beside or beneath its chart.
- Include a per-library line count for the hero chart, and surface it on the front page — a real, measured number that means something.
- Keep using `Function.prototype.toString()` so the displayed code cannot drift from the code that ran.

## Order of work

1. Hero chart in all seven libraries — everything else depends on it.
2. Front-page comparison grid.
3. Retire CO₂ and BTC.
4. Source code promoted to a first-class element.
5. Rewrite ANALYSIS.md and EVALUATION.md around what the hero chart actually showed.
