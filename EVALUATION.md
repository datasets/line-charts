# Evaluation

The verdict from building 28 charts (7 libraries × 4 datasets) with identical
data and an identical palette. Method is in [ANALYSIS.md](./ANALYSIS.md); the
scorecard also lives on the [front page](./index.html). Scores are 1–5,
subjective, from doing the actual building — not from documentation or
reputation.

## Scorecard

| Library | Default look | API ergonomics | Custom ceiling | Interactivity (built-in) | Perf (4k pts) | Bundle | A11y / SSR | Docs / ecosystem |
|---|---|---|---|---|---|---|---|---|
| D3 | 5 | 2 | 5 | 2* | 5 | 4 | 4 | 5 |
| Observable Plot | 5 | 5 | 3 | 3 | 4 | 4 | 3 | 3 |
| Vega-Lite | 4 | 5 | 4 | 3 | 4 | 2 | 3 | 4 |
| Plotly.js | 3 | 4 | 3 | 5 | 4 | 1 | 3 | 4 |
| Chart.js | 3 | 4 | 3 | 4 | 3 | 5 | 3 | 5 |
| Apache ECharts | 4 | 3 | 4 | 5 | 5 | 3 | 5 | 4 |
| µPlot | 3 | 3 | 2 | 4 | 5 | 5 | 2 | 3 |

\* D3 interactivity is 2 *out of the box* because there is no box — the
crosshair tooltip on the D3 page is ~25 lines of hand-written code you'd write
once and reuse. Its ceiling is 5: nothing is off-limits, you just pay for it in
code.

## Recommendation

**Default choice: Observable Plot.** For a data story or a one-off analytical
chart, it produced the best-looking chart per line of code of anything tested.
The grammar (`Plot.lineY`, channels, `Plot.tip`) reads close to how you'd
describe the chart out loud, gap handling and axis formatting are sane
defaults, and at ~65 KB it's cheap to ship. The ceiling is lower than D3's —
this is the deliberate trade Plot makes — but for line/area/dot charts on
tabular data it rarely bites.

**When you need a published, diffable spec: Vega-Lite.** If charts are going to
live in a CMS, a notebook, or anywhere non-developers author or review them,
being able to say "the chart *is* this JSON" is worth the extra ~250 KB over
Plot. It was the highest-rated option in the original 2016 shortlist and still
holds up — the API ergonomics here are excellent (`energy` and `life` are each
under 15 lines), though anything beyond a tooltip (linked brushing, custom
interactions) gets verbose fast.

**When the chart needs to *do* things: Plotly.js or Apache ECharts.**
Plotly wins on interaction density with zero configuration — zoom, pan,
box-select, spike lines, PNG export, a log-scale toggle, all free, all four
charts. Pay for it in weight (~1.1 MB) and a more "analysis tool" than
"publication" default look. ECharts is the more production-grade sibling:
`dataZoom` (drag-slider + inside-scroll) took one array entry, SSR and
progressive rendering exist for genuinely huge series, and it's the only
library here that scored 5 on both interactivity *and* performance. Choose
Plotly for exploratory/scientific tooling, ECharts for a dashboard that has to
survive production traffic and non-trivial data volumes.

**When bundle size or a tight deadline dominates: Chart.js.** It is still the
right default for "a line chart, quickly, that a junior dev can maintain." The
API is the friendliest of the seven, docs and Stack Overflow coverage are
unmatched, and 70 KB with a huge plugin ecosystem (zoom, annotations,
financial charts) covers most real needs. It won't produce the most striking
chart on this page, but it will produce a correct one fastest.

**When the point count is the whole problem: µPlot.** At ~18 KB and rendering
~4,000 points with room to spare, µPlot is what you reach for once another
library's overhead becomes the bottleneck — a live-updating dashboard, a
100k-point sensor trace. Everything about it is spartan: no curve smoothing to
speak of, minimal styling hooks, plugins for anything beyond a line + cursor +
legend. Don't reach for it unless perf is actually the constraint.

**When nothing else will do: D3.** The quality ceiling and the pain are the
same fact. Every chart on the D3 page was built from scratch — scales, axes,
gridlines, a hand-rolled crosshair — and every pixel is legible in the source
panel because there's no library default hiding behind it. Right choice for a
bespoke, branded, one-of-a-kind visualization; wrong choice for "we need eight
line charts in a dashboard by Friday."

## What surprised us

- **Gap handling is not free almost anywhere.** Only Observable Plot breaks a
  line at a `null` y-value with zero configuration. Every other library needs
  an explicit flag (D3's `.defined()`, Chart.js's `spanGaps: false`, Plotly's
  `connectgaps: false`, ECharts's `connectNulls: false`, µPlot's
  `spanGaps: false`) — miss it and a real missing-data gap silently becomes a
  straight line bridging two known points, which is a genuinely misleading
  default to ship.
- **Categorical legends, not end-of-line labels, for 5+ series.** End labels
  looked elegant in early drafts but collided whenever two series converged
  (life expectancy: US and China both land near 78 years by 2022) — a legend
  is the only version that doesn't quietly break depending on what the data
  does that year.
- **"Batteries included" and "small" are opposites here**, almost exactly in
  proportion: Plotly (1.1 MB) and ECharts (330 KB) do the most for free; µPlot
  (18 KB) and Chart.js (70 KB) do the least. There is no library in this set
  that is both small and fully-loaded — that trade-off looks structural, not
  a gap someone forgot to fill.
- **Bundle size dwarfs render time at these scales.** Every library here draws
  ~4,000 points in under 30 ms; the real cost difference between a 18 KB and a
  1.1 MB library is entirely load time, not paint time, until you're well past
  what's tested here.
