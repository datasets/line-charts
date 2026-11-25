/* Umami on umami.lifeitself.org ("Line Charts Bake-off", Datopian team),
 * kept apart from datahub.io's own GA4. `data-domains` limits counting to
 * the live host, so local servers and branch previews don't log visits.
 *
 * Skipped on purpose:
 * - `?bare=1`, the demos the front page embeds in iframes: each would count
 *   as a page view.
 * - `navigator.webdriver`, which Playwright sets, so the measurement
 *   scripts don't log visits or load the tracker into pages they time. */
const UMAMI_WEBSITE_ID = "7f1e6ac4-9ce2-4780-a98b-cab61c1fe2d0";

const skip =
  navigator.webdriver ||
  new URLSearchParams(location.search).get("bare") === "1";

if (!skip) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://umami.lifeitself.org/script.js";
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.dataset.domains = "linecharts.datahub.io";
  document.head.appendChild(s);
}
