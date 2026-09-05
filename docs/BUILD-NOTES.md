# Build notes — the hero chart, seven times

A log kept while building the annotated hero chart in each library, in the order the work happened. It is the primary evidence behind ANALYSIS.md and EVALUATION.md, so it records what actually went wrong, not a tidied-up version.

## What every library had to produce

The same six things, from the same data (`assets/data/energy-mix.csv`, 5 series × 27 years) and the same geometry constants (`HERO` in `assets/js/data.js`):

1. Direct end-of-line labels, colour-matched, no legend.
2. An annotation with a leader line pointing at the 2011 coal/gas crossover, reading "gas overtakes coal".
3. A shaded 2008–2009 band, labelled "financial crisis", behind the lines.
4. Wind and solar at full colour and weight; coal, gas and nuclear muted to one grey and told apart by their labels.
5. A dashed, labelled reference line at 100 TWh.
6. No label collisions or overflow as the chart narrows.

## Method for the line counts

The number is the `hero()` render function exactly as the site displays it (`Function.prototype.toString()`), so it includes its comments and its signature line. The "code" column drops blank and comment-only lines. Neither number includes:

- `spreadLabels()` in `assets/js/page.js` — 17 lines of shared, library-agnostic label de-collision, used by five of the seven. It is shared because otherwise five libraries would each carry the same twelve lines and the counts would say less, not more. ECharts does not need it (`labelLayout: { moveOverlap: "shiftY" }`); Vega-Lite uses it because it has no label layout either.
- The `HERO` constants, which are shared data, not chart code.
- The chart's title and standfirst, which are card HTML for all seven equally — no library was asked to lay out running text.

| Library | Lines | Code only | Plugin or escape hatch | Rough build time |
|---|---|---|---|---|
| Observable Plot | 46 | 44 | none | ~20 min, first try |
| Apache ECharts | 54 | 53 | none | ~25 min |
| Plotly.js | 60 | 56 | none | ~35 min |
| Vega-Lite | 66 | 57 | no arrowhead primitive — faked with a triangle mark | ~55 min |
| D3 | 78 | 66 | n/a — it is all escape hatch | ~30 min, first try |
| Chart.js | 80 | 78 | chartjs-plugin-annotation (~30 KB) **and** a hand-written canvas plugin | ~40 min |
| µPlot | 104 | 94 | two canvas draw hooks; no annotation model exists | ~70 min |

Build times are rough wall-clock, including debugging, and they track the count only loosely — Vega-Lite is the clearest case of a library that is compact to write and slow to get right.

## Per library

### Observable Plot — 46 lines, nothing needed

The cheapest and the least argumentative. Every piece of furniture is an ordinary mark: `Plot.rect` for the band, `Plot.ruleY` for the reference line, `Plot.text` for each label, and — the pleasant surprise of the exercise — `Plot.arrow`, a real arrow mark with a head, so the leader line is one line of code. Mark order is z-order, so "behind the lines" is simply "listed first". Rendered correctly the first time.

What it cost: no label layout of any kind, so the end labels go through `spreadLabels()`. Per-series emphasis also means writing a small `line(s)` closure and mapping it over the series rather than one `lineY` over the long-format data — Plot's stroke channel wants a scale, and what this chart needs is two series at full weight and three deliberately identical.

### Apache ECharts — 54 lines, nothing needed

The most complete annotation vocabulary here, and the only library that solved requirement 1 *and* requirement 6 for free: `series.endLabel` puts a colour-matched label at the end of each line, and `labelLayout: { moveOverlap: "shiftY" }` pushes them apart when they collide. `markArea` is the band, `markLine` is both the reference line and the leader (a two-coordinate entry whose far end takes `symbol: "arrow"`), `markPoint` is the annotation text.

Two snags, both a few minutes each:

- A `markLine` data entry inherits `markLine`'s default *dashed* stroke, so the leader came out dashed like the reference line until it was given `type: "solid"` explicitly.
- `markPoint` with `symbol: "none"` draws nothing at all — including its label. A zero-size circle is the workaround for a text-only annotation.

### Plotly.js — 60 lines, nothing needed

The cleanest annotation story after ECharts, and the only library where the arrowhead is genuinely free: one `layout.annotations` entry with `showarrow: true`, positioned at the point it names, with the text offset in pixels — Plotly draws the leader, sizes the head and attaches it to the text box. Band and reference line are `layout.shapes` with `layer: "below"`.

What it cost:

- `responsive: true` silently overrides `layout.height` with the container's height, which cropped the x-axis labels. Sizing the hero explicitly and turning responsive off is the fix (the pages re-render on resize anyway).
- Annotations are positioned in data units, so the 13-pixel minimum gap between end labels has to be converted into TWh through the y range and the plot height before `spreadLabels()` can use it. Every library that annotates in data space has this problem; Plotly is just the first place it showed up.

### Vega-Lite — 66 lines, and the most fighting per feature

Compact to write, slow to get right. Two layering rules cost most of the hour, and neither is obvious from the spec:

1. **Layers do not share a scale unless every layer repeats the domain.** Quantitative scales default to `zero: true` and layer domains are unioned, so the first attempt — with the domain only on the line layer — produced an x axis running 0 to 2023 and a stack of five y axes on top of each other. Every layer now spells out both domains, which is what the `x()`/`y()` helpers in the spec are for.
2. **The axis is merged from the first layer that asks for one.** Setting `axis: null` on the furniture layers to avoid duplicate axes wiped the axes out completely. The axis configuration ends up riding on the band layer, because the band has to be drawn first anyway.

The one thing no library could do honestly: **Vega-Lite has no arrowhead primitive.** A `rule` mark gives the leader line, and the head is a `point` mark with `shape: "triangle-down"` placed at the tip. It reads correctly at every size tested, but it is a stand-in, not an arrow — the triangle does not rotate with the line, so a leader at any other angle would need the angle computed and passed in.

In its favour: emphasis is the most elegant here. Three encoding scales (`color`, `size`, `opacity`) over one line layer express "two of these five series matter" without duplicating the mark.

### D3 — 78 lines, no surprises in either direction

There is no annotation API because there is no API; the band is a `rect`, the leader is a `line`, the arrowhead is a three-point `path`, the labels are `text`. That is 1.7× Observable Plot's line count for the same picture, and it worked the first time, because nothing was negotiating with a default. It is also the best-looking of the seven at full size — the type sits where it was put and the arrowhead is the right weight.

Worth noting for the comparison: D3 is the only library where "put the band behind everything" required no thought whatsoever. Append it first. Every other library has some notion of layer, draw time, or mark order that has to be looked up.

The hero function is deliberately standalone — it does not use the module's shared `mkFrame()` helper — so the 78 lines are the whole truth, including the axes and gridlines that the other six libraries get for free. That is roughly 20 of the 78.

### Chart.js — 80 lines, one plugin plus hand-written canvas

`chartjs-plugin-annotation` (~30 KB on top of Chart.js's 70) covers five of the six requirements cleanly: `box` for the band, `line` for the reference line, `line` with `arrowHeads.start` for the leader — the only plugin here that draws a proper arrowhead — and `label` for the text.

The sixth is where it runs out. **Chart.js has no end-of-line label, and neither does the annotation plugin.** Doing it properly means a bespoke inline plugin with an `afterDatasetsDraw` hook, `ctx.fillText`, and pixel positions from `chart.scales.y.getPixelForValue` — about 18 of the 80 lines, and canvas output that cannot be inspected or restyled afterwards. Notably, an annotation-plugin `label` per series would have been ~5 lines, but they would overlap: solar (54.3 TWh) and coal (42.9 TWh) are 11 TWh apart, which is under 17 px on a narrow card, and the plugin has no de-collision.

Also cost time: with `responsive: true` and `maintainAspectRatio: false` the canvas fills its parent, so the *parent* must carry the height. Setting `maxHeight` on the canvas instead silently squashes the plot into the top of an over-tall card.

### µPlot — 104 lines, all of it by hand

µPlot has no annotation model at all: no band, no reference line, no label, no arrow, no text primitive. Everything editorial is canvas code inside two hooks — `drawClear` (before the series) for the band, `draw` (after) for the leader, the arrowhead and all six labels. It is the only library here where the annotated chart is mostly not a chart-library problem.

Three things cost real time:

1. **Hooks work in device pixels and 1.6.32 has no `u.pxRatio`.** So `13 * u.pxRatio` is `NaN`, and the failure is nearly silent: `moveTo`/`lineTo` with a `NaN` coordinate draw nothing, `ctx.font = "NaN px system-ui"` is invalid so the canvas keeps whatever font it last had, and the result is a chart where the labels render (at the wrong size, from the axis font) and the leader line and arrowhead simply are not there. This was the longest-lived bug in the whole exercise. The ratio comes from `u.ctx.canvas.width / u.width` instead.
2. **Z-order is two coarse slots, and "behind the series" also means behind the gridlines.** The dashed 100 TWh reference line, drawn in `drawClear` as it should be, vanished underneath the gridline that the y axis draws at exactly 100. It had to move into the `draw` hook, on top of the data. That is the one place where this chart's z-order is not what it should be, in any of the seven.
3. **Nothing is an object afterwards.** No hit-testing, no restyling, no "move that label 4px"; the whole annotation layer re-runs on every redraw, including every resize.

In exchange it is the fastest by a wide margin — ~4 ms against Observable Plot's ~20 and ECharts' ~80 for the identical chart — and the smallest at 18 KB. It also has `uPlot.paths.spline()` built in, which was better than expected.

## Cross-cutting

- **Nobody lays out end-of-line labels except ECharts.** Five of seven needed the shared `spreadLabels()`; D3, Chart.js and µPlot in pixels, Plotly, Plot and Vega-Lite in data units. This is the single most consistent gap in the set, and it is requirement 1 of an editorial line chart.
- **Arrowheads are a good proxy for how seriously a library takes annotation.** Free and correct in Plotly and ECharts, free via the annotation plugin in Chart.js, a first-class mark in Observable Plot, hand-drawn in D3 and µPlot, and not available at all in Vega-Lite.
- **Every library placed the annotation text in data coordinates**, which is the right call at desktop width and starts to bite below about 400 px, where the text spans more years and can graze the coal line. The end labels de-collide correctly at every width tested (down to 320 px); the annotation text is the one piece of furniture that is width-sensitive, and it is width-sensitive identically in all seven.
- **Render time was not the differentiator and never looked like being one.** 27 points × 5 series: µPlot ~4 ms, D3 ~7 ms, Observable Plot ~20 ms, Chart.js ~50 ms, Plotly ~70 ms, Vega-Lite ~75 ms, ECharts ~80 ms. All of it is imperceptible; the spread is startup cost, not drawing.
