import { mountDemo, spreadLabels, viewSwitch } from "../assets/js/page.js";
import { HERO, GRID, NPM, ink } from "../assets/js/data.js";

/* `uPlot` is an IIFE global (see uplot.html). Data is columnar: [xs, ...ys],
 * typed arrays welcome. It wants a pixel width, so each render reads
 * host.clientWidth and returns u.destroy as cleanup. Every dataset here has
 * x in epoch ms, hence `ms: 1` and a UTC tzDate on each chart. */
const W = (host) => Math.max(host.clientWidth - 4, 320);

const axes = (theme, opts = {}) => [
  {
    stroke: theme.muted, size: 34,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.grid, width: 1 },
    ...opts.x,
  },
  {
    stroke: theme.muted, size: 50,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.grid, width: 1 },
    ...opts.y,
  },
];

mountDemo({
  meta: {
    name: "µPlot",
    version: "1.6.32",
    bundleKB: 22,
    license: "MIT",
    tagline:
      "The performance option: 22 KB, draws a million points on Canvas faster than most libraries draw twenty thousand, with drag-to-zoom, a synced cursor and series focus built in. In return the API is spartan and there is no annotation model at all — no band, no reference line, no label, no arrow. Everything editorial is your own canvas code inside a draw hook, in device pixels.",
    docs: "https://github.com/leeoniya/uPlot/tree/master/docs",
    cdn: "https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js",
    notes:
      "Annotations go in hooks: <code>drawClear</code> (before the grid) for bands, <code>drawAxes</code> (after the grid, before the series) for reference rules, <code>draw</code> (after the series) for labels and leaders. Hooks hand you the raw 2D context in device pixels, so every size is multiplied by <code>uPlot.pxRatio</code>. x is epoch ms everywhere (<code>ms: 1</code>) with a UTC <code>tzDate</code>.",
    cardNotes: {
      hero: "No annotation layer: bands, the zero rule, callouts, leaders and end labels are all canvas calls in three draw hooks, in device pixels, and multi-line text is a loop of <code>fillText</code>. The scales and axes are trivial; the editorial layer is most of the code.",
      grid: "All 1.25M points at full resolution, first paint ~50 ms (46–69 ms over six runs; fetching and parsing the file is separate). The line builder keeps each pixel column's min and max, so the solar peak (16,289 MW) survives at full zoom-out. Drag-to-zoom and double-click reset are built in. µPlot has no touch handling and pans only if you write it: the one-week floor, Ctrl/⌘-wheel and pinch zoom, Shift + drag and one-finger pan are ~40 lines of hooks and pointer events, the floating tooltip ~10.",
      npm: "Highlight-one-of-many is native: <code>cursor.focus.prox</code> dims every series but the nearest. Log scale is <code>distr: 3</code>; the index is done by hand; small multiples are seven instances with a synced cursor. Greys use an rgba stroke, since focus resets <code>alpha</code> to 1.",
    },
  },
  charts: {
    hero(host, { hero: oil }, { theme, report }) {
      const w = host.clientWidth || 640, h = HERO.height(w), r = uPlot.pxRatio;
      const shown = HERO.callouts.filter((c) => c.rank <= HERO.calloutBudget(w));
      const band = HERO.bands[HERO.bandLabel.band];
      const at = (u, x, y) => [u.valToPos(Date.parse(x), "x", true), u.valToPos(y, "y", true)];
      // canvas text: one fillText per line, anchored like SVG text-anchor
      const text = (ctx, lines, x, y, { anchor = "start", valign = "middle", fill = theme.text, size = 11, weight = 400 } = {}) => {
        const lh = 13 * r, top = { bottom: y - lines.length * lh - 3 * r, top: y + 3 * r, middle: y - (lines.length * lh) / 2 }[valign];
        ctx.font = `${weight} ${size * r}px ${theme.fontSans}`;
        ctx.fillStyle = fill;
        ctx.textAlign = anchor === "middle" ? "center" : anchor;
        ctx.textBaseline = "middle";
        const dx = { start: 4, end: -4, middle: 0 }[anchor] * r;
        lines.forEach((t, i) => ctx.fillText(t, x + dx, top + (i + 0.5) * lh));
      };
      const u = new uPlot({
        width: w, height: h, ms: 1, tzDate: (ts) => uPlot.tzDate(new Date(ts), "Etc/UTC"),
        padding: [10, 76, 0, 0],                               // room for the end labels
        legend: { show: false }, cursor: { show: false },
        scales: { x: { time: true, range: () => HERO.x.domain.map(Date.parse) }, y: { range: HERO.y.domain } },
        series: [{}, ...HERO.series.map((s) => ({ stroke: ink(theme, s.color), width: s.width, spanGaps: true }))],
        axes: [
          { stroke: theme.textSecondary, font: `11px ${theme.fontSans}`, size: 24, grid: { show: false },
            ticks: { stroke: theme.baseline, size: 4 },
            splits: () => HERO.x.ticks.map(Date.parse), values: (u, ts) => ts.map(HERO.x.format) },
          { stroke: theme.textSecondary, font: `11px ${theme.fontSans}`, size: 44,
            grid: { stroke: theme.grid, width: 1 }, ticks: { show: false },
            splits: () => HERO.y.ticks, values: (u, vs) => vs.map(HERO.y.format) },
        ],
        hooks: {
          drawClear: [(u) => {                                 // recession bands, behind the grid
            u.ctx.fillStyle = theme.grid;
            for (const b of HERO.bands) {
              const [x0] = at(u, b.from, 0), [x1] = at(u, b.to, 0);
              u.ctx.fillRect(x0, u.bbox.top, x1 - x0, u.bbox.height);
            }
          }],
          drawAxes: [(u) => {                                  // zero rule: over the grid, under the lines
            const y = Math.round(u.valToPos(HERO.zero.y, "y", true));
            u.ctx.fillStyle = theme.muted;
            u.ctx.fillRect(u.bbox.left, y, u.bbox.width, r);
          }],
          draw: [(u) => {
            const { ctx } = u;
            text(ctx, [HERO.bandLabel.text], ...at(u, band.from, HERO.bandLabel.y), { fill: theme.muted, size: 10 });
            for (const c of shown) {
              const [px, py] = at(u, c.date, c.value), [ax, ay] = at(u, ...c.at);
              ctx.strokeStyle = theme.textSecondary;
              ctx.lineWidth = r;
              ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke();
              ctx.fillStyle = theme.text;
              ctx.beginPath(); ctx.arc(px, py, 3 * r, 0, 2 * Math.PI); ctx.fill();
              text(ctx, c.lines, ax, ay, { anchor: c.anchor, valign: c.valign });
            }
            const ends = HERO.series.map((s) => ({ s, value: oil.cols[s.key].y.at(-1) }));
            spreadLabels(ends.map((d) => ({ ...d, v: u.valToPos(d.value, "y", true) })),
              13 * r, [u.bbox.top, u.bbox.top + u.bbox.height])
              .forEach((d) => text(ctx, [HERO.endLabel(d.s, d.value)], u.bbox.left + u.bbox.width + 2 * r, d.v,
                { fill: ink(theme, d.s.color), weight: 600 }));
          }],
        },
      }, [oil.aligned.t, ...HERO.series.map((s) => oil.aligned[s.key])], host);
      report({ points: oil.rows.length, step: "full" });
      return () => u.destroy();
    },

    grid(host, { grid: g }, { theme, report, range }) {
      // full resolution: µPlot is handed all 1.25M points and decimates per
      // pixel column itself (min + max), so no shared ladder step is needed
      const w = host.clientWidth || 640, h = GRID.height(w), r = uPlot.pxRatio;
      const [rule, note] = GRID.events, [t0, t1] = [g.t[0], g.t[g.n - 1]];
      const mw = (v) => `${Math.round(v).toLocaleString("en")} MW`;
      const tip = document.createElement("div");
      tip.className = "u-tip";
      // zoom/pan target, clamped to the data and to GRID.zoom.minSpanMs
      const zoomTo = (u, min, max) => {
        const span = Math.min(t1 - t0, Math.max(GRID.zoom.minSpanMs, max - min)), mid = (min + max) / 2;
        const lo = Math.max(t0, Math.min(t1 - span, mid - span / 2));
        u.setScale("x", { min: lo, max: lo + span });
      };
      const u = new uPlot({
        width: w, height: h, ms: 1, tzDate: (ts) => uPlot.tzDate(new Date(ts), "Etc/UTC"),
        padding: [16, 12, 0, 0],
        scales: { y: { range: GRID.y.domain } },
        series: [{}, ...GRID.series.map((s) => ({ label: s.label, stroke: ink(theme, s.color), width: 1 }))],
        axes: [
          { stroke: theme.textSecondary, font: `11px ${theme.fontSans}`,
            size: (u, vals) => (vals?.some((v) => v?.includes("\n")) ? 40 : 26),   // room for "Mar\n2024"
            grid: { show: false }, ticks: { stroke: theme.baseline, size: 4 } },
          { stroke: theme.textSecondary, font: `11px ${theme.fontSans}`, size: 46,
            grid: { stroke: theme.grid, width: 1 }, ticks: { show: false },
            splits: () => GRID.y.ticks, values: (u, vs) => vs.map(GRID.y.format) },
        ],
        legend: { live: false },
        cursor: { y: false, drag: { setScale: false } },       // drag-select zooms x (below); double-click resets
        hooks: {
          setSelect: [(u) => {                                 // replaces the default zoom, to keep ≥ one week
            if (u.select.width < 2) return;
            zoomTo(u, u.posToVal(u.select.left, "x"), u.posToVal(u.select.left + u.select.width, "x"));
            u.setSelect({ width: 0, height: 0 }, false);
          }],
          ready: [(u) => {
            u.over.append(tip);
            // trackpad pinch / Ctrl+wheel zooms around the cursor; a horizontal swipe pans
            // (embedded, the page passes on only Ctrl/⌘ wheels); a plain vertical wheel scrolls the page
            u.over.addEventListener("wheel", (e) => {
              const { min, max } = u.scales.x, span = max - min;
              if (e.ctrlKey || e.metaKey) {
                const x = u.posToVal(u.cursor.left, "x"), k = Math.exp(e.deltaY * 0.01);
                zoomTo(u, x - (x - min) * k, x + (max - x) * k);
              } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                const dx = (e.deltaX / u.over.clientWidth) * span;
                zoomTo(u, min + dx, max + dx);
              } else return;
              e.preventDefault();
            }, { passive: false });
            // pan: Shift + drag with a mouse (a plain drag is µPlot's own select-to-zoom),
            // one finger on touch; two fingers pinch-zoom. µPlot has no touch handling.
            const pts = new Map(), over = u.over;
            let s0;
            over.style.touchAction = "pan-y";                              // a vertical swipe still scrolls
            const rebase = () => (s0 = { min: u.scales.x.min, max: u.scales.x.max, xs: [...pts.values()] });
            over.addEventListener("pointerdown", (e) => {
              if (e.pointerType === "mouse" && !e.shiftKey) return;
              if (e.pointerType === "mouse") e.preventDefault();           // no select box
              over.setPointerCapture(e.pointerId);
              pts.set(e.pointerId, e.clientX); rebase();
            });
            over.addEventListener("pointermove", (e) => {
              if (!pts.has(e.pointerId)) return;
              pts.set(e.pointerId, e.clientX);
              const xs = [...pts.values()], left = over.getBoundingClientRect().left;
              const per = (s0.max - s0.min) / over.clientWidth;          // ms per px at the start
              if (xs.length === 1) return zoomTo(u, s0.min - (xs[0] - s0.xs[0]) * per, s0.max - (xs[0] - s0.xs[0]) * per);
              const p1 = (per * Math.abs(s0.xs[1] - s0.xs[0])) / Math.max(1, Math.abs(xs[1] - xs[0]));
              const v = s0.min + ((s0.xs[0] + s0.xs[1]) / 2 - left) * per;  // keep this time under the fingers
              const lo = v - ((xs[0] + xs[1]) / 2 - left) * p1;
              zoomTo(u, lo, lo + p1 * over.clientWidth);
            });
            const up = (e) => pts.delete(e.pointerId) && rebase();
            over.addEventListener("pointerup", up);
            over.addEventListener("pointercancel", up);
          }],
          setCursor: [(u) => {                                 // one tooltip, all four series
            const { left, top, idx } = u.cursor;
            tip.style.display = idx == null || left < 0 ? "none" : "block";
            if (idx == null || left < 0) return;
            tip.innerHTML = `<b>${new Date(g.t[idx]).toISOString().slice(0, 16).replace("T", " ")} UTC</b>` +
              GRID.series.map((s) => `<div><i style="background:${ink(theme, s.color)}"></i>${s.label} ${mw(g[s.key][idx])}</div>`).join("");
            const flip = left > u.over.clientWidth / 2;
            tip.style.left = `${flip ? left - tip.offsetWidth - 12 : left + 12}px`;
            tip.style.top = `${Math.min(top, u.over.clientHeight - tip.offsetHeight)}px`;
          }],
          draw: [(u) => {                                      // the two events, clipped to the plot
            const { ctx } = u, x = u.valToPos(Date.parse(rule.date), "x", true);
            ctx.save();
            ctx.beginPath(); ctx.rect(u.bbox.left, u.bbox.top - 16 * r, u.bbox.width, u.bbox.height + 16 * r); ctx.clip();
            ctx.strokeStyle = theme.textSecondary; ctx.lineWidth = r; ctx.setLineDash([3 * r, 3 * r]);
            ctx.beginPath(); ctx.moveTo(x, u.bbox.top); ctx.lineTo(x, u.bbox.top + u.bbox.height); ctx.stroke();
            ctx.font = `${10.5 * r}px ${theme.fontSans}`; ctx.fillStyle = theme.text; ctx.textBaseline = "bottom";
            ctx.textAlign = "end"; ctx.fillText(rule.label, x - 4 * r, u.bbox.top - 3 * r);
            ctx.textAlign = "start";
            ctx.fillText(note.label, u.valToPos(Date.parse(note.date), "x", true), u.valToPos(note.y, "y", true));
            ctx.restore();
          }],
        },
      }, [g.t, ...GRID.series.map((s) => g[s.key])], host);
      if (range) zoomTo(u, ...range);                          // open on a window if asked
      report({ points: g.n * g.keys.length, step: g.step,
        note: `solar peak drawn ${mw(g.solar.reduce((a, b) => Math.max(a, b)))} of ${mw(GRID.peaks.solar.mw)}` });
      return () => u.destroy();
    },

    npm(host, { npm }, { theme, report }) {
      const w = host.clientWidth || 640, r = uPlot.pxRatio;
      const seven = new Map(NPM.seven.map((s) => [s.key, s]));
      const order = [...npm.keys.filter((k) => !seven.has(k)), ...seven.keys()];   // greys first
      // focus resets each series' alpha to 1, so the greys' opacity lives in the colour
      const grey = ink(theme, NPM.others.color) + Math.round(NPM.others.opacity * 255).toString(16);
      const color = (k) => (seven.has(k) ? ink(theme, seven.get(k).color) : grey);
      const tz = (ts) => uPlot.tzDate(new Date(ts), "Etc/UTC");
      const font = `11px ${theme.fontSans}`;
      const xAxis = { stroke: theme.textSecondary, font, size: (u, vals) => (vals?.some((v) => v?.includes("\n")) ? 40 : 26), grid: { show: false }, ticks: { stroke: theme.baseline, size: 4 } };
      const yAxis = (Y, ticks = Y.ticks) => ({ stroke: theme.textSecondary, font, size: 40, ticks: { show: false },
        grid: { stroke: theme.grid, width: 1 }, splits: () => ticks, filter: (u, vs) => vs, values: (u, vs) => vs.map(Y.format) });   // keep every log tick
      const label = (ctx, str, x, y, fill) => {
        ctx.font = `600 ${11 * r}px ${theme.fontSans}`; ctx.fillStyle = fill;
        ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(str, x, y);
      };

      const lines = (indexed, out) => {
        const Y = indexed ? NPM.index : NPM.y;
        const i0 = indexed ? npm.t.indexOf(Date.parse(NPM.index.date)) : 0;
        // the index transform, by hand: each series ÷ its value in the index week × 100
        const ys = order.map((k) => npm.cols[k].slice(i0).map((v, _, c) => (indexed && v != null ? (v / c[0]) * 100 : v)));
        const tip = document.createElement("div");
        tip.className = "u-tip";
        let focused = null;
        const showTip = (u) => {
          const { left, top, idx } = u.cursor, v = focused && idx != null ? u.data[focused][idx] : null;
          tip.style.display = v == null ? "none" : "block";
          if (v == null) return;
          tip.innerHTML = `<b>${u.series[focused].label}</b><div>${new Date(u.data[0][idx]).toISOString().slice(0, 10)}: ` +
            (indexed ? Y.format(v) : `${v.toLocaleString("en")} / week`) + "</div>";
          tip.style.left = `${left > u.over.clientWidth / 2 ? left - tip.offsetWidth - 12 : left + 12}px`;
          tip.style.top = `${top + 12}px`;
        };
        const u = new uPlot({
          width: w, height: NPM.height(w), ms: 1, tzDate: tz, padding: [8, 96, 0, 0],
          scales: { y: { distr: 3, range: Y.domain } },        // distr 3 = log
          series: [{}, ...order.map((k) => ({ label: seven.get(k)?.label ?? k, stroke: color(k),
            width: seven.has(k) ? 1.75 : NPM.others.width }))],
          axes: [xAxis, yAxis(Y)],
          legend: { show: false },
          focus: { alpha: 0.15 },
          cursor: { y: false, points: { show: false }, drag: { x: false }, focus: { prox: 24 } },   // nearest line within 24 px
          hooks: {
            ready: [(u) => u.over.append(tip)],
            setSeries: [(u, i) => { focused = i; showTip(u); }],
            setCursor: [showTip],
            drawAxes: [(u) => {                                // the 100 rule in the indexed view
              if (!indexed) return;
              u.ctx.fillStyle = theme.muted;
              u.ctx.fillRect(u.bbox.left, Math.round(u.valToPos(100, "y", true)), u.bbox.width, r);
            }],
            draw: [(u) => {                                    // end labels, de-collided in pixel (= log) space
              const ends = [...seven.keys(), ...NPM.alsoLabel].map((k) => {
                const value = ys[order.indexOf(k)].at(-1);
                return { k, value, v: u.valToPos(value, "y", true) };
              });
              spreadLabels(ends, 12 * r, [u.bbox.top, u.bbox.top + u.bbox.height]).forEach((d) =>
                label(u.ctx, (indexed ? NPM.index : NPM).endLabel(seven.get(d.k) ?? { label: d.k }, d.value),
                  u.bbox.left + u.bbox.width + 6 * r, d.v, seven.has(d.k) ? color(d.k) : theme.muted));
            }],
          },
        }, [npm.t.slice(i0), ...ys], out);
        return () => u.destroy();
      };

      const multiples = (out) => {
        const cols = NPM.multiples.columns(w);
        out.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr)`;
        const plots = NPM.seven.map((s) => new uPlot({
          width: Math.floor(w / cols), height: NPM.multiples.height, ms: 1, tzDate: tz, padding: [6, 8, 0, 0],
          scales: { y: { distr: 3, range: NPM.y.domain } },    // shared log y
          series: [{}, { label: s.label, stroke: color(s.key), width: 1.25 }],
          axes: [{ ...xAxis, size: 22, space: 50 }, yAxis(NPM.y, NPM.y.ticks.filter((_, i) => i % 2 === 0))],
          legend: { show: false },
          cursor: { y: false, drag: { x: false }, sync: { key: "npm-multiples" } },   // hover one, all follow
          hooks: { draw: [(u) => label(u.ctx, s.label, u.bbox.left + 4 * r, u.bbox.top + 8 * r, theme.text)] },
        }, [npm.t, npm.cols[s.key]], out.appendChild(document.createElement("div"))));
        return () => plots.forEach((p) => p.destroy());
      };

      report({ points: npm.rows.filter((d) => d.downloads != null).length, step: "full" });
      return viewSwitch(host, { all: "All 22", indexed: "Indexed", multiples: "Small multiples" },
        (v, out) => (v === "multiples" ? multiples(out) : lines(v === "indexed", out)));
    },

    life(host, { life }, { theme }) {
      const data = [
        life.years,
        ...life.countries.map((c) => life.wide.map((r) => r[c])),  // nulls break the line by default
      ];
      const u = new uPlot({
        width: W(host), height: 300,
        scales: { x: { time: false }, y: { range: [35, 88] } },
        series: [
          { label: "year" },
          ...life.countries.map((c, i) => ({
            label: c, stroke: theme.palette[i], width: 2,
          })),
        ],
        axes: axes(theme, { x: { values: (u, v) => v.map((x) => String(x)) } }),
      }, data, host);
      return () => u.destroy();
    },
  },
});
