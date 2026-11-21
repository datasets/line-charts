/* Cloudflare Pages serves the repo root, and Pages ignores .assetsignore, so
 * repo housekeeping (Beads, agent instructions, scripts) would be public.
 * _routes.json sends only those paths here; everything else is static. */
export const onRequest = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
