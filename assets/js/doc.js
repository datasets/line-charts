/* Renders a repo Markdown file into a doc page (verdict / method / build-notes).
 * The .md file stays the single source of truth; the page declares which file
 * on <body data-doc="..."> and this module fetches and renders it. */
import { restoreTheme, installThemeToggle } from "./theme.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";

restoreTheme();
const toggle = document.querySelector(".toggle");
if (toggle) installThemeToggle(toggle);

const REPO = "https://github.com/datasets/line-charts";
const PAGES = { "EVALUATION.md": "./verdict", "ANALYSIS.md": "./method", "docs/BUILD-NOTES.md": "./build-notes" };

const slugify = (s) =>
  s.toLowerCase().replace(/[`*_]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

/** Rewrite a repo-relative link found in `docPath` to its site page or GitHub URL. */
function rewriteHref(href, docPath) {
  if (!href || /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return href;
  const [pathPart, hash = ""] = href.split("#");
  const base = new URL(docPath, "https://x.invalid/");
  const path = decodeURIComponent(new URL(pathPart, base).pathname.slice(1));
  const frag = hash ? "#" + hash : "";
  if (PAGES[path]) return PAGES[path] + frag;
  if (path === "README.md") return REPO + frag;
  if (path.endsWith("/")) return `${REPO}/tree/main/${path}${frag}`;
  return `${REPO}/blob/main/${path}${frag}`;
}

async function load() {
  const docPath = document.body.dataset.doc;
  const root = document.getElementById("doc");
  const src = await fetch(`./${docPath}`).then((r) => {
    if (!r.ok) throw new Error(`${docPath}: ${r.status}`);
    return r.text();
  });
  root.innerHTML = marked.parse(src, { gfm: true });

  // first h1 is the page title; drop it from the body only if the page header already shows it
  const used = new Set();
  root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
    let id = slugify(h.textContent) || "section";
    for (let n = 2; used.has(id); n++) id = `${slugify(h.textContent)}-${n}`;
    used.add(id);
    h.id = id;
    h.insertAdjacentHTML("beforeend", ` <a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`);
  });

  root.querySelectorAll("a[href]").forEach((a) => {
    if (a.classList.contains("anchor")) return;
    const href = rewriteHref(a.getAttribute("href"), docPath);
    a.setAttribute("href", href);
    if (/^https?:\/\//.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
  });

  root.querySelectorAll("table").forEach((t) => {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    wrap.tabIndex = 0;
    t.replaceWith(wrap);
    wrap.appendChild(t);
  });

  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

load().catch((err) => {
  document.getElementById("doc").innerHTML = `<p class="lede">Could not load this page (${String(err.message || err)}).</p>`;
  console.error(err);
});
