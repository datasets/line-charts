/* Shared theme surface for every demo.
 * The palette matches assets/css/site.css (dataviz reference palette,
 * slots 1–8, validated as an ordered set) so libraries are compared on
 * rendering, not colour choice. Slots 6–8 are not in site.css; only the npm
 * chart (seven coloured lines) uses them. */

export const PALETTE_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const PALETTE_DARK  = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

export const FONT_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const FONT_MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export function isDark() {
  const stamp = document.documentElement.getAttribute("data-theme");
  if (stamp === "dark") return true;
  if (stamp === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Live palette + ink tokens for the current theme. */
export function theme() {
  const dark = isDark();
  return {
    dark,
    palette: dark ? PALETTE_DARK : PALETTE_LIGHT,
    surface:   dark ? "#1a1a19" : "#fcfcfb",
    page:      dark ? "#0d0d0d" : "#f9f9f7",
    text:      dark ? "#ffffff" : "#0b0b0b",
    textSecondary: dark ? "#c3c2b7" : "#52514e",
    muted:     "#898781",
    grid:      dark ? "#2c2c2a" : "#e1e0d9",
    baseline:  dark ? "#383835" : "#c3c2b7",
    fontSans: FONT_SANS,
    fontMono: FONT_MONO,
  };
}

/** Call `fn` whenever the effective theme changes (OS flip or toggle). */
export function onThemeChange(fn) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", fn);
  new MutationObserver(fn).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

/** Apply a theme choice ("light" | "dark" | "system") to this document. */
export function applyTheme(choice) {
  if (choice === "light" || choice === "dark") document.documentElement.setAttribute("data-theme", choice);
  else document.documentElement.removeAttribute("data-theme");
}

/** Wire up a `.toggle` button: cycles light → dark → system. The choice is
 * saved, and pushed to any same-origin iframes on the page (the front page
 * embeds the demo pages), which also pick it up from the storage event. */
export function installThemeToggle(btn) {
  const label = () => {
    const s = document.documentElement.getAttribute("data-theme") || "system";
    btn.textContent = s === "system" ? "Theme: system" : `Theme: ${s}`;
  };
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "system";
    const next = cur === "system" ? "light" : cur === "light" ? "dark" : "system";
    applyTheme(next);
    try { localStorage.setItem("lc-theme", next); } catch {}
    broadcastTheme();
    label();
  });
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  label();
}

/** Tell every iframe on this page the current theme choice. */
export function broadcastTheme(frames = document.querySelectorAll("iframe")) {
  const choice = document.documentElement.getAttribute("data-theme") || "system";
  for (const f of frames) {
    try { f.contentWindow?.postMessage({ type: "lc:theme", theme: choice }, location.origin); } catch {}
  }
}

/** Restore a saved toggle choice as early as possible, and follow later
 * changes made in another tab or by the page embedding this one. */
let following = false;
export function restoreTheme() {
  try { applyTheme(localStorage.getItem("lc-theme")); } catch {}
  if (following) return;
  following = true;
  addEventListener("storage", (e) => { if (e.key === "lc-theme") applyTheme(e.newValue); });
  addEventListener("message", (e) => {
    if (e.source === parent && e.origin === location.origin && e.data?.type === "lc:theme") applyTheme(e.data.theme);
  });
}
