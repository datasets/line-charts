# Evaluation

The verdict from building one annotated, editorial-quality line chart in seven libraries, from identical data, identical geometry and an identical palette — plus a gap-handling test. Method is in [ANALYSIS.md](./ANALYSIS.md); what happened during the build, library by library, is in [docs/BUILD-NOTES.md](./docs/BUILD-NOTES.md). Scores are 1–5, subjective, and come from doing the building, not from documentation or reputation.

## What was actually asked of each library

Six things, all of them ordinary for a chart in a data story, none of them the thing library demos show off:

1. Direct end-of-line labels, colour-matched, no legend.
2. An annotation with a leader line pointing at the 2011 coal/gas crossover.
3. A shaded 2008–09 band behind the lines, labelled.
4. Wind and solar at full weight; coal, gas and nuclear muted to one grey.
5. A dashed, labelled reference line at 100 TWh.
6. None of it colliding or overflowing as the chart narrows.

The previous version of this site drew four datasets that asked for none of that, and all seven libraries looked about equally good. They do not look equally good now.

## Scorecard

| Library | Hero lines | Annotation API | Direct labels | Got it right first try | Editorial result | Escape hatch | Bundle | Docs / ecosystem |
|---|---|---|---|---|---|---|---|---|
| D3 | 78 | 1 | 3 | 5 | 5 | 5 | 4 | 5 |
| Observable Plot | **46** | 4 | 2 | 5 | 5 | 4 | 4 | 3 |
| Vega-Lite | 66 | 3 | 2 | 2 | 4 | 3 | 2 | 4 |
| Plotly.js | 60 | 5 | 2 | 3 | 4 | 2 | 1 | 4 |
| Chart.js | 80 | 4\* | 1 | 3 | 4 | 3 | 4 | 5 |
| Apache ECharts | 54 | 5 | **5** | 4 | 4 | 3 | 3 | 4 |
| µPlot | 104 | 1 | 1 | 2 | 3 | 4 | 5 | 3 |

**Hero lines** is measured, not estimated: it is the `hero()` render function as the site displays it, via `Function.prototype.toString()`, and it is printed live under every hero chart and on the front page. It excludes the 17-line shared `spreadLabels()` helper (five of the seven need it), the shared geometry constants, and the chart title, which is card HTML for all seven equally.

**Annotation API** — is a band, a reference line, a leader line with an arrowhead and a free-floating text label part of the library? \* Chart.js scores 4 only with `chartjs-plugin-annotation`, a separate ~30 KB dependency; without it, 1.

**Direct labels** — end-of-line labels, and whether the library keeps them from overlapping. Only ECharts does both.

**Got it right first try** — how much the library fought back between "the code looks right" and "the chart is right".

**Escape hatch** — when the API runs out, how far down can you go and how much of the chart do you keep?

## Recommendation

**For a data story or a one-off editorial chart: Observable Plot.** 46 lines, the fewest of the seven, and it rendered correctly the first time. Annotation is not a subsystem you have to hope is supported — the band is a `rect` mark, the reference line a `ruleY`, the labels `text`, and the leader line a real `Plot.arrow` with a head on it, so all of it composes with the data marks and mark order is z-order. It is ~65 KB, and it is a genuinely small amount of code for a chart that looks published. The catch is requirement 1: Plot has no label layout, so end labels need de-collision you write yourself.

**If the chart has to work without you watching it: Apache ECharts.** 54 lines, and the only library in the set that treats direct labels as a real feature: `series.endLabel` puts a colour-matched label at the end of every line, and `labelLayout: { moveOverlap: "shiftY" }` pulls them apart when the data changes and two of them land on the same pixel. Everything else — `markArea`, `markLine`, `markPoint` — is first-class too. Where Plot needs you to notice a collision, ECharts survives data you haven't seen. That, plus SSR, dataZoom and progressive rendering, is why it is the pick for a dashboard rather than a story.

**If you need the annotation to be exact: Plotly.js.** The only library where the leader line, its arrowhead, its length and its attachment to the text are all handled for you: one `layout.annotations` entry pointed at a data coordinate with the text offset in pixels. `shapes` with `layer: "below"` cover the band and the reference line. It is 60 lines and the annotation model is the best-designed here — you just pay ~1.1 MB for it, and its idea of a default look is "analysis tool", so you will spend some of those lines undoing it.

**If the chart is a document: Vega-Lite.** The spec is still the strongest argument in this set — a chart you can lint, diff, store in a CMS and hand to someone who does not write JavaScript — and emphasis is more elegant here than anywhere else (three encoding scales over one line layer, rather than five copies of a mark). But an annotated chart is a stack of layers, each repeating the same scale domains, and it fought harder than anything except µPlot: layers do not share a scale unless every layer says so, and the axis is merged from the first layer that asks for one, so `axis: null` in the wrong place silently deletes both axes. It is also the only library that could not draw a real arrowhead; the leader's head is a triangle mark placed at the tip, which reads correctly but does not rotate.

**If you already have Chart.js: keep it, and add the plugin.** `chartjs-plugin-annotation` covers five of the six requirements cleanly, including a proper arrowhead. The sixth is a cliff: there is no end-of-line label in Chart.js or in the plugin, so 18 of its 80 lines are a hand-written canvas plugin calling `ctx.fillText` at scale pixels — text that cannot be inspected, selected or restyled afterwards. That is the honest shape of Chart.js: the friendliest config object of the seven right up to the point where an editorial chart begins, and then a canvas.

**If the point count is the whole problem: µPlot, and budget for it.** 104 lines, 2.3× Observable Plot, because µPlot has no annotation model at all — no band, no reference line, no label, no arrow, not even a text primitive. All of it is canvas code in two draw hooks, in device pixels, re-run on every redraw, with nothing left behind that you can hit-test or restyle. It also drew this chart in ~4 ms against ECharts' ~80, in 18 KB against ECharts' 330. Both of those facts are true and the second one is why you would still choose it — for a live-updating trace, not for a chart with things written on it.

**When the chart is the product: D3.** 78 lines, and every one of them visible: scales, axes, gridlines, band, reference line, leader, a three-point arrowhead path, six labels. That is 1.7× Observable Plot for the same picture, and it worked the first time, because nothing was negotiating with a default. The result is the sharpest of the seven at full size. It is also the only library where "draw the band behind the lines" required no thought at all — you append it first. Right answer for a bespoke, branded, one-of-a-kind chart; wrong answer for eight dashboard charts by Friday.

## What surprised us

- **Almost nobody lays out end-of-line labels.** ECharts is the only library of the seven that will place a label at the end of a line *and* keep it from colliding with the next one. Five of the others needed the same hand-written de-collision pass; Chart.js needed a bespoke canvas plugin to get a label there at all. This is requirement 1 of the most common editorial line chart there is, and six out of seven libraries treat it as your problem.
- **An arrowhead is a surprisingly good proxy for how seriously a library takes annotation.** Free and correct in Plotly and ECharts, free via the plugin in Chart.js, a first-class mark in Observable Plot, twelve characters of SVG path in D3, hand-drawn on canvas in µPlot — and simply unavailable in Vega-Lite, where the best honest answer is a triangle mark that does not rotate with the line it terminates.
- **Silent failures cost more than missing features.** The single longest bug in the build was µPlot's: `u.pxRatio` does not exist in 1.6.32, so every scaled value was `NaN`, and `NaN` in canvas does not throw — `moveTo` quietly draws nothing and an invalid `font` string quietly keeps the previous font. The chart came out with labels at the wrong size and no leader line, and no error anywhere. A missing feature is a decision; a silent `NaN` is an afternoon.
- **Compact to write is not the same as quick to get right.** Vega-Lite's hero spec is 66 lines — fewer than D3's 78 — and took nearly twice as long, all of it spent on two layering rules that produce a wrong chart rather than an error. D3, with no annotation API at all and the most code, was right the first time.
- **Render time is not a differentiator and never looked like one.** The identical chart: µPlot ~4 ms, D3 ~7 ms, Observable Plot ~20 ms, Chart.js ~50 ms, Plotly ~70 ms, Vega-Lite ~75 ms, ECharts ~80 ms. All of it is imperceptible at this size. What actually differs by two orders of magnitude is bundle size, from 18 KB to 1.1 MB — a load-time cost, not a paint-time one.
- **Gap handling is still not free.** From the second chart, kept from v1 because it produced the sharpest finding there: only Observable Plot breaks a line at a `null` with zero configuration. D3 needs `.defined()`, Chart.js `spanGaps: false`, Plotly `connectgaps: false`, ECharts `connectNulls: false`, µPlot `spanGaps: false`, and Vega-Lite bridges the gap even when the null rows are handed to it intact, because its default invalid-data handling filters them out of the path. Miss the flag and missing data silently becomes a straight line between two real points.
