# Done for you: how much each library did itself

The "Done for you" column on the front page counts how many of 11 requirements each library met itself, as an option or a mark, rather than with code we wrote. The requirements are the ones in the three tests (see [Method](../../ANALYSIS.md)); the calls come from the scorecards in the [verdict](../../EVALUATION.md), and the source under each chart is the evidence.

- **1**: native. An option, a mark or a built-in. A plugin the library's maintainers publish counts (Chart.js annotation and zoom).
- **½**: partly. Native, but it needed a handler, hook or formatter to meet the requirement.
- **0**: by hand or not met. Event code, pixel maths, canvas calls, or a workaround.

The missing-data side test is left out: all seven behave the same.

| Requirement | ECharts | Plot | D3 | Plotly | µPlot | Chart.js | Vega-Lite |
|---|---|---|---|---|---|---|---|
| Oil: end labels, de-collided | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Oil: callouts with leaders | 1 | 1 | 0 | 1 | 0 | 1 | 1 |
| Oil: bands and zero rule | 1 | 1 | 0 | 1 | 0 | 1 | 1 |
| Oil: exact ticks | 1 | 1 | 1 | 1 | 1 | ½ (hook) | 1 |
| Grid: all 1.25M points, true extremes kept | 1 | 0 (daily step) | 0 (strokes every point by hand) | 1 | 1 | 1 | 0 (daily step) |
| Grid: zoom, pan, reset, one-week floor | 1 | 0 | 0 | ½ (floor by hand) | ½ (hooks) | 1 | ½ (no floor, no touch) |
| Grid: crosshair tooltip, four series | ½ (formatter) | 1 | 0 | 1 | ½ (tooltip by hand) | ½ (crosshair by hand) | 1 |
| npm: end labels | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| npm: whole-line hover | ½ (nearest line by hand) | 0 | 0 | 0 | 1 | 0 | 1 |
| npm: indexed view | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| npm: small multiples | 1 | 1 | 0 | 1 | 0 | 0 | 1 |
| **Total, of 11** | **9** | **6** | **1** | **6½** | **4** | **5** | **7½** |

The count is not the ranking. It leaves out how a library behaves at scale (Vega-Lite scores well here and took 0.9 s per zoom step at hourly data), what the result looks like, and bundle size. The ranking weighs all of those; see the verdict.
