// node --test _worker/agent-test.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, parseRobots, robotsAllows, jsonLdNodes, productStatus, visibleWords, detectPlatform, runAudit } from './agent-test.js';

test('normalizeUrl accepts public hosts only', () => {
  assert.equal(normalizeUrl('shop.com.au').href, 'https://shop.com.au/');
  assert.equal(normalizeUrl('http://shop.com.au/p?x=1#top').href, 'http://shop.com.au/p?x=1');
  for (const bad of ['', 'localhost', 'http://127.0.0.1', 'http://[::1]/', 'ftp://shop.com.au', 'https://user:pw@shop.com.au', 'printer.local', 'intranet']) {
    assert.equal(normalizeUrl(bad), null, bad);
  }
});

test('robots.txt: specific group beats *, longest match wins, Allow wins ties', () => {
  const r = parseRobots(`
User-agent: *
Disallow: /

User-agent: OAI-SearchBot
User-agent: Googlebot
Disallow: /private
Allow: /private/ok$

User-agent: GPTBot
Disallow: /
Sitemap: https://x.com/sitemap.xml`);
  assert.equal(robotsAllows(r, 'OAI-SearchBot', '/'), true);
  assert.equal(robotsAllows(r, 'Googlebot', '/private/x'), false);
  assert.equal(robotsAllows(r, 'Googlebot', '/private/ok'), true);
  assert.equal(robotsAllows(r, 'Googlebot', '/private/ok/more'), false);
  assert.equal(robotsAllows(r, 'GPTBot', '/'), false);
  assert.equal(robotsAllows(r, 'PerplexityBot', '/'), false); // falls back to *
  assert.deepEqual(r.sitemaps, ['https://x.com/sitemap.xml']);
  assert.equal(robotsAllows(parseRobots('User-agent: *\nDisallow:'), 'Bingbot', '/'), true);
  assert.equal(robotsAllows(parseRobots(''), 'Bingbot', '/'), true);
  assert.equal(robotsAllows(parseRobots('User-agent: *\nDisallow: /*.pdf$'), 'Bingbot', '/a.pdf'), false);
});

test('JSON-LD product detection through @graph and variants', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
    {"@type":"Organization","name":"Shop"},
    {"@type":"ProductGroup","name":"Tee","hasVariant":[{"@type":"Product","offers":{"@type":"Offer","price":"39","priceCurrency":"AUD","availability":"https://schema.org/InStock"}}]}]}</script>
    <script type="application/ld+json">{broken</script>`;
  const { nodes, invalid } = jsonLdNodes(html);
  assert.equal(invalid, 1);
  assert.equal(productStatus(nodes).status, 'complete');
  assert.equal(productStatus(jsonLdNodes('<script type="application/ld+json">{"@type":"Product","offers":{"price":1}}</script>').nodes).status, 'no-price');
  assert.equal(productStatus([]).status, 'missing');
});

test('visibleWords ignores scripts, styles and markup', () => {
  assert.equal(visibleWords('<body><script>var a = "one two"</script><h1>Hello big world</h1><style>p{}</style><!-- x y --></body>'), 3);
});

function fakeFetch(routes) {
  return async (url, init) => {
    const ua = init.headers['user-agent'];
    const r = routes[String(url)];
    const hit = typeof r === 'function' ? r(ua) : r;
    if (!hit) return new Response('not found', { status: 404 });
    return new Response(hit.body, { status: hit.status || 200, headers: hit.headers || {} });
  };
}

test('full audit of a Shopify-like store that blocks ChatGPT at the firewall', async () => {
  const home = `<!doctype html><html lang="en-AU"><head><title>Surf Co</title><meta name="description" content="Boards">
    <meta property="og:title" content="Surf Co"><meta property="og:image" content="/og.jpg">
    <script src="https://cdn.shopify.com/s/x.js"></script>
    <script type="application/ld+json">{"@type":"Organization","name":"Surf Co"}</script></head>
    <body>${'<p>Great surfboards made in Byron Bay for every wave.</p>'.repeat(30)}
    <a href="/products/fish-board">Fish</a><form><input id="q" name="q"><label for="q">Search</label></form></body></html>`;
  const product = `<html><body><script type="application/ld+json">{"@type":"Product","name":"Fish board","offers":{"price":"899","priceCurrency":"AUD"}}</script></body></html>`;
  const report = await runAudit(new URL('https://surf.example.com.au/'), {
    fetchImpl: fakeFetch({
      'https://surf.example.com.au/': ua => (/ChatGPT-User/.test(ua) ? { status: 403, body: 'denied' } : { body: home }),
      'https://surf.example.com.au/robots.txt': { body: 'User-agent: *\nAllow: /\nUser-agent: GPTBot\nDisallow: /\nSitemap: https://surf.example.com.au/sitemap.xml' },
      'https://surf.example.com.au/sitemap.xml': { body: '<?xml version="1.0"?><sitemapindex></sitemapindex>' },
      'https://surf.example.com.au/products/fish-board': { body: product },
    }),
  });
  const by = Object.fromEntries(report.checks.map(c => [c.id, c]));
  assert.equal(report.ok, true);
  assert.equal(report.platform, 'Shopify');
  assert.equal(report.isShop, true);
  assert.equal(by['ai-crawlers'].status, 'pass');
  assert.equal(by.firewall.status, 'warn');
  assert.match(by.firewall.detail, /ChatGPT-User \(HTTP 403\)/);
  assert.match(by.training.detail, /GPTBot/);
  assert.equal(by.sitemap.status, 'pass');
  assert.equal(by['raw-html'].status, 'pass');
  assert.equal(by.product.status, 'warn'); // price but no availability
  assert.match(by.ucp.detail, /Agentic Storefronts/);
  assert.equal(by.forms.status, 'pass');
  assert.ok(report.score > 40 && report.score < 85, String(report.score));
});

test('JavaScript-only page blocked in robots.txt scores as invisible', async () => {
  const report = await runAudit(new URL('https://spa.example.com/'), {
    fetchImpl: fakeFetch({
      'https://spa.example.com/': { body: '<html><head><meta name="robots" content="noindex"></head><body><div id="root"></div><script src="/app.js"></script></body></html>' },
      'https://spa.example.com/robots.txt': { body: 'User-agent: *\nDisallow: /' },
    }),
  });
  const by = Object.fromEntries(report.checks.map(c => [c.id, c]));
  assert.equal(by.indexable.status, 'fail');
  assert.equal(by['ai-crawlers'].status, 'fail');
  assert.equal(by['raw-html'].status, 'fail');
  assert.equal(report.isShop, false);
  assert.equal(by.ucp, undefined);
  assert.equal(report.grade, 'Invisible to agents');
});

test('unreachable site returns ok:false', async () => {
  const report = await runAudit(new URL('https://down.example.com/'), { fetchImpl: fakeFetch({}) });
  assert.equal(report.ok, false);
  assert.equal(report.error, 'unreachable');
});

test('a shop without verified product data is capped at Agent-aware', async () => {
  const home = `<html lang="en-AU"><head><title>Pet shop</title><meta name="description" content="Pets"><meta property="og:title" content="x"><meta property="og:image" content="y">
    <script type="application/ld+json">{"@type":"Organization","name":"Pets"}</script><script src="/static/Magento_Theme/x.js"></script><meta name="x" content="Magento"></head>
    <body>${'<p>Food, toys and care for every pet in Australia.</p>'.repeat(40)}</body></html>`;
  const report = await runAudit(new URL('https://pets.example.com.au/'), {
    fetchImpl: fakeFetch({
      'https://pets.example.com.au/': { body: home },
      'https://pets.example.com.au/sitemap.xml': { body: '<urlset></urlset>' },
      'https://pets.example.com.au/llms.txt': { body: '# Pets - pet supplies across Australia.' },
      'https://pets.example.com.au/.well-known/ucp': { body: '{"ucp":{"version":"2026-08-25"}}' },
    }),
  });
  assert.equal(report.isShop, true);
  assert.equal(report.checks.find(c => c.id === 'product').status, 'info');
  assert.ok(report.score >= 85, String(report.score));
  assert.equal(report.grade, 'Agent-aware');
});

test('platform detection needs technical fingerprints, not a mention in the copy', () => {
  const h = new Headers();
  assert.equal(detectPlatform('<p>We build on Shopify, WooCommerce, BigCommerce, Magento and Wix.</p>', h), null);
  assert.equal(detectPlatform('<link href="/wp-content/plugins/woocommerce/assets/css/x.css">', h), 'WooCommerce');
  assert.equal(detectPlatform('<body class="home woocommerce-page woocommerce">', h), 'WooCommerce');
  assert.equal(detectPlatform('<script src="https://cdn.shopify.com/s/files/x.js"></script>', h), 'Shopify');
  assert.equal(detectPlatform('<script src="/static/version1/frontend/Magento_Theme/x.js"></script>', h), 'Magento');
});

test('a headless store is recognised from commerce signals in the page', async () => {
  const home = `<html lang="en-AU"><head><title>Pets</title></head><body>${'<p>Food and toys for every pet.</p>'.repeat(40)}<button>Add to cart</button></body></html>`;
  const badgeOnly = `<html><body><div class="CartBadge_container"></div>${'<p>Food and toys for every pet.</p>'.repeat(40)}</body></html>`;
  const report = await runAudit(new URL('https://headless.example.com.au/'), { fetchImpl: fakeFetch({ 'https://headless.example.com.au/': { body: home } }) });
  assert.equal(report.platform, null);
  assert.equal(report.isShop, true);
  const badge = await runAudit(new URL('https://badge.example.com.au/'), { fetchImpl: fakeFetch({ 'https://badge.example.com.au/': { body: badgeOnly } }) });
  assert.equal(badge.isShop, true);
});
