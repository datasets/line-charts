/* Shared sample data for every demo. Four datasets, each chosen to
 * stress a different part of a line-charting library. Loaded once,
 * cached, and handed to every library in the same shape. */

const asURL = (f) => new URL(`../data/${f}`, import.meta.url);

async function csv(file) {
  const text = await (await fetch(asURL(file))).text();
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = splitRow(head);
  return lines.filter(Boolean).map((line) => {
    const cells = splitRow(line);
    const row = {};
    cols.forEach((c, i) => (row[c] = cells[i]));
    return row;
  });
}

function splitRow(line) {
  // minimal CSV: handles optional double-quoted cells, no embedded newlines
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const num = (v) => {
  const n = +v;
  return v === "" || v == null || Number.isNaN(n) ? null : n;
};

/* ---------------------------------------------------------------- */

let _cache;

export function loadAll() {
  if (_cache) return _cache;
  _cache = Promise.all([loadCO2(), loadEnergy(), loadLife(), loadBTC()]).then(
    ([co2, energy, life, btc]) => ({ co2, energy, life, btc })
  );
  return _cache;
}

export async function loadCO2() {
  const rows = await csv("co2-mauna-loa-monthly.csv");
  return rows
    .map((r) => ({
      date: new Date(r.date + "T00:00:00Z"),
      ppm: num(r.co2_ppm),
      trend: num(r.co2_ppm_deseasonalized),
    }))
    .filter((d) => d.ppm != null && d.ppm > 0)
    .map((d) => ({ ...d, trend: d.trend != null && d.trend > 0 ? d.trend : null }));
}

export async function loadEnergy() {
  const rows = await csv("energy-mix.csv");
  const sources = ["coal", "gas", "nuclear", "wind", "solar"];
  const wide = rows.map((r) => {
    const o = { year: +r.year };
    sources.forEach((s) => (o[s] = num(r[s])));
    return o;
  });
  const long = [];
  wide.forEach((r) => sources.forEach((s) => long.push({ year: r.year, source: s, twh: r[s] })));
  return { sources, wide, long };
}

export async function loadLife() {
  const rows = await csv("life-expectancy.csv");
  const data = rows.map((r) => ({
    year: +r.year,
    country: r.country,
    value: num(r.life_expectancy),
  }));
  const countries = [...new Set(data.map((d) => d.country))];
  // wide form with explicit nulls where a year is missing (gap test)
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
  const byKey = new Map(data.map((d) => [d.country + ":" + d.year, d.value]));
  const wide = years.map((y) => {
    const o = { year: y };
    countries.forEach((c) => (o[c] = byKey.has(c + ":" + y) ? byKey.get(c + ":" + y) : null));
    return o;
  });
  return { countries, years, long: data, wide };
}

export async function loadBTC() {
  const rows = await csv("btc-usd-daily.csv");
  return rows.map((r) => ({ date: new Date(r.date + "T00:00:00Z"), close: num(r.close) }));
}

/* Metadata used to label the four cards identically on every page. */
export const DATASETS = {
  co2: {
    title: "CO₂ at Mauna Loa — monthly",
    desc: "Single series with a strong trend + seasonal wiggle, plus a deseasonalised overlay. ~800 points. Real NOAA data.",
    stress: "Smooth curves, a second overlaid line, date axis, y-axis not starting at zero.",
    x: "Year", y: "Parts per million",
  },
  energy: {
    title: "Electricity generation by source",
    desc: "Five series, 1997–2023, TWh. Synthetic but transition-shaped.",
    stress: "Multi-series legend, five-colour categorical palette, series that cross.",
    x: "Year", y: "TWh",
  },
  life: {
    title: "Life expectancy at birth",
    desc: "Five countries, 1960–2022, with deliberate missing years.",
    stress: "Gap handling (does the line break or bridge?), wide value range, COVID dip.",
    x: "Year", y: "Years",
  },
  btc: {
    title: "BTC-USD daily close",
    desc: "~4,000 daily points, synthetic geometric random walk with bubble/crash regimes.",
    stress: "Performance at 4k points, noisy data, zoom/pan, optional log scale.",
    x: "Date", y: "USD",
  },
};
