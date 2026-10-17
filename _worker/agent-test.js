/**
 * AWA AI-agent readiness test (Cloudflare Worker).
 *
 * POST /agent-test {"url": "yourstore.com.au"} -> JSON report: can AI assistants (ChatGPT, Google AI Mode/Gemini,
 * Claude, Perplexity, Copilot) find, understand and act on the site? Everything is checked from the outside with
 * ~10 plain GET requests; nothing is stored except a 24 h edge cache of the report.
 * Lives in _worker/ so GitHub Pages (Jekyll) does not publish it with the static site.
 */

const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// Live firewall probe: the same homepage request, identified as the assistants' user-initiated fetchers.
const BOT_UAS = {
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'PerplexityBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
};
// Crawlers that put a site into AI answers (search/user fetchers). Blocking these hides the site.
const SEARCH_BOTS = [
  ['OAI-SearchBot', 'ChatGPT search'], ['ChatGPT-User', 'ChatGPT (live browsing)'], ['Googlebot', 'Google Search, AI Overviews and AI Mode'],
  ['Bingbot', 'Bing and Microsoft Copilot'], ['Claude-SearchBot', 'Claude search'], ['PerplexityBot', 'Perplexity'],
];
// Training crawlers: blocking them is a legitimate choice and does not remove a site from AI answers.
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
const ORG_TYPES = ['organization', 'localbusiness', 'store', 'onlinestore', 'onlinebusiness', 'professionalservice', 'corporation', 'brand'];
const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY = 2_000_000;
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?australianweb\.agency$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

export function normalizeUrl(input) {
  let s = String(input || '').trim();
  if (!s || s.length > 2000) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  // public hostnames only: no IP literals, localhost or internal suffixes
  if (!h.includes('.') || /^[\d.]+$/.test(h) || h.startsWith('[') || /(^|\.)(localhost|local|internal|lan|home\.arpa)$/.test(h)) return null;
  u.hash = '';
  return u;
}

async function get(url, { ua = UA_BROWSER, accept = 'text/html,application/xhtml+xml,*/*;q=0.8', fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetchImpl(url, { headers: { 'user-agent': ua, accept }, redirect: 'follow', signal: ctrl.signal });
    const len = Number(r.headers.get('content-length') || 0);
    const text = len > MAX_BODY ? '' : (await r.text()).slice(0, MAX_BODY);
    return { status: r.status, ok: r.ok, url: r.url || String(url), headers: r.headers, text };
  } catch (e) {
    return { status: 0, ok: false, url: String(url), headers: new Headers(), text: '', error: e.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- robots.txt (RFC 9309: most specific group, longest match, Allow wins ties) ----------

export function parseRobots(txt) {
  const groups = [], sitemaps = [];
  let cur = null, lastWasAgent = false;
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) groups.push(cur = { agents: [], rules: [] });
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if (key === 'sitemap') {
      sitemaps.push(val);
    } else {
      lastWasAgent = false;
      if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  return { groups, sitemaps };
}

function pathMatches(pattern, path) {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + body + (anchored ? '$' : '')).test(path);
}

export function robotsAllows(robots, token, path = '/') {
  const t = token.toLowerCase();
  let groups = robots.groups.filter(g => g.agents.includes(t));
  if (!groups.length) groups = robots.groups.filter(g => g.agents.includes('*'));
  let best = null;
  for (const r of groups.flatMap(g => g.rules)) {
    if (!r.path || !pathMatches(r.path, path)) continue; // an empty Disallow allows everything
    const len = r.path.replace(/\$$/, '').length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}

// ---------- HTML helpers (regex is enough for these signals; Workers have no DOMParser) ----------

export function tags(html, name) {
  const out = [], re = new RegExp(`<${name}\\b([^>]*)>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    const attrs = {}, ar = /([^\s=/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let a;
    while ((a = ar.exec(m[1]))) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    out.push(attrs);
  }
  return out;
}

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

export function visibleWords(html) {
  const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  const text = decode(body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
  return text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

export function jsonLdNodes(html) {
  const nodes = [], re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m, invalid = 0;
  const walk = v => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    if (v['@type']) nodes.push(v);
    for (const k of Object.keys(v)) if (k !== '@context') walk(v[k]);
  };
  while ((m = re.exec(html))) {
    try { walk(JSON.parse(m[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim())); } catch { invalid++; }
  }
  return { nodes, invalid };
}

const typesOf = n => [].concat(n['@type']).map(t => String(t).toLowerCase().replace(/^.*[/#:]/, ''));

export function productStatus(nodes) {
  const products = nodes.filter(n => typesOf(n).some(t => t === 'product' || t === 'productgroup'));
  if (!products.length) return { status: 'missing' };
  const offers = products.flatMap(p => [].concat(p.offers || [], ...[].concat(p.hasVariant || []).map(v => [].concat(v.offers || []))));
  const priced = offers.find(o => o && (o.price != null || o.lowPrice != null) && o.priceCurrency);
  if (!priced) return { status: 'no-price', name: products[0].name };
  return { status: priced.availability ? 'complete' : 'no-availability', name: products[0].name };
}

export function detectPlatform(html, headers) {
  const h = html.slice(0, 400000);
  const powered = (headers.get('x-powered-by') || '') + ' ' + (headers.get('server') || '');
  // technical fingerprints only (asset paths, CDN hosts, theme globals): a page that merely mentions a platform is not built on it
  if (/cdn\.shopify\.com|Shopify\.theme|\.myshopify\.com\//i.test(h) || headers.get('x-shopid')) return 'Shopify';
  if (/plugins\/woocommerce\/|class="[^"]*\bwoocommerce\b/i.test(h)) return 'WooCommerce';
  if (/cdn\d*\.bigcommerce\.com|stencil-utils/i.test(h)) return 'BigCommerce';
  if (/netostatic\.com/i.test(h)) return 'Maropost (Neto)';
  if (/\/static\/[^"']*Magento_|mage\/cookies/i.test(h)) return 'Magento';
  if (/static\.wixstatic\.com/i.test(h)) return 'Wix';
  if (/static1\.squarespace\.com|squarespace-cdn\.com/i.test(h)) return 'Squarespace';
  if (/wp-content|wp-includes/i.test(h) || /wordpress/i.test(powered)) return 'WordPress';
  return null;
}

function findProductUrl(html, base) {
  for (const a of tags(html, 'a')) {
    if (!a.href) continue;
    let u;
    try { u = new URL(decode(a.href), base); } catch { continue; }
    if (u.hostname === base.hostname && /\/products?\/[^/?#]+\/?$/i.test(u.pathname) && !/\/products?\/(all|category|tag)s?\/?$/i.test(u.pathname)) return u;
  }
  return null;
}

function formsLabelled(html) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) || [];
  if (!forms.length) return null;
  const labelFor = new Set(tags(html, 'label').map(l => l.for).filter(Boolean));
  let fields = 0, unlabelled = 0;
  for (const f of forms) {
    for (const i of [...tags(f, 'input'), ...tags(f, 'select'), ...tags(f, 'textarea')]) {
      if (/^(hidden|submit|button|reset|image)$/i.test(i.type || '')) continue;
      fields++;
      if (!(i['aria-label'] || i['aria-labelledby'] || i.title || (i.id && labelFor.has(i.id)))) unlabelled++;
    }
  }
  // fields wrapped in <label> are labelled too; count them back
  const wrapped = (html.match(/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*?<(input|select|textarea)\b/gi) || []).length;
  return { fields, unlabelled: Math.max(0, unlabelled - wrapped) };
}

// challenge interstitials, not pages that merely load a captcha script for their forms
const isChallenge = r => [401, 403, 429, 503].includes(r.status) || /<title>\s*(Just a moment|Attention Required)|cf_chl_opt/i.test(r.text.slice(0, 20000));

// ---------- the audit ----------

export async function runAudit(target, { fetchImpl = fetch } = {}) {
  const page = await get(target.href, { fetchImpl });
  if (!page.ok || !/<html|<body|<head/i.test(page.text)) {
    return { ok: false, error: 'unreachable', message: [401, 403, 429, 503].includes(page.status)
      ? `The site’s security refused our test request (HTTP ${page.status}). Large retailers often block automated checks, so this one can’t be measured from outside.`
      : page.status ? `The site answered with HTTP ${page.status}.` : 'The site could not be reached.' };
  }
  const final = new URL(page.url);
  const origin = final.origin;
  const html = page.text;

  const [robotsRes, llms, ucp, bots] = await Promise.all([
    get(origin + '/robots.txt', { accept: 'text/plain,*/*', fetchImpl }),
    get(origin + '/llms.txt', { accept: 'text/plain,*/*', fetchImpl }),
    get(origin + '/.well-known/ucp', { accept: 'application/json', fetchImpl }),
    Promise.all(Object.entries(BOT_UAS).map(async ([name, ua]) => [name, await get(final.href, { ua, fetchImpl })])),
  ]);
  const robots = parseRobots(robotsRes.ok && !/<html/i.test(robotsRes.text) ? robotsRes.text : '');

  const ld = jsonLdNodes(html);
  const platform = detectPlatform(html, page.headers);
  let productPage = null, productLd = productStatus(ld.nodes);
  if (productLd.status === 'missing') {
    const pu = findProductUrl(html, final);
    if (pu) {
      const p = await get(pu.href, { fetchImpl });
      if (p.ok) { productPage = p.url; productLd = productStatus(jsonLdNodes(p.text).nodes); }
    }
  } else {
    productPage = final.href;
  }
  const isShop = ['Shopify', 'WooCommerce', 'BigCommerce', 'Maropost (Neto)', 'Magento'].includes(platform)
    || productLd.status !== 'missing' || !!productPage
    || /\/(cart|basket|checkout)\b|add to (cart|bag|basket|trolley)|mini-?cart|cart-?(badge|count|drawer|icon)|CartBadge|"priceCurrency"|\/media\/catalog\/product\//i.test(html);

  let sitemapOk = false;
  const smUrl = robots.sitemaps[0] || origin + '/sitemap.xml';
  const sm = await get(smUrl, { accept: 'application/xml,text/xml,*/*', fetchImpl });
  sitemapOk = sm.ok && /<(urlset|sitemapindex)\b/i.test(sm.text);

  const checks = [];
  const add = (group, id, weight, label, status, detail, fix = '') => checks.push({ group, id, weight, label, status, detail, fix });

  // 1. Can AI find you?
  add('find', 'https', 2, 'Secure connection (HTTPS)', final.protocol === 'https:' ? 'pass' : 'fail',
    final.protocol === 'https:' ? 'The site loads over HTTPS.' : 'The site loads without HTTPS.',
    'Serve every page over HTTPS. Assistants and browsers treat plain HTTP as untrusted.');

  const metaRobots = tags(html, 'meta').filter(m => /^(robots|googlebot)$/i.test(m.name || '')).map(m => m.content || '').join(',');
  const noindex = /noindex/i.test(metaRobots) || /noindex/i.test(page.headers.get('x-robots-tag') || '');
  add('find', 'indexable', 5, 'Allowed in search indexes', noindex ? 'fail' : 'pass',
    noindex ? 'The page tells search engines not to index it (noindex), so assistants will not cite it.' : 'No noindex instruction found.',
    'Remove the noindex meta tag or X-Robots-Tag header from public pages.');

  const blocked = SEARCH_BOTS.filter(([t]) => !robotsAllows(robots, t, final.pathname || '/'));
  add('find', 'ai-crawlers', 6, 'AI search crawlers allowed (robots.txt)',
    !blocked.length ? 'pass' : blocked.some(([t]) => t === 'Googlebot') || blocked.length > 2 ? 'fail' : 'warn',
    !blocked.length ? 'ChatGPT, Google, Bing/Copilot, Claude and Perplexity crawlers may read this page.'
      : 'Blocked in robots.txt: ' + blocked.map(([t, what]) => `${t} (${what})`).join(', ') + '.',
    'Allow the search and user crawlers in robots.txt. You can still block training-only crawlers such as GPTBot separately.');

  const base = isChallenge(page) ? null : page.status;
  const refused = base ? bots.filter(([, r]) => isChallenge(r) || (r.status && r.status !== base)).map(([n, r]) => `${n} (HTTP ${r.status || 'no response'})`) : [];
  add('find', 'firewall', base ? 4 : 0, 'Firewall lets assistants through', !base ? 'info' : refused.length ? 'warn' : 'pass',
    !base ? 'Even a normal browser request met a security challenge, so assistants were not compared.'
      : refused.length ? 'Requests identifying as AI assistants were refused or challenged: ' + refused.join(', ') + '. Visitors get the page; assistants may not, unless your firewall verifies the real bots by IP address.'
      : 'Requests identifying as ChatGPT and Perplexity received the same page as a browser.',
    'Check your CDN or firewall bot settings (e.g. Cloudflare “Block AI bots”, security plugins) and allow verified AI search and user agents.');

  add('find', 'sitemap', 2, 'XML sitemap', sitemapOk ? 'pass' : 'warn',
    sitemapOk ? `Sitemap found at ${smUrl}.` : 'No valid XML sitemap found in robots.txt or at /sitemap.xml.',
    'Publish an XML sitemap and reference it in robots.txt so crawlers discover every page.');

  const trainingBlocked = TRAINING_BOTS.filter(t => !robotsAllows(robots, t, '/'));
  add('find', 'training', 0, 'AI training crawlers', 'info',
    trainingBlocked.length ? `Blocked for training: ${trainingBlocked.join(', ')}. That is a valid choice and does not hide you from AI answers.`
      : 'Training crawlers are allowed. Blocking them is optional and does not affect AI answers.');

  // 2. Can AI understand you?
  const words = visibleWords(html);
  add('understand', 'raw-html', 5, 'Content readable without JavaScript', words >= 200 ? 'pass' : words >= 80 ? 'warn' : 'fail',
    `${words} words of readable text in the page source.` + (words < 200 ? ' Most AI crawlers do not run JavaScript, so content rendered in the browser stays invisible to them.' : ''),
    'Render key content (headings, descriptions, prices) on the server or at build time, not only in the browser.');

  const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const desc = (tags(html, 'meta').find(m => (m.name || '').toLowerCase() === 'description') || {}).content || '';
  add('understand', 'title-description', 2, 'Page title and description', title && desc ? 'pass' : 'warn',
    title && desc ? `“${decode(title).slice(0, 70)}”` : `Missing: ${[!title && 'title', !desc && 'meta description'].filter(Boolean).join(' and ')}.`,
    'Give every page a specific title and a one-sentence description of what it offers.');

  const orgNode = ld.nodes.find(n => typesOf(n).some(t => ORG_TYPES.includes(t)));
  add('understand', 'organisation', 3, 'Business identity in structured data', orgNode ? 'pass' : 'warn',
    orgNode ? `Found ${typesOf(orgNode)[0]} markup${orgNode.name ? ` for “${orgNode.name}”` : ''}.` : 'No Organization or LocalBusiness structured data found.' + (ld.invalid ? ` ${ld.invalid} JSON-LD block(s) could not be parsed.` : ''),
    'Add Organization or LocalBusiness JSON-LD: name, logo, contact details, address and service area.');

  if (isShop) {
    const P = {
      complete: ['pass', `Product markup with price, currency and availability${productLd.name ? ` (“${String(productLd.name).slice(0, 50)}”)` : ''}.`],
      'no-availability': ['warn', 'Product markup has a price but no availability, so assistants cannot tell whether it is in stock.'],
      'no-price': ['warn', 'Product markup is present but has no price and currency.'],
      missing: productPage ? ['fail', 'No Product structured data found on a product page.'] : ['info', 'No product page linked from this page to check. Test a product URL directly for this part.'],
    }[productLd.status];
    add('understand', 'product', P[0] === 'info' ? 0 : 6, 'Product data assistants can compare', P[0], P[1] + (productPage && productPage !== final.href ? ` Checked ${productPage}.` : ''),
      'Mark up every product with Product + Offer JSON-LD: name, image, price, priceCurrency (AUD), availability, GTIN/brand, reviews.');
  }

  const og = tags(html, 'meta').filter(m => /^og:(title|image)$/i.test(m.property || m.name || ''));
  add('understand', 'open-graph', 1, 'Preview cards (Open Graph)', og.length >= 2 ? 'pass' : 'warn',
    og.length >= 2 ? 'og:title and og:image are set.' : 'og:title or og:image is missing.', 'Add og:title, og:description and og:image to every page.');

  const lang = (tags(html, 'html')[0] || {}).lang || '';
  add('understand', 'lang', 1, 'Page language declared', lang ? 'pass' : 'warn', lang ? `lang="${lang}"` : 'The <html> element has no lang attribute.',
    'Declare the language, e.g. <html lang="en-AU">.');

  const llmsOk = llms.ok && !/<html/i.test(llms.text) && llms.text.trim().length > 20;
  add('understand', 'llms-txt', 1, 'llms.txt summary for AI', llmsOk ? 'pass' : 'warn',
    llmsOk ? 'llms.txt found.' : 'No /llms.txt found. It is an emerging convention, cheap to add, not yet used by every assistant.',
    'Publish /llms.txt: a short Markdown summary of who you are, what you sell and your key pages.');

  // 3. Can AI act on your behalf?
  let ucpProfile = null;
  try { ucpProfile = ucp.ok ? JSON.parse(ucp.text) : null; } catch { /* not JSON */ }
  if (isShop) {
    const ok = ucpProfile && typeof ucpProfile === 'object' && (ucpProfile.capabilities || ucpProfile.services || ucpProfile.ucp);
    add('act', 'ucp', 4, 'Agentic checkout profile (UCP)', ok ? 'pass' : 'warn',
      ok ? 'A Universal Commerce Protocol profile is published at /.well-known/ucp.'
        : 'No Universal Commerce Protocol profile at /.well-known/ucp. Google’s checkout inside AI Mode and Gemini runs on UCP: live in Australia with launch retailers, opening to more merchants through Merchant Center.'
          + (platform === 'Shopify' ? ' On Shopify this is provided through Agentic Storefronts: check it is switched on.' : ''),
      'Prepare a UCP-ready catalogue and checkout so assistants can complete a purchase, not just recommend you.');
  }

  const webmcp = /<form\b[^>]*\btoolname\s*=/i.test(html) ? 'declarative' : /navigator\.modelContext|registerTool\s*\(/.test(html) ? 'imperative' : null;
  add('act', 'webmcp', 2, 'Actions exposed to browser agents (WebMCP)', webmcp ? 'pass' : 'warn',
    webmcp ? `WebMCP tools found (${webmcp} API).` : 'No WebMCP tools found. WebMCP is a new browser standard (in Chrome trials) that lets agents search, book or add to cart directly instead of guessing buttons.',
    'Expose your key actions (search, enquire, book, add to cart) as WebMCP tools.');

  const forms = formsLabelled(html);
  if (forms && forms.fields) {
    add('act', 'forms', 2, 'Form fields agents can identify', !forms.unlabelled ? 'pass' : 'warn',
      !forms.unlabelled ? `All ${forms.fields} form fields have accessible labels.` : `${forms.unlabelled} of ${forms.fields} form fields have no accessible label.`,
      'Give every form field a <label> or aria-label. Agents (and screen readers) rely on these names.');
  }

  const scored = checks.filter(c => c.weight && c.status !== 'info');
  const total = scored.reduce((s, c) => s + c.weight, 0);
  const got = scored.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  const score = total ? Math.round((100 * got) / total) : 0;
  let grade = score >= 85 ? 'Agent-ready' : score >= 65 ? 'Agent-aware' : score >= 40 ? 'Hard for agents' : 'Invisible to agents';
  // a shop is only agent-ready once its product data has been seen to pass
  if (isShop && grade === 'Agent-ready' && !checks.some(c => c.id === 'product' && c.status === 'pass')) grade = 'Agent-aware';

  return { ok: true, url: target.href, finalUrl: final.href, checkedAt: new Date().toISOString(), platform, isShop, productPage, score, grade, checks };
}

// ---------- HTTP ----------

function cors(origin) {
  const ok = ALLOWED_ORIGINS.some(re => re.test(origin));
  return { 'Access-Control-Allow-Origin': ok ? origin : 'https://australianweb.agency', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('origin') || '';
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (new URL(req.url).pathname !== '/agent-test') return json({ ok: false, error: 'not_found' }, 404, h);
    if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, h);
    if (origin && !ALLOWED_ORIGINS.some(re => re.test(origin))) return json({ ok: false, error: 'forbidden_origin' }, 403, h);
    if (env && env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: req.headers.get('cf-connecting-ip') || 'unknown' });
      if (!success) return json({ ok: false, error: 'rate_limited', message: 'Too many tests from your connection. Try again in a minute.' }, 429, h);
    }
    let body;
    try { body = await req.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400, h); }
    const target = normalizeUrl(body && body.url);
    if (!target) return json({ ok: false, error: 'invalid_url', message: 'Enter a public website address, e.g. yourstore.com.au' }, 400, h);

    const key = new Request('https://agent-test.cache/' + encodeURIComponent(target.href));
    const hit = await caches.default.match(key);
    if (hit) return json({ ...(await hit.json()), cached: true }, 200, h);
    const report = await runAudit(target);
    if (report.ok) ctx.waitUntil(caches.default.put(key, new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } })));
    return json(report, report.ok ? 200 : 502, h);
  },
};
