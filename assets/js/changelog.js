/* Renders the changelog/ folder into the changelog page. The entry files are
 * the single source of truth; this page is just a view of them. Zero build
 * step, so the list of entries is read from changelog/manifest.json — add a
 * new entry's filename there when you add the file. See AGENTS.md. */
import { restoreTheme, installThemeToggle } from "./theme.js";
import { parseFrontmatter, renderMarkdown } from "./markdown.js";

restoreTheme();
const toggle = document.querySelector(".toggle");
if (toggle) installThemeToggle(toggle);

const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

const root = document.getElementById("entries");

async function load() {
  const files = await fetch("./changelog/manifest.json").then((r) => {
    if (!r.ok) throw new Error(`manifest.json: ${r.status}`);
    return r.json();
  });

  const entries = await Promise.all(
    files.map(async (name) => {
      const raw = await fetch(`./changelog/${name}`).then((r) => r.text());
      const { meta, body } = parseFrontmatter(raw);
      const slug = name.replace(/\.md$/, "");
      return {
        slug,
        date: String(meta.date ?? slug.slice(0, 10)),
        title: meta.title ?? slug,
        bodyHtml: renderMarkdown(body),
      };
    })
  );

  entries.sort((a, b) => (a.date === b.date ? b.slug.localeCompare(a.slug) : b.date.localeCompare(a.date)));

  if (!entries.length) {
    root.innerHTML = `<p class="lede">No entries yet.</p>`;
    return;
  }
  root.innerHTML = entries
    .map(
      (e) => `
    <article class="entry" id="${e.slug}">
      <time datetime="${e.date}">${fmtDate(e.date)}</time>
      <h2><a href="#${e.slug}">${e.title}</a></h2>
      ${e.bodyHtml}
    </article>`
    )
    .join("\n");
}

load().catch((err) => {
  root.innerHTML = `<p class="lede">Could not load the changelog (${String(err.message || err)}).</p>`;
  console.error(err);
});
