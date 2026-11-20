/* Shared sample data for every demo. Two datasets: the annotated hero
 * chart (whatever HERO.file names) and the gap-handling test (life expectancy). Loaded
 * once, cached, and handed to every library in the same shape.
 * co2-mauna-loa-monthly.csv and btc-usd-daily.csv are still in
 * assets/data/ — their loaders are below, unused by the pages. */

const asURL = (f) => new URL(`../data/${f}`, import.meta.url);

async function csv(file) {
  const res = await fetch(asURL(file));
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const text = await res.text();
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
  _cache = Promise.all([loadHero(), loadLife()]).then(([hero, life]) => ({ hero, life }));
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

/* The hero dataset is any wide CSV: the first column is x (a number, e.g. a
 * year), every other column is one series. Demos see { series, wide, long }
 * with rows { x, <series>: y } and { x, series, y }. */
export async function loadHero() {
  const rows = await csv(HERO.file);
  const [xCol, ...series] = Object.keys(rows[0]);
  const wide = rows.map((r) => {
    const o = { x: +r[xCol] };
    series.forEach((s) => (o[s] = num(r[s])));
    return o;
  });
  const long = wide.flatMap((r) => series.map((s) => ({ x: r.x, series: s, y: r[s] })));
  return { series, wide, long };
}

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

export async function loadBTC() {
  const rows = await csv("btc-usd-daily.csv");
  return rows.map((r) => ({ date: new Date(r.date + "T00:00:00Z"), close: num(r.close) }));
}

/* The hero chart: its data and its editorial furniture, identical in all
 * seven libraries so the only variable is what each one costs to build.
 * Every demo reads these rather than hard-coding its own, so swapping the
 * dataset is a new CSV plus this block (and DATASETS.hero below). */
export const HERO = {
  file: "energy-mix.csv",
  unit: "TWh",
  x: { domain: [1997, 2023], step: 5 }, // end labels sit at domain[1]
  yMax: 190,                            // fixed, so all seven share a frame
  emphasis: ["wind", "solar"],          // full colour + weight, drawn last
  context: ["coal", "gas", "nuclear"],  // muted to one grey, told apart by their labels
  slot: { wind: 2, solar: 3 },          // palette slot for each emphasised series
  opacity: { nuclear: 0.65 },           // any series not listed is fully opaque
  band: { x0: 2008, x1: 2009, label: "financial crisis", labelY: 181 },
  ref: { y: 100, label: "100 TWh", labelX: 1997.3, labelY: 105 },
  /* The annotation: text centred over a vertical leader that drops into the
   * empty wedge above the crossover, so it never lands on a line and never
   * runs off the right edge however narrow the chart gets. */
  note: { text: "gas overtakes coal", x: 2011, textY: 158, from: 150, to: 106 },
};

/* Metadata used to label the cards identically on every page. */
export const DATASETS = {
  hero: {
    title: "Wind and solar overtook coal — electricity generation by source",
    desc: "The editorial test: direct end-of-line labels, an annotation with a leader line, a shaded event band, a dashed reference line, and two series emphasised against three muted ones.",
    stress: "Annotation layer, text placement and collision, drawing behind the data, per-series emphasis, responsive labels.",
    x: "Year", y: "TWh",
  },
  life: {
    title: "Life expectancy at birth",
    desc: "Five countries, 1960–2022, with deliberate missing years.",
    stress: "Gap handling (does the line break or bridge?), wide value range, COVID dip.",
    x: "Year", y: "Years",
  },
};
