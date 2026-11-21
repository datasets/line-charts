/* Shared data and specs for every demo.
 *
 * Four charts, keyed as the pages key them:
 *   hero  "Forty years of oil"       Brent + WTI daily spot (EIA)       ~20k points
 *   grid  "The grid, every half hour" GB generation mix (NESO)          1.25M points
 *   npm   "Who actually installs these?" weekly npm downloads, 22 libs  11,268 non-null points
 *   life  missing-data side test      life expectancy, 5 countries
 *
 * Each chart has a loader (lazy, cached: the 5.5 MB grid file is only fetched
 * when a grid card is shown), a spec constant (HERO, GRID, NPM) holding every
 * dataset-specific number, colour and annotation, and an entry in DATASETS
 * (title, description, requirements) that the pages read. Every number in an
 * annotation was checked against the CSVs in assets/data/ (see its README).
 * Method for builders: docs/TESTS.md. */

const asURL = (f) => new URL(`../data/${f}`, import.meta.url);

async function text(file) {
  const res = await fetch(asURL(file));
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.text();
}

/* Minimal CSV for the small files (no quoted commas in any of them). */
async function csv(file) {
  const [head, ...lines] = (await text(file)).trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(",");
    const row = {};
    cols.forEach((c, i) => (row[c] = cells[i] ?? ""));
    return row;
  });
}

const num = (v) => {
  const n = +v;
  return v === "" || v == null || Number.isNaN(n) ? null : n;
};
const utc = (iso) => new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);

/* A colour in a spec is either a palette slot (0-based number) or a theme
 * token name ("muted", "textSecondary"…). ink() resolves it for a theme. */
export const ink = (theme, c) => (typeof c === "number" ? theme.palette[c] : theme[c]);

/* ================================================================ *
 * Lazy, cached loading                                             *
 * ================================================================ */

export const LOADERS = { hero: loadOil, grid: loadGrid, npm: loadNpm, life: loadLife };
const _cache = {};

/** Load (once) the data for one chart key. */
export function loadFor(key) {
  if (!LOADERS[key]) return Promise.reject(new Error(`no dataset "${key}"`));
  return (_cache[key] ??= LOADERS[key]());
}

/* ================================================================ *
 * hero: oil                                                        *
 * ================================================================ */

/* Returns
 *   rows    [{ date: Date, series: "brent"|"wti", price }]   long, ~20k rows
 *   cols    { brent: { t: Float64Array (epoch ms), y: Float64Array }, wti: … }
 *           each series on its own dates (they trade on different holidays)
 *   aligned { t: Float64Array (union of both date sets), brent: (number|null)[], wti: … }
 *           for libraries that need one shared x array. A null here is a
 *           market holiday, NOT missing data: bridge it (spanGaps /
 *           connectNulls), unlike the life test where a null must break. */
export async function loadOil() {
  const files = await Promise.all(HERO.series.map((s) => csv(s.file)));
  const rows = [], cols = {};
  HERO.series.forEach((s, i) => {
    const r = files[i];
    const t = new Float64Array(r.length), y = new Float64Array(r.length);
    r.forEach((d, j) => {
      t[j] = utc(d.date).getTime();
      y[j] = +d.price;
      rows.push({ date: new Date(t[j]), series: s.key, price: y[j] });
    });
    cols[s.key] = { t, y };
  });
  const union = [...new Set(HERO.series.flatMap((s) => [...cols[s.key].t]))].sort((a, b) => a - b);
  const aligned = { t: Float64Array.from(union) };
  for (const s of HERO.series) {
    const at = new Map([...cols[s.key].t].map((t, j) => [t, cols[s.key].y[j]]));
    aligned[s.key] = union.map((t) => (at.has(t) ? at.get(t) : null));
  }
  return { keys: HERO.series.map((s) => s.key), rows, cols, aligned };
}

/* ================================================================ *
 * grid: GB generation, half-hourly                                 *
 * ================================================================ */

/* The file has no time column: row i is GRID.start + i × 30 min (UTC; the
 * series is perfectly regular). Parsed straight from the text into typed
 * arrays — no per-row objects — so 312,816 rows take tens of ms.
 *
 * Returns a "grid" object, the same shape at every decimation step:
 *   { step: "full"|"hour"|"day", n, t: Float64Array (epoch ms, bucket start),
 *     keys: ["coal","gas","wind","solar"], coal: Float64Array (MW), gas, wind, solar,
 *     min: { coal, … }, max: { coal, … } }   // per-bucket extremes; at "full" min = max = value
 * µPlot wants x in seconds unless you set `ms: 1`; t here is milliseconds. */
export async function loadGrid() {
  const src = await text(GRID.file);
  const headEnd = src.indexOf("\n");
  const keys = src.slice(0, headEnd).trim().split(",");
  let n = 0;
  for (let i = headEnd + 1; i < src.length; i++) if (src.charCodeAt(i) === 10) n++;
  if (src.charCodeAt(src.length - 1) !== 10) n++;
  const cols = keys.map(() => new Float64Array(n));
  let row = 0, col = 0, v = 0, any = false;
  for (let i = headEnd + 1; i <= src.length; i++) {
    const c = i < src.length ? src.charCodeAt(i) : 10;
    if (c >= 48 && c <= 57) { v = v * 10 + (c - 48); any = true; }
    else if (c === 44) { cols[col][row] = any ? v : NaN; v = 0; any = false; col++; }
    else if (c === 10) {
      if (col > 0 || any) { cols[col][row] = any ? v : NaN; row++; }   // skip blank lines
      v = 0; any = false; col = 0;
      if (row === n) break;
    }
    // \r and anything else: ignored
  }
  if (row < n) { n = row; cols.forEach((a, j) => (cols[j] = a.subarray(0, n))); }
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = GRID.start + i * GRID.stepMs;
  const g = { step: "full", n, t, keys, min: {}, max: {} };
  keys.forEach((k, j) => { g[k] = cols[j]; g.min[k] = cols[j]; g.max[k] = cols[j]; });
  return g;
}

/* The decimation ladder, identical for every library: "full" (1.25M points)
 * → "hour" (mean of 2 half-hours, 625k) → "day" (mean of 48, 26k). Means,
 * because MW averaged over a bucket is the honest energy figure; min/max per
 * bucket are there for a library that wants to draw the envelope too.
 * Cached per (grid, step). */
const _agg = new WeakMap();
export function aggregate(grid, step) {
  if (step === "full" || step === grid.step) return grid;
  const size = { hour: 2, day: 48 }[step];
  if (!size || grid.step !== "full") throw new Error(`aggregate: cannot go from ${grid.step} to ${step}`);
  const memo = _agg.get(grid) || {};
  if (memo[step]) return memo[step];
  const n = Math.ceil(grid.n / size);
  const out = { step, n, t: new Float64Array(n), keys: grid.keys, min: {}, max: {} };
  for (let b = 0; b < n; b++) out.t[b] = grid.t[b * size];
  for (const k of grid.keys) {
    const src = grid[k], mean = new Float64Array(n), lo = new Float64Array(n), hi = new Float64Array(n);
    for (let b = 0; b < n; b++) {
      let s = 0, c = 0, mn = Infinity, mx = -Infinity;
      for (let i = b * size, e = Math.min(i + size, grid.n); i < e; i++) {
        const v = src[i];
        if (v === v) { s += v; c++; if (v < mn) mn = v; if (v > mx) mx = v; }
      }
      mean[b] = c ? s / c : NaN; lo[b] = c ? mn : NaN; hi[b] = c ? mx : NaN;
    }
    out[k] = mean; out.min[k] = lo; out.max[k] = hi;
  }
  memo[step] = out;
  _agg.set(grid, memo);
  return out;
}

/* The full-resolution half-hours inside [fromMs, toMs): the same grid shape,
 * for a library that cannot draw 1.25M points but is asked to open on a
 * window (ctx.range). Two weeks is 672 half-hours × 4 series. */
export function between(grid, [from, to]) {
  const a = Math.max(0, Math.ceil((from - grid.t[0]) / GRID.stepMs));
  const b = Math.min(grid.n, Math.ceil((to - grid.t[0]) / GRID.stepMs));
  const out = { step: "full", n: b - a, t: grid.t.subarray(a, b), keys: grid.keys, min: {}, max: {} };
  for (const k of grid.keys) out[k] = out.min[k] = out.max[k] = grid[k].subarray(a, b);
  return out;
}

/* Row objects, for libraries that only take arrays of objects:
 *   "long"  [{ date: Date, series, mw }]          4 × n rows
 *   "wide"  [{ date: Date, coal, gas, wind, solar }]   n rows
 * At "full" that is 1.25M objects — usually the reason to step down. */
export function toRows(grid, shape = "long") {
  const out = [];
  for (let i = 0; i < grid.n; i++) {
    const date = new Date(grid.t[i]);
    if (shape === "wide") {
      const o = { date };
      for (const k of grid.keys) o[k] = grid[k][i];
      out.push(o);
    } else for (const k of grid.keys) out.push({ date, series: k, mw: grid[k][i] });
  }
  return out;
}

/* ================================================================ *
 * npm: weekly downloads                                            *
 * ================================================================ */

/* Returns
 *   keys   all 22 package names, file order (the seven first)
 *   weeks  Date[] (Monday starts, UTC)        t  Float64Array epoch ms
 *   cols   { pkg: (number|null)[] }           null = no downloads that week
 *          (before first publish, plus four zero weeks in 2015): a log
 *          scale cannot show 0, so it is missing, and the line breaks
 *   rows   [{ week: Date, package, downloads|null }]   long, every week × package */
export async function loadNpm() {
  const raw = await csv(NPM.file);
  const keys = Object.keys(raw[0]).slice(1);
  const weeks = raw.map((r) => utc(r.week));
  const t = Float64Array.from(weeks, (d) => d.getTime());
  const cols = {};
  keys.forEach((k) => (cols[k] = raw.map((r) => num(r[k]))));
  const rows = keys.flatMap((k) => weeks.map((w, i) => ({ week: w, package: k, downloads: cols[k][i] })));
  return { keys, weeks, t, cols, rows };
}

/* ================================================================ *
 * life: the missing-data side test (World Bank)                    *
 * ================================================================ */

export async function loadLife() {
  const rows = await csv("life-expectancy.csv");
  const data = rows.map((r) => ({
    year: +r.year,
    country: r.country,
    value: num(r.life_expectancy),
  }));
  const countries = [...new Set(data.map((d) => d.country))];
  // The gap test: a missing year becomes an explicit null in BOTH shapes, so
  // every library is handed the same nulls. (A row that is simply absent is
  // not a gap to any of them; they all draw straight across it.)
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
  const byKey = new Map(data.map((d) => [d.country + ":" + d.year, d.value]));
  const at = (c, y) => (byKey.has(c + ":" + y) ? byKey.get(c + ":" + y) : null);
  const wide = years.map((y) => {
    const o = { year: y };
    countries.forEach((c) => (o[c] = at(c, y)));
    return o;
  });
  const long = countries.flatMap((c) => years.map((y) => ({ year: y, country: c, value: at(c, y) })));
  return { countries, years, long, wide };
}

/* ================================================================ *
 * Specs                                                            *
 * ================================================================ */

const usd = (v) => (v < 0 ? "−$" : "$") + Math.abs(v);

/* hero: Forty years of oil. Dates are ISO strings (UTC); positions are in
 * data units, so a library places them through its own scales. */
export const HERO = {
  series: [   // drawn in this order: WTI underneath, Brent on top
    { key: "wti", label: "WTI", file: "oil-wti-daily.csv", color: "muted", width: 1.25 },
    { key: "brent", label: "Brent", file: "oil-brent-daily.csv", color: 0, width: 2 },
  ],
  unit: "US$ per barrel",
  x: {
    domain: ["1986-01-01", "2026-09-01"],         // data end; end labels sit here
    ticks: ["1990-01-01", "2000-01-01", "2010-01-01", "2020-01-01"],   // decades
    format: (d) => String(new Date(d).getUTCFullYear()),
  },
  y: {
    domain: [-50, 180],                           // must include −36.98
    ticks: [-40, 0, 40, 80, 120, 160],
    format: usd,                                  // "−$40" … "$160"
  },
  zero: { y: 0 },                                 // drawn in baseline ink, solid, over the grid
  /* NBER US recessions in range, peak month to trough month inclusive
   * (https://www.nber.org/research/data/us-business-cycle-expansions-and-contractions).
   * Behind the lines; one label for all four, on the band named by bandLabel. */
  bands: [
    { from: "1990-07-01", to: "1991-03-31" },
    { from: "2001-03-01", to: "2001-11-30" },
    { from: "2007-12-01", to: "2009-06-30" },
    { from: "2020-02-01", to: "2020-04-30" },
  ],
  bandLabel: { band: 0, text: "US recessions", y: -43 },   // starts at band 0's left edge, near the floor
  /* Callouts. `date`/`value` is the true data point (dot drawn there);
   * `at` is where the text is anchored, with `anchor` (start|middle|end) and
   * `valign` (bottom = text sits above `at`, top = below, middle = centred);
   * the leader runs from the point to `at`. `lines` is the text, one entry
   * per line. `rank` is the drop order: show callouts with rank ≤
   * calloutBudget(width). Every value is from the CSVs. */
  callouts: [
    { id: "negative", rank: 1, series: "wti", date: "2020-04-20", value: -36.98,
      at: ["2019-03-01", -36.98], anchor: "end", valign: "middle",
      lines: ["WTI −$36.98", "20 Apr 2020"] },
    { id: "peak", rank: 2, series: "brent", date: "2008-07-03", value: 143.95,
      at: ["2007-06-01", 155], anchor: "end", valign: "bottom",
      lines: ["All-time high", "$143.95, Jul 2008"] },
    { id: "ukraine", rank: 3, series: "brent", date: "2022-03-08", value: 133.18,
      at: ["2022-03-08", 155], anchor: "middle", valign: "bottom",
      lines: ["Russia invades Ukraine", "$133"] },
    { id: "opec", rank: 4, series: "brent", date: "2014-06-19", value: 115.19,
      at: ["2014-06-19", 140], anchor: "middle", valign: "bottom",
      lines: ["OPEC price war", "$115 → $26"] },
    { id: "kuwait", rank: 5, series: "brent", date: "1990-09-27", value: 41.45,
      at: ["1990-09-27", 70], anchor: "middle", valign: "bottom",
      lines: ["Iraq invades Kuwait", "$41"] },
  ],
  /* how many callouts fit at a given plot width (px of the whole chart) */
  calloutBudget: (width) => (width >= 620 ? 5 : width >= 440 ? 3 : 2),
  /* direct end labels at x.domain[1]; de-collide with spreadLabels() */
  endLabel: (s, value) => `${s.label} $${Math.round(value)}`,   // "Brent $96", "WTI $91"
  height: (width) => Math.max(280, Math.min(400, Math.round(width * 0.55))),
};

/* grid: GB generation mix, half-hourly. Colours: wind and gas take palette
 * slots, solar yellow, coal neutral dark ink (it is the story, not a brand). */
export const GRID = {
  file: "gb-grid-halfhourly.csv",
  start: Date.UTC(2009, 0, 1),         // row 0 = 2009-01-01T00:00Z
  stepMs: 30 * 60 * 1000,              // 312,816 rows → 2026-11-04T23:30Z
  series: [   // draw order: last on top
    { key: "gas", label: "Gas", color: 1 },
    { key: "coal", label: "Coal", color: "textSecondary" },
    { key: "wind", label: "Wind", color: 0 },
    { key: "solar", label: "Solar", color: 3 },
  ],
  unit: "MW",
  y: { domain: [0, 30000], ticks: [0, 10000, 20000, 30000], format: (v) => `${v / 1000} GW` },
  ladder: ["full", "hour", "day"],     // try in this order; report which one you drew
  /* zoom: start fully zoomed out; never narrower than one week */
  zoom: { initial: "all", minSpanMs: 7 * 24 * 3600 * 1000 },
  events: [
    /* a vertical rule + label: Ratcliffe-on-Soar, Britain's last coal plant,
     * closed at midnight (BST) ending 30 Sep 2024 (Uniper; see the data README).
     * Its last half-hour of real output in this file is 26 MW at 14:30 UTC that
     * day. The file still has 24 later non-zero coal half-hours (max 198 MW on
     * 2024-11-20, last 9 MW on 2026-09-23 16:00 UTC), left as NESO published them. */
    { id: "last-coal", kind: "rule", date: "2024-09-30T23:00:00Z", label: "Last coal plant, Sep 2024" },
    /* a text label (no rule), text-anchor start at the start of 2012: coal's
     * share of NESO's GENERATION in calendar 2012 = 42.4% (gas 25.7%), its
     * highest year in 2009–2026; reproducible from gb-grid-annual.csv */
    { id: "coal-2012", kind: "text", date: "2012-01-01T00:00:00Z", y: 28500, label: "2012: coal 42%" },
  ],
  /* for the decimation-honesty check: the true maxima in the file */
  peaks: {
    solar: { date: "2026-04-23T12:00:00Z", mw: 16289 },
    wind: { date: "2026-03-25T13:30:00Z", mw: 23880 },   // transmission + embedded
    coal: { date: "2009-02-02T17:00:00Z", mw: 26044 },
    gas: { date: "2024-12-12T08:00:00Z", mw: 27868 },
  },
  height: (width) => Math.max(260, Math.min(380, Math.round(width * 0.5))),
};

/* npm: weekly downloads (Monday-start weeks, summed) of 22 charting packages. */
const SI = (v) => (v >= 1e6 ? `${+(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `${v}`);
export const NPM = {
  file: "npm-chart-libs-weekly.csv",
  /* the seven get palette slots 0–6 and a direct end label; the other 15 are
   * grey context. `label` is what the end label and tooltip say. */
  seven: [
    { key: "d3", label: "D3", color: 0 },
    { key: "@observablehq/plot", label: "Plot", color: 1 },
    { key: "vega-lite", label: "Vega-Lite", color: 2 },
    { key: "plotly.js", label: "Plotly", color: 3 },
    { key: "chart.js", label: "Chart.js", color: 4 },
    { key: "echarts", label: "ECharts", color: 5 },
    { key: "uplot", label: "µPlot", color: 6 },
  ],
  others: { color: "muted", opacity: 0.45, width: 1 },
  /* grey, but end-labelled in muted ink: it is the headline */
  alsoLabel: ["recharts"],
  y: {
    type: "log",
    domain: [100, 1e8],                  // clip below 100 (first weeks of new packages)
    ticks: [1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
    format: SI,                          // 1k 10k 100k 1M 10M 100M
  },
  /* the "indexed" view: weeks from `date` on, each series ÷ its value that
   * week × 100 (mid-January, clear of the Christmas dip; all 22 exist) */
  index: {
    date: "2024-01-15",
    label: "Weekly downloads, indexed: week of 15 Jan 2024 = 100",
    domain: [30, 10000],                 // true range 40.6 (plotly.js) … 7,079 (Plot)
    ticks: [100, 1000, 10000],
    format: (v) => Math.round(v).toLocaleString("en"),
    endLabel: (s, value) => `${s.label} ${Math.round(value).toLocaleString("en")}`,   // "Plot 6,090"
  },
  /* small multiples of the seven, shared log y */
  multiples: { columns: (width) => (width >= 640 ? 4 : 2), height: 120 },
  endLabel: (s, value) => `${s.label} ${SI(value)}`,   // "D3 33.6M" — last full week
  format: SI,
  height: (width) => Math.max(300, Math.min(440, Math.round(width * 0.6))),
};

/* ================================================================ *
 * Card copy, one place for pages and prose                         *
 * ================================================================ */

export const DATASETS = {
  hero: {
    label: "Oil, 1986–2026",
    title: "Forty years of oil, and the day it cost less than nothing",
    desc: "Brent and WTI daily spot prices, 1986–2026 (EIA), ~20k points. Five shocks, four recessions, and 20 April 2020, when WTI settled at −$36.98.",
    stress: "Annotation layer, an axis that crosses zero, drawing behind the data, emphasis, responsive callouts.",
    requirements: [
      "Direct end labels (“Brent $96”, “WTI $91”), no legend, not overlapping",
      "Callouts with leader lines to the true data point; the −$36.98 point marked with a dot",
      "Four NBER recession bands behind the lines, one label",
      "y-axis crosses zero: domain includes −37, a distinct zero line, ticks “−$40 … $160”",
      "Brent full ink, WTI muted but readable; decade ticks on x",
      "Narrow widths: callouts dropped in the declared order (HERO.calloutBudget), never piled up",
    ],
    x: "Date", y: "US$ per barrel",
  },
  grid: {
    label: "Grid, half-hourly",
    title: "Britain's grid, every half hour since 2009: coal went from 42% to zero",
    desc: "GB electricity generation by fuel (NESO), 312,816 half-hours × 4 series = 1.25M points. Coal falls away, wind rises, solar is a daily hump. The rule marks Ratcliffe, the last coal plant, closing on 30 Sep 2024; NESO's file still has 24 small non-zero coal readings after it (the last 9 MW on 23 Sep 2026), left as published.",
    stress: "Raw point count, time to first paint, zoom and pan, crosshair tooltip, honest decimation.",
    requirements: [
      "Draw all 1.25M points if you can; otherwise step down the ladder (full → hour → day) and report the step",
      "Zoom and pan (wheel + drag), down to one week, with a reset",
      "Crosshair with one tooltip listing all four series at the nearest timestamp",
      "Decimation honesty: does the solar peak survive at full zoom-out (true peak 16,289 MW)?",
      "Event markers: a rule at “Last coal plant, Sep 2024” (Ratcliffe closing) and the “2012: coal 42%” label",
      "Time to first paint on the card (the badge waits for the frame)",
    ],
    x: "Time (UTC)", y: "MW",
  },
  npm: {
    label: "npm downloads",
    title: "Who actually installs these? Recharts out-downloads all seven",
    desc: "Weekly npm downloads of 22 charting packages, March 2015 – November 2026: the seven in colour, fifteen others in grey. Downloads count CI and mirrors, not people.",
    stress: "Many series, log scale, highlight one of many, end-label collision, a normalise transform, small multiples.",
    requirements: [
      "Log y with ticks 1k … 100M; empty weeks are missing, not zero",
      "All 22 drawn; hover highlights the nearest line (not point) with its name and value",
      "The seven in colour with non-colliding end labels; the rest grey",
      "A toggle to the indexed view (15 Jan 2024 = 100), with the library's own transform if it has one",
      "Small multiples of the seven on a shared log scale",
      "Identifiable without a legend at 640 px",
    ],
    x: "Week", y: "Downloads per week",
  },
  life: {
    label: "Missing data",
    title: "Life expectancy at birth",
    desc: "World Bank life expectancy at birth, five countries, 1960–2022, with years removed on purpose to make gaps: India 1969, 1980, 1991, 2002 and 2013 (one-year gaps), Nigeria 1994–1997 (a four-year gap) and China 1960–1965 (a leading gap, which also keeps China's famine-era low of 33 years below the shared y floor). Japan and the US are complete.",
    stress: "Gap handling (does the line break or bridge?), wide value range, COVID dip.",
    requirements: [
      "A null year breaks the line; it must not be bridged",
    ],
    x: "Year", y: "Years",
  },
};

/* Retired datasets, still in assets/data/ and not used by any page:
 * energy-mix.csv (the v1 synthetic hero), co2-mauna-loa-monthly.csv,
 * btc-usd-daily.csv. See assets/data/README.md. */
