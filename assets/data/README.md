# Data

Snapshots used by the demos. Loaders, specs and annotation values are in `assets/js/data.js`; every number in an annotation was checked against these files. Retrieved 2026-11-20 unless stated.

| File | Chart | Rows | Size | Source | Licence |
|---|---|---|---|---|---|
| `oil-brent-daily.csv` | hero | 9,967 | 169 KB | EIA spot price RBRTE, 1987-05-20 → 2026-09-01 | US Government work, public domain (DataPressr copy PDDL-1.0) |
| `oil-wti-daily.csv` | hero | 10,236 | 173 KB | EIA spot price RWTC, 1986-01-02 → 2026-09-01 | as above |
| `gb-grid-halfhourly.csv` | grid | 312,816 | 5.6 MB (2.4 MB gzip) | NESO Historic GB Generation Mix | NESO Open Data Licence |
| `gb-grid-annual.csv` | grid (label check) | 18 years | 2 KB | annual sums of the same NESO file | NESO Open Data Licence |
| `npm-chart-libs-weekly.csv` | npm | 611 weeks × 22 | 80 KB | npm download counts API | npm registry terms (factual telemetry) |
| `life-expectancy.csv` | life | 300 (5 countries × 63 years, 15 removed) | 5 KB | World Bank WDI `SP.DYN.LE00.IN`, 1960–2022 | CC BY 4.0 |

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
- **Ratcliffe-on-Soar**, Britain's last coal-fired power station, closed at the end of 30 September 2024: its owner Uniper said it would stop operating at midnight (BST) that night ([Al Jazeera, 30 Sep 2024](https://www.aljazeera.com/news/2024/9/30/uks-last-coal-fired-power-plant-to-close-after-more-than-100-years); [ITV News, 1 Oct 2024](https://itv.com/news/central/2024-10-01/ratcliffe-on-soar-end-of-an-era-as-uks-last-coal-fired-power-station-shuts-down)). The chart's rule marks that closure (2024-09-30 23:00 UTC). In this file, coal that afternoon is 405 MW at 14:00 UTC, 26 MW at 14:30 UTC, then zero.
- **Coal after the closure is left as NESO published it.** There are 24 non-zero coal half-hours after 2024-09-30 14:30 UTC: the largest is 198 MW on 2024-11-20 10:00 UTC, the last is 9 MW on 2026-09-23 16:00 UTC. We do not know what they are (metering or reclassification would be our guess, not a finding), and we have not removed them.
- **Annual totals: `gb-grid-annual.csv`.** The coal share in the "2012: coal 42%" label needs total generation, which the half-hourly file drops. So the annual sums from the same NESO file are committed alongside it: per calendar year (UTC), the number of half-hours and each NESO fuel column plus `GENERATION`, in GWh (sum of half-hourly MW × 0.5 h ÷ 1,000), and `coal_share_pct` = `coal_gwh / generation_gwh`. NESO's `GENERATION` includes imports, pumped storage and embedded wind and solar. Coal was 42.4% of it in 2012 (gas 25.7%), coal's highest share of any year 2009–2026 in this data; 2026 is a part year (to 4 November).
- Peaks in the half-hourly file: coal 26,044 MW (2009-02-02 17:00), gas 27,868 MW (2024-12-12 08:00), wind 23,880 MW (2026-03-25 13:30), solar 16,289 MW (2026-04-23 12:00).

The host gzips `text/csv` in transit, so 2.4 MB goes over the wire.

## Life expectancy (missing-data side test)

Source: World Bank, World Development Indicators, *Life expectancy at birth, total (years)*, indicator `SP.DYN.LE00.IN` (https://data.worldbank.org/indicator/SP.DYN.LE00.IN), CC BY 4.0, database last updated 2026-11-11. Fetched 2026-11-21 with:

```sh
curl -L 'https://api.worldbank.org/v2/country/JPN;USA;CHN;IND;NGA/indicator/SP.DYN.LE00.IN?date=1960:2022&format=json&per_page=1000'
```

Long format `year,country,life_expectancy`, rounded to one decimal; Japan, United States, China, India, Nigeria. The API has a value for every country and year; **15 rows are removed on purpose** so the test has gaps to break at (the loader turns each absent year into an explicit null, for every library alike):

- India 1969, 1980, 1991, 2002, 2013: single missing years, the hardest case to see.
- Nigeria 1994–1997: a four-year gap.
- China 1960–1965: a leading gap, so the line simply starts later. It also keeps China's famine-era values (33.4 years in 1960) out of a chart whose shared y-axis starts at 35.

Attribution: "Source: World Bank, World Development Indicators (CC BY 4.0)". The previous file (v1) had the same gaps but no recorded source; it was replaced on 2026-11-21.

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
