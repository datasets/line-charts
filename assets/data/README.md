# Data

Snapshots used by the demos. Loaders, specs and annotation values are in `assets/js/data.js`; every number in an annotation was checked against these files. Retrieved 2026-11-20 unless stated.

| File | Chart | Rows | Size | Source | Licence |
|---|---|---|---|---|---|
| `oil-brent-daily.csv` | hero | 9,967 | 169 KB | EIA spot price RBRTE, 1987-05-20 → 2026-09-01 | US Government work, public domain (DataPressr copy PDDL-1.0) |
| `oil-wti-daily.csv` | hero | 10,236 | 173 KB | EIA spot price RWTC, 1986-01-02 → 2026-09-01 | as above |
| `gb-grid-halfhourly.csv` | grid | 312,816 | 5.6 MB (2.4 MB gzip) | NESO Historic GB Generation Mix | NESO Open Data Licence |
| `npm-chart-libs-weekly.csv` | npm | 611 weeks × 22 | 80 KB | npm download counts API | npm registry terms (factual telemetry) |
| `life-expectancy.csv` | life | 5 countries × 63 years | 6 KB | v1 snapshot with deliberate gaps, unchanged (source not recorded in the repo) | |

## Oil (hero)

Source: U.S. Energy Information Administration, *Spot Prices* (https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm). Copied from the cleaned DataPressr snapshot of 2026-09-05 (`datapressr/datasets/energy-and-commodities/oil-prices/data/`), not a fresh EIA download: EIA's current workbooks have dropped ~890 historical Brent days and ~740 WTI days. Columns `date,price` (US$ per barrel). No missing values; the two series trade on different holidays, so their dates differ. Refresh path: EIA API v2 `petroleum/pri/spt`. Attribution: "Source: U.S. Energy Information Administration (Sep 2026)".

## Grid

Source: NESO (National Energy System Operator), *Historic GB Generation Mix*, https://www.neso.energy/data-portal/historic-generation-mix, file `df_fuel_ckan.csv` (63 MB, 34 columns), fetched with:

```sh
curl -L -o df_fuel_ckan.csv 'https://api.neso.energy/dataset/88313ae5-94e4-4ddc-a790-593554d8c6b9/resource/f93d1835-75bc-43e5-84ad-12472b180a98/download/df_fuel_ckan.csv'
```

Trimmed for the site:

- **No time column.** The series is perfectly regular in UTC once sorted (the raw file has two half-hours of 2025-12-03 out of order; nothing is missing or duplicated), so row *i* is `2009-01-01T00:00Z + i × 30 min`, last row 2026-11-04T23:30Z. `GRID.start` / `GRID.stepMs` in data.js.
- **Four columns, integer MW:** `coal`, `gas`, `wind` (= `WIND` + `WIND_EMB`, transmission plus embedded), `solar`. Nuclear and carbon intensity dropped.
- Coal after the last plant closed (Ratcliffe-on-Soar, 30 Sep 2024, last real output 26 MW at 14:30 UTC) is left as published: 24 stray non-zero half-hours, max 198 MW on 2024-11-20, which look like metering reclassification.
- Facts used in annotations, from the full NESO file: coal 42.4% of `GENERATION` in calendar 2012 (gas 25.7%). Peaks in this file: coal 26,044 MW (2009-02-02 17:00), gas 27,868 MW (2024-12-12 08:00), wind 23,880 MW (2026-03-25 13:30), solar 16,289 MW (2026-04-23 12:00).

The host gzips `text/csv` in transit, so 2.4 MB goes over the wire.

## npm

Source: npm, Inc. download counts API, `https://api.npmjs.org/downloads/range/{start}:{end}/{pkg}` (https://github.com/npm/registry/blob/main/docs/download-counts.md). Fetched as daily counts for 22 packages (≈60 calls, 364-day bulk chunks, scoped packages one at a time, 2 s spacing with 429 backoff), then summed to Monday-start weeks.

- Wide: `week` plus one column per package, the seven bake-off packages first.
- Starts at the week of 2015-03-02: the API's data effectively begins on 2015-02-27, so earlier weeks are empty or partial. Ends with the week of 2026-11-09, the last complete week.
- **Empty cell = no downloads that week**: before a package's first publish, plus four zero weeks in 2015 (recharts ×2, victory ×2). A log scale cannot show 0, so they are missing.
- Downloads count CI runs and mirrors, not people.

## Retired

Still here, used by no page:

- `energy-mix.csv`: the v2 hero, synthetic electricity-by-source data. Retired 2026-11-20 for the oil chart.
- `co2-mauna-loa-monthly.csv`, `btc-usd-daily.csv`: v1 test charts, retired because every library draws them equally well.
