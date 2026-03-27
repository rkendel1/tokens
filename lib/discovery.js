/**
 * Page Discovery
 *
 * Discovers internal pages from a starting URL via DOM link extraction
 * or sitemap.xml parsing.
 */

/**
 * Score a URL path for importance (higher = more important).
 * Prioritizes shallow, navigational paths over blog posts / legal pages.
 */
export function scoreUrl(pathname) {
  const lc = pathname.toLowerCase();

  // Exclude noise
  const exclude = [
    /\/(login|signin|sign-in|signup|sign-up|register|auth)/,
    /\/(terms|privacy|legal|cookie|gdpr|tos)/,
    /\/(cdn-cgi|wp-admin|wp-content|wp-json)/,
    /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|tar|gz|mp4|mp3)$/,
    /\/tag\//,
    /\/author\//,
    /\/page\/\d+/,
    /\?/,  // query strings (shouldn't appear here but safety)
  ];
  if (exclude.some(r => r.test(lc))) return -1;

  let score = 100;

  // Prefer shallow paths
  const depth = (pathname.match(/\//g) || []).length;
  score -= depth * 10;

  // Boost key navigational pages
  const boosts = [
    [/^\/(pricing|plans?|cost)/, 30],
    [/^\/(about|company|team|story)/, 25],
    [/^\/(product|features?|solutions?)/, 25],
    [/^\/(enterprise|business|platform)/, 20],
    [/^\/(contact|demo|trial|start)/, 20],
    [/^\/(docs|documentation|developers?|api)/, 15],
    [/^\/(blog|resources|insights|news)/, 10],
  ];
  for (const [re, boost] of boosts) {
    if (re.test(lc)) { score += boost; break; }
  }

  return score;
}

/**
 * Discover internal links from an already-loaded Playwright page.
 * Call after extractBranding() has loaded and scrolled the page.
 *
 * @param {import('playwright-core').Page} page
 * @param {string} baseUrl - The starting URL (used to determine same-origin)
 * @param {number} maxPages - Maximum number of URLs to return
 * @returns {Promise<string[]>} Ordered list of URLs to crawl (excluding homepage)
 */
export async function discoverLinks(page, baseUrl, maxPages) {
  const origin = new URL(baseUrl).origin;

  const links = await page.evaluate((origin) => {
    const results = [];
    const navSelectors = [
      'nav a', 'header a', 'footer a',
      '[role="navigation"] a', '[aria-label*="nav"] a',
      '[data-nav] a', '.nav a', '.navbar a', '.header a', '.menu a',
    ];

    // Score links by location: nav/header/footer = 2, elsewhere = 1
    const scored = new Map(); // pathname → { href, locationScore }

    function addLinks(selector, locationScore) {
      document.querySelectorAll(selector).forEach(a => {
        try {
          const url = new URL(a.href);
          if (url.origin !== origin) return;
          const pathname = url.pathname.replace(/\/$/, '') || '/';
          if (!scored.has(pathname) || scored.get(pathname).locationScore < locationScore) {
            scored.set(pathname, { href: url.origin + pathname, locationScore });
          }
        } catch {}
      });
    }

    navSelectors.forEach(sel => addLinks(sel, 2));
    addLinks('a[href]', 1);

    scored.forEach(({ href, locationScore }, pathname) => {
      results.push({ href, pathname, locationScore });
    });

    return results;
  }, origin);

  // Remove homepage itself
  const homepagePath = new URL(baseUrl).pathname.replace(/\/$/, '') || '/';

  const scored = links
    .filter(l => l.pathname !== homepagePath)
    .map(l => ({ ...l, score: scoreUrl(l.pathname) + (l.locationScore * 5) }))
    .filter(l => l.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxPages).map(l => l.href);
}

/**
 * Discover pages from a site's sitemap.xml.
 *
 * @param {string} baseUrl - The starting URL
 * @param {number} maxPages - Maximum number of URLs to return
 * @returns {Promise<string[]>} List of URLs from sitemap (excluding homepage)
 */
export async function parseSitemap(baseUrl, maxPages) {
  const base = new URL(baseUrl);
  const sitemapUrl = `${base.origin}/sitemap.xml`;

  let xml;
  try {
    const res = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Dembrandt/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  // If it's a sitemap index, fetch child sitemaps
  const isSitemapIndex = xml.includes('<sitemapindex');
  let allXml = xml;

  if (isSitemapIndex) {
    const childUrls = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/g)]
      .map(m => m[1].trim())
      .filter(u => u.includes(base.hostname))
      .slice(0, 3); // only first 3 child sitemaps

    const childXmls = await Promise.all(
      childUrls.map(u =>
        fetch(u, { signal: AbortSignal.timeout(8000) })
          .then(r => r.text())
          .catch(() => '')
      )
    );
    allXml = childXmls.join('\n');
  }

  const homepagePath = base.pathname.replace(/\/$/, '') || '/';

  const urls = [...allXml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/g)]
    .map(m => m[1].trim())
    .filter(u => {
      try {
        const parsed = new URL(u);
        return parsed.hostname === base.hostname;
      } catch { return false; }
    })
    .map(u => {
      // Normalize: strip trailing slash, query, hash
      const p = new URL(u);
      return p.origin + (p.pathname.replace(/\/$/, '') || '/');
    });

  // Deduplicate
  const seen = new Set();
  const deduped = [];
  for (const u of urls) {
    const path = new URL(u).pathname;
    if (path === homepagePath) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    deduped.push(u);
  }

  // Score and sort
  const scored = deduped
    .map(u => ({ href: u, score: scoreUrl(new URL(u).pathname) }))
    .filter(l => l.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxPages).map(l => l.href);
}
