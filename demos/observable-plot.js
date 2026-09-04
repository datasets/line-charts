import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm";
import { mountDemo } from "../assets/js/page.js";

/* One helper: apply the shared theme to every plot via Plot's `style`
 * option and a themed colour range. Everything else is the grammar. */
const base = (theme, opts) =>
  Plot.plot({
    width: 440,
    height: 300,
    marginLeft: 46,
    marginRight: 16,
    style: { background: "transparent", color: theme.text, fontSize: "11px" },
    x: { label: null, grid: false, tickFormat: opts.year ? "d" : undefined },
    y: { label: null, grid: true },
    color: { range: theme.palette, legend: opts.legend || false },
    ...opts,
  });

mountDemo({
  meta: {
    name: "Observable Plot",
    version: "0.6.17",
    bundleKB: 65,
    license: "ISC",
    tagline:
      "A concise grammar of graphics from D3's author. You describe marks (line, dot, ruleX…) and channels (x, y, stroke) and Plot works out scales, axes and legends. Exploratory-analysis ergonomics with tasteful defaults; less of a fit for a bespoke branded production chart.",
    docs: "https://observablehq.com/plot/",
    cdn: "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm",
    notes:
      "<code>Plot.plot()</code> returns a detached SVG/figure node — you append it yourself. Interaction here is the built-in <code>Plot.tip</code> on a pointer transform; no external tooltip code. <code>color.legend: true</code> renders the swatch legend for free.",
  },
  charts: {
    co2(host, { co2 }, { theme }) {
      host.append(
        base(theme, {
          y: { label: null, grid: true, domain: [310, 430] },
          marks: [
            Plot.lineY(co2, { x: "date", y: "ppm", stroke: theme.palette[0], strokeOpacity: 0.35, strokeWidth: 1 }),
            Plot.lineY(co2.filter((d) => d.trend != null), { x: "date", y: "trend", stroke: theme.palette[0], strokeWidth: 2 }),
            Plot.tip(co2, Plot.pointerX({ x: "date", y: "ppm", title: (d) =>
              `${d.date.getUTCFullYear()}-${String(d.date.getUTCMonth() + 1).padStart(2, "0")}\n${d.ppm.toFixed(2)} ppm` })),
          ],
        })
      );
    },

    energy(host, { energy }, { theme }) {
      host.append(
        base(theme, {
          year: true,
          legend: true,
          y: { label: null, grid: true },
          marks: [
            Plot.ruleY([0], { stroke: theme.baseline }),
            Plot.lineY(energy.long, { x: "year", y: "twh", stroke: "source", strokeWidth: 2, curve: "monotone-x" }),
            Plot.tip(energy.long, Plot.pointer({ x: "year", y: "twh", stroke: "source",
              title: (d) => `${d.source}\n${d.year}: ${d.twh.toFixed(0)} TWh` })),
          ],
        })
      );
    },

    life(host, { life }, { theme }) {
      // Plot breaks the line at null y automatically — no .defined() needed
      host.append(
        base(theme, {
          year: true,
          legend: true,
          y: { label: null, grid: true, domain: [35, 88] },
          marks: [
            Plot.lineY(life.long, { x: "year", y: "value", stroke: "country", strokeWidth: 2, curve: "monotone-x" }),
            Plot.tip(life.long, Plot.pointer({ x: "year", y: "value", stroke: "country",
              title: (d) => `${d.country}\n${d.year}: ${d.value} yrs` })),
          ],
        })
      );
    },

    btc(host, { btc }, { theme }) {
      host.append(
        base(theme, {
          marginLeft: 40,
          y: { label: null, grid: true, tickFormat: (d) => (d >= 1000 ? d / 1000 + "k" : d) },
          marks: [
            Plot.lineY(btc, { x: "date", y: "close", stroke: theme.palette[0], strokeWidth: 1.25 }),
            Plot.tip(btc, Plot.pointerX({ x: "date", y: "close",
              title: (d) => `${d.date.toISOString().slice(0, 10)}\n$${Math.round(d.close).toLocaleString()}` })),
          ],
        })
      );
    },
  },
});
