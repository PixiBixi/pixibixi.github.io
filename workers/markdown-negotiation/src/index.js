/**
 * Markdown for Agents — Cloudflare Worker
 *
 * Content negotiation: requests with `Accept: text/markdown` receive the raw
 * Markdown source from the GitHub repo instead of rendered HTML.
 * All other requests are proxied transparently to GitHub Pages.
 *
 * Response headers:
 *   Content-Type: text/markdown; charset=utf-8
 *   x-markdown-tokens: <estimated token count>
 */

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/PixiBixi/pixibixi.github.io/master/docs";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const accept = request.headers.get("Accept") || "";

    if (accept.includes("text/markdown")) {
      // Normalize path: strip trailing slash, default root to index
      const path = url.pathname.replace(/\/$/, "") || "/index";
      const rawUrl = `${GITHUB_RAW_BASE}${path}.md`;

      const mdResponse = await fetch(rawUrl, {
        cf: { cacheEverything: true, cacheTtl: 3600 },
      });

      if (mdResponse.ok) {
        const content = await mdResponse.text();
        // Rough token estimate: ~4 chars per token (GPT/Claude approximation)
        const tokenEstimate = Math.ceil(content.length / 4);

        return new Response(content, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "x-markdown-tokens": String(tokenEstimate),
            "Cache-Control": "public, max-age=3600",
            Vary: "Accept",
          },
        });
      }
      // Markdown source not found (e.g. /sitemap.xml) — fall through to HTML
    }

    // Default: proxy to GitHub Pages origin unchanged
    return fetch(request);
  },
};
