# Render timings, 2026-11-21

Machine: Mac16,12 Apple M4, 10 cores, 16 GB RAM, macOS 15.6 (Darwin 24.6.0).
Browser: Google Chrome 158.0.8127.36 (headed); WebGL: ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version).
Viewport 900×700, DPR 2. 7 runs per cell: run 1 cold, median/min/max over the other 6.

Note: Run shortly before the DPR 1 record, with lighter background load; no other measurement or build from this session was running.

Each value is the demo page's own badge: render call → returned promise → two animation frames, data loading excluded. Produced by [`scripts/measure/timings.mjs`](../../scripts/measure/timings.mjs); raw samples in the matching `.json`.

## Warm median (ms)

| Library | hero | grid | npm | life |
|---|--:|--:|--:|--:|
| d3 | 14 | 50 | 26 | 27 |
| observable-plot | 32 | 323 | 71 | 25 |
| vega-lite | 48 | 164 | 215 | 30 |
| plotly | 40 | 531 | 34 | 30 |
| chartjs | 26 | 67 | 52 | 25 |
| echarts | 41 | 78 | 38 | 29 |
| uplot | 13 | 18 | 22 | 24 |

## Every cell

| Library | Chart | Cold | Median | Min | Max | Chart width | Points reported |
|---|---|--:|--:|--:|--:|--:|---|
| d3 | hero | 14 | 14 | 9.0 | 17 | 880px | 20,203 points · step: full |
| d3 | grid | 51 | 50 | 50 | 51 | 880px | 1,251,264 points · step: full · solar peak drawn 16,289 MW of 16,289 MW |
| d3 | npm | 29 | 26 | 20 | 29 | 880px | 11,268 points · step: full |
| d3 | life | 31 | 27 | 23 | 31 | 880px |  |
| observable-plot | hero | 33 | 32 | 32 | 34 | 880px | 20,203 points · step: full |
| observable-plot | grid | 315 | 323 | 319 | 325 | 880px | 78,204 points · step: day: mean + low–high band · solar peak drawn 16,289 MW of 16,289 MW |
| observable-plot | npm | 70 | 71 | 70 | 72 | 880px | 11,268 points · step: full |
| observable-plot | life | 33 | 25 | 16 | 33 | 880px |  |
| vega-lite | hero | 48 | 48 | 48 | 49 | 880px | 20,203 points · step: full |
| vega-lite | grid | 163 | 164 | 163 | 167 | 880px | 78,204 points · step: day: mean + low–high band · solar peak drawn 16,289 MW of 16,289 MW |
| vega-lite | npm | 215 | 215 | 213 | 221 | 880px | 11,268 points · step: full |
| vega-lite | life | 29 | 30 | 28 | 32 | 823px |  |
| plotly | hero | 41 | 40 | 39 | 41 | 880px | 20,203 points · step: full |
| plotly | grid | 538 | 531 | 530 | 533 | 880px | 1,251,264 points · step: full · solar peak drawn 16,289 MW of 16,289 MW |
| plotly | npm | 35 | 34 | 34 | 35 | 880px | 11,268 points · step: full |
| plotly | life | 31 | 30 | 27 | 32 | 880px |  |
| chartjs | hero | 26 | 26 | 25 | 26 | 880px | 20,203 points · step: full |
| chartjs | grid | 68 | 67 | 66 | 67 | 880px | 1,251,264 points · step: full+min-max · solar peak drawn 16,289 MW of 16,289 MW |
| chartjs | npm | 52 | 52 | 51 | 52 | 880px | 11,268 points · step: full |
| chartjs | life | 31 | 25 | 25 | 27 | 880px |  |
| echarts | hero | 41 | 41 | 41 | 41 | 880px | 20,203 points · step: full |
| echarts | grid | 79 | 78 | 77 | 79 | 880px | 1,251,264 points · step: full+minmax · solar peak drawn 16,289 MW of 16,289 MW |
| echarts | npm | 39 | 38 | 37 | 41 | 880px | 11,268 points · step: full |
| echarts | life | 25 | 29 | 24 | 33 | 880px |  |
| uplot | hero | 11 | 13 | 9.4 | 20 | 880px | 20,203 points · step: full |
| uplot | grid | 18 | 18 | 18 | 19 | 880px | 1,251,264 points · step: full · solar peak drawn 16,289 MW of 16,289 MW |
| uplot | npm | 29 | 22 | 20 | 23 | 880px | 11,268 points · step: full |
| uplot | life | 24 | 24 | 22 | 31 | 880px |  |
