"""Renders one AWA service page from its copy JSON (_tools/services/<slug>.json) plus the per-service setup below."""
import html
import json

E = html.escape
BASE = 'https://australianweb.agency/'

# Data for the order pipeline reused on several pages (see pipeline.js for the JSON shape).
ORDER = {"tab": "Order paid", "label": "Order paid automation", "steps": [
    ["card", "Order paid", "Shopify · #1042 · $189.00", "0.0s"], ["receipt", "Invoice created", "Xero · INV-1042", "0.6s"],
    ["box", "Label printed", "Australia Post · eParcel", "1.3s"], ["stack", "Stock updated", "Inventory · 23 → 22", "1.9s"],
    ["message", "Customer notified", "Email + SMS · tracking link", "2.4s"]]}
ENQUIRY = {"tab": "New enquiry", "label": "New enquiry automation", "steps": [
    ["mail", "Enquiry received", "Website form · fit-out quote", "0.0s"], ["users", "Deal created", "HubSpot · stage: new lead", "0.5s"],
    ["sparkle", "Reply drafted", "AI assistant · ready for review", "1.8s"], ["calendar", "Follow-up booked", "Calendar · Tue 10:00", "2.2s"],
    ["bell", "Team notified", "Slack · #sales", "2.5s"]]}
PRICE = {"tab": "Price change", "label": "Price change automation", "steps": [
    ["tag", "Price changed", "Store admin · $249 → $219", "0.0s"], ["refresh", "Feeds refreshed", "Google Merchant Center", "0.9s"],
    ["code", "Product data updated", "Product + Offer JSON-LD", "1.2s"], ["chat", "Visible to AI assistants", "ChatGPT · Gemini · Perplexity", "1.6s"],
    ["chart", "Change tracked", "GA4 · price test", "2.0s"]]}
BOOKING = {"tab": "Booking made", "label": "Booking automation", "steps": [
    ["calendar", "Booking made", "Website · Thu 2:30 pm", "0.0s"], ["users", "Client record updated", "CRM · returning client", "0.4s"],
    ["card", "Deposit taken", "Stripe · A$50", "0.9s"], ["message", "Reminder scheduled", "SMS · 24 h before", "1.3s"],
    ["chart", "Review requested", "Email · after visit", "1.8s"]]}
AI_JOURNEY = {"tab": "AI shopping journey", "label": "How an AI assistant buys from a store", "steps": [
    ["search", "Shopper asks", "“Eco surfboard under $1,000?”", "0.0s"], ["globe", "Assistant reads sites", "Crawlers allowed · page loads", "0.7s"],
    ["code", "Compares products", "Price · stock · reviews", "1.4s"], ["cart", "Checks out", "UCP checkout in AI Mode", "2.2s"],
    ["receipt", "Order in your store", "Same order flow as the website", "2.6s"]]}


def pipeline(scenarios, kicker='Example automation · running', note='Illustrative timings. Real flows are built around your tools.'):
    tabs = '<div class="pl-tabs" role="tablist" aria-label="Example automations"></div>' if len(scenarios) > 1 else ''
    first = ''.join(f'<li class="pl-step is-active"><span class="pl-icon"></span><span class="pl-time mono">{E(t)}</span><strong class="pl-title">{E(a)}</strong>'
                    f'<span class="pl-detail mono">{E(d)}</span></li>' for _, a, d, t in scenarios[0]['steps'])
    data = json.dumps(scenarios, ensure_ascii=False).replace('</', '<\\/')
    return (f'<div class="pipeline" data-pipeline><div class="pl-head"><p class="mono pl-kicker">{E(kicker)}</p>{tabs}</div>'
            f'<div class="pl-track"><ol class="pl-steps">{first}</ol></div><p class="pl-note mono">{E(note)}</p>'
            f'<script type="application/json" class="pl-data">{data}</script></div>')


def demo(name):
    return f'<div class="dm" data-demo="{name}"></div>'


TEST_FORM = ('<form class="svc-test" action="agent-test.html" method="get" toolname="run_agent_readiness_test" '
             'tooldescription="Test whether AI assistants can find, understand and act on a public website. Opens the report page.">'
             '<label for="svc-url">Test your own site now. It’s free and takes about 20 seconds.</label>'
             '<div class="svc-test-row"><input id="svc-url" name="url" type="text" inputmode="url" autocomplete="url" spellcheck="false" placeholder="yourbusiness.com.au" required>'
             '<button class="btn btn-lime" type="submit">Run the test</button></div></form>')

WORK_CARDS = [
    ('demos/v-astra/', 'demos/v-astra/cover.webp', 'V-ASTRA', '3D motion · travel'),
    ('demos/altovia/', 'demos/altovia/media/web/poster.jpg', 'Altovia', 'Landing · private charter'),
    ('demos/kernova/', 'demos/kernova/cover.jpg', 'Kernova', 'Landing · industrial tech'),
    ('demos/velora/', 'demos/velora/cover.jpg', 'Velora', 'Landing · specialty coffee'),
]
WORK = ('<div class="work-grid">' + ''.join(
    f'<a class="work-card" href="{h}"><img src="{i}" alt="" width="960" height="640" loading="lazy" decoding="async">'
    f'<span class="work-meta"><span>{E(n)}</span><span class="mono">{E(m)}</span></span></a>' for h, i, n, m in WORK_CARDS) + '</div>'
    '<p class="fineprint">Working concepts that show the craft, not client case studies. <a class="text-link" href="work.html">All 54 live demos ↗</a></p>')

REPORT = '''<div class="svc-report" aria-label="Example monthly care report">
  <div class="svc-report-head"><span class="mono">Monthly report · example</span><span class="mono">October</span></div>
  <ul>
    <li><b>Uptime</b><span>99.98% · one 4-minute outage, fixed automatically</span></li>
    <li><b>Speed</b><span>Mobile LCP 1.9 s · all Core Web Vitals in the green</span></li>
    <li><b>Security</b><span>Plugins and packages updated · SSL renewed · headers A</span></li>
    <li><b>Search</b><span>Three pages lost clicks · titles and copy refreshed</span></li>
    <li><b>AI visibility</b><span>Agent readiness 100/100 · product feed re-checked</span></li>
    <li><b>Next month</b><span>Test a shorter checkout · add FAQ structured data</span></li>
  </ul>
  <p class="mono muted">Illustrative example. Your report covers your own numbers.</p>
</div>'''

INTEGRATIONS = [
    ('Commerce', 'Shopify · WooCommerce · BigCommerce · Medusa'), ('Accounting', 'Xero · MYOB · QuickBooks Online · Reckon'),
    ('Shipping', 'Australia Post · StarTrack · Sendle · Couriers Please · Aramex'), ('Payments', 'Stripe · Square · PayPal · Afterpay · Zip · Tyro'),
    ('CRM', 'HubSpot · Salesforce · Pipedrive · Zoho CRM'), ('Point of sale', 'Square · Shopify POS · Lightspeed · Zeller'),
    ('Email & SMS', 'Klaviyo · Mailchimp · Campaign Monitor · MessageMedia'), ('Bookings', 'Cliniko · Timely · Fresha · Calendly'),
    ('AI', 'OpenAI · Anthropic Claude · Google Gemini'), ('Glue', 'n8n · webhooks · REST and GraphQL APIs · Cloudflare Workers'),
]
INTEGRATION_MAP = ('<div class="svc-integrations">' + ''.join(f'<div><p class="mono">{E(k)}</p><p>{E(v)}</p></div>' for k, v in INTEGRATIONS) +
                   '</div><p class="fineprint">Examples of tools Australian businesses commonly run. If it has an API or exports data, we can usually connect it.</p>')

SETUP = {
    'ai-visibility': dict(no='01', hero=demo('ai-answer'), cta2=('agent-test.html', 'Run the free test'),
                          extra=TEST_FORM + pipeline([AI_JOURNEY], kicker='Agentic commerce · example', note='Illustrative journey. Checkout in AI Mode depends on Google’s rollout for your store.'),
                          proof='This site scores 100/100 on our free AI Agent Readiness Test, which checks crawler access, firewalls, structured data, agentic checkout (UCP) and WebMCP.',
                          proof_link=('agent-test.html?url=australianweb.agency', 'Check it yourself ↗')),
    'websites': dict(no='02', hero=demo('speed-race'), cta2=('work.html', 'See 54 live demos'), extra=WORK,
                     proof='Mobile PageSpeed 69 → 97 and Largest Contentful Paint 4.0 s → 2.4 s: a live online store against our rebuild, measured the same morning (Marina Yacht Sport, Europe, 2026).',
                     proof_link=('work.html', 'Explore the work ↗')),
    'online-stores': dict(no='03', band=demo('product-lens'), cta2=('agent-test.html', 'Test your store free'),
                          extra=demo('platform-chooser') + pipeline([ORDER, PRICE]),
                          proof='We are building a headless Medusa store for a European yacht-equipment retailer, with Stripe checkout, invoicing and shipping labels connected. Mobile PageSpeed: 69 for the old store, 97 for the new one.',
                          proof_link=('websites.html', 'How we build for speed ↗')),
    'automation': dict(no='04', band=pipeline([ORDER, ENQUIRY, PRICE, BOOKING]), cta2=('#calculator', 'Estimate your savings'),
                       extra='<div id="calculator">' + demo('savings-calc') + '</div>' + INTEGRATION_MAP,
                       proof='Automations we already run in production: invoicing and shipping labels for an online store, enquiry routing, and scheduled monthly security rescans for a compliance platform.',
                       proof_link=('ai-assistants.html', 'Add AI to your workflows ↗')),
    'ai-assistants': dict(no='05', hero=demo('chat-demo'), cta2=('#document-ai', 'See document processing'),
                          extra='<div id="document-ai">' + demo('doc-extract') + '</div>',
                          proof='Our own website assistant answers from our content, and our AI-assisted pipeline audited and rewrote 152 website templates, with every change checked before it shipped.',
                          proof_link=('automation.html', 'Connect it to your tools ↗')),
    'care': dict(no='06', hero=demo('monitor'), cta2=('agent-test.html', 'Check your site free'), extra=REPORT,
                 proof='We run the same monitoring on our own sites: uptime, Core Web Vitals, security headers and AI agent readiness, with scheduled monthly rescans for a compliance platform.',
                 proof_link=('agent-test.html?url=australianweb.agency', 'See our live score ↗')),
}


def render(slug, c):
    from build import SERVICES  # noqa: avoid a circular import at module load
    s = SETUP[slug]
    name = dict(SERVICES)[slug]
    url = f'{BASE}{slug}.html'
    title_lines = [E(x.strip()) for x in c['hero_title'].split('|')]
    h1 = title_lines[0] + (f'<br><span class="hl">{" ".join(title_lines[1:])}</span>' if len(title_lines) > 1 else '')
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "ProfessionalService", "@id": f"{BASE}#awa", "name": "AWA — Australian Web Agency", "url": BASE, "email": "info@australianweb.agency",
         "areaServed": {"@type": "Country", "name": "Australia"}},
        {"@type": "Service", "@id": f"{url}#service", "name": name, "serviceType": name, "description": c['meta_description'], "url": url,
         "provider": {"@id": f"{BASE}#awa"}, "areaServed": {"@type": "Country", "name": "Australia"}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": f['q'], "acceptedAnswer": {"@type": "Answer", "text": f['a']}} for f in c['faq']]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
                                                        {"@type": "ListItem", "position": 2, "name": name, "item": url}]}]}
    hero_demo = s.get('hero')
    hero_inner = (f'<div class="hero-split"><div>{{copy}}</div><div class="svc-hero-demo">{hero_demo}</div></div>' if hero_demo else '{copy}')
    copy = (f'<p class="label"><span class="dot" aria-hidden="true"></span>Service {s["no"]} · {E(name)}</p>'
            f'<h1 id="svc-title">{h1}</h1><p class="lead">{E(c["hero_lead"])}</p>'
            f'<div class="hero-actions"><a class="btn btn-lime" href="#contact">Let’s talk <span aria-hidden="true">↗</span></a>'
            f'<a class="btn btn-ghost" href="{s["cta2"][0]}">{E(s["cta2"][1])}</a></div>')
    band = f'<section class="svc-band" aria-label="Interactive example"><div class="wrap">{s["band"]}</div></section>' if s.get('band') else ''
    included = ''.join(f'<article class="svc-item"><span class="mono">{i + 1:02d}</span><h3>{E(x["title"])}</h3><p>{E(x["text"])}</p></article>'
                       for i, x in enumerate(c['included']))
    cases = ''.join(f'<article class="svc-case"><p class="mono svc-case-who">{E(u["who"])}</p>'
                    f'<dl><dt>The situation</dt><dd>{E(u["situation"])}</dd><dt>What we do</dt><dd>{E(u["what_we_do"])}</dd>'
                    f'<dt>The outcome</dt><dd>{E(u["outcome"])}</dd></dl></article>' for u in c['use_cases'])
    steps = ''.join(f'<li><span class="mono">{i + 1:02d}</span><h3>{E(x["title"])}</h3><p>{E(x["text"])}</p></li>' for i, x in enumerate(c['steps']))
    faq = ''.join(f'<details class="svc-faq-item"><summary>{E(f["q"])}</summary><p>{E(f["a"])}</p></details>' for f in c['faq'])
    related = ''.join(f'<a class="svc-related-card" href="{r}.html"><span class="mono">{SETUP[r]["no"]}</span><span>{E(n)}</span><span aria-hidden="true">↗</span></a>'
                      for r, n in SERVICES if r != slug)
    return f'''<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{E(c["meta_title"])}</title>
  <meta name="description" content="{E(c["meta_description"])}">
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#0e1c27">
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="awa.css">
  <link rel="stylesheet" href="services.css">
  <link rel="stylesheet" href="demos.css">
  <script src="awa.js" defer></script>
  <script src="pipeline.js" defer></script>
  <script src="demos.js" defer></script>
  <meta property="og:image" content="{BASE}og.jpg">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{E(c["meta_title"])}">
  <meta property="og:description" content="{E(c["meta_description"])}">
  <meta property="og:locale" content="en_AU">
  <meta property="og:site_name" content="AWA — Australian Web Agency">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False, separators=(',', ':'))}</script>
</head>
<body>
<!-- header -->
<!-- /header -->
<main id="main" tabindex="-1">
<section class="page-hero svc-hero" aria-labelledby="svc-title"><div class="wrap">{hero_inner.replace('{copy}', copy)}</div></section>
{band}
<section class="section" aria-labelledby="included-title"><div class="wrap">
  <div class="section-head"><p class="label">What’s included</p><h2 id="included-title">{E(name)}.</h2><p class="section-intro">{E(c["included_intro"])}</p></div>
  <div class="svc-items">{included}</div>
</div></section>
<section class="section svc-demo" aria-labelledby="demo-title"><div class="wrap">
  <div class="section-head"><p class="label">See it in action</p><h2 id="demo-title">{E(c["demo_title"])}</h2><p class="section-intro">{E(c["demo_text"])}</p></div>
  {s["extra"]}
</div></section>
<section class="section svc-cases-section" aria-labelledby="cases-title"><div class="wrap">
  <div class="section-head"><p class="label">Use cases</p><h2 id="cases-title">Where it makes a difference.</h2><p class="section-intro">Typical Australian businesses we build this for. Examples, not client stories.</p></div>
  <div class="svc-cases">{cases}</div>
</div></section>
<section class="proof svc-proof" aria-label="Proof"><div class="wrap svc-proof-inner"><p>{E(s["proof"])}</p><a class="text-link" href="{s["proof_link"][0]}">{E(s["proof_link"][1])}</a></div></section>
<section class="section process" aria-labelledby="steps-title"><div class="wrap">
  <div class="section-head"><p class="label">How it works</p><h2 id="steps-title">Clear steps. No surprises.</h2></div>
  <ol class="steps">{steps}</ol>
</div></section>
<section class="section svc-faq-section" aria-labelledby="faq-title"><div class="wrap svc-faq-grid">
  <div><p class="label">Questions</p><h2 id="faq-title">Good to know.</h2></div>
  <div class="svc-faq">{faq}</div>
</div></section>
<section class="svc-cta" aria-labelledby="cta-title"><div class="wrap"><div class="svc-cta-box">
  <div><h2 id="cta-title">{E(c["cta_title"])}</h2><p>{E(c["cta_text"])}</p></div>
  <div class="hero-actions"><a class="btn btn-lime" href="#contact">Let’s talk <span aria-hidden="true">↗</span></a><a class="btn btn-ghost" href="{s["cta2"][0]}">{E(s["cta2"][1])}</a></div>
</div></div></section>
<section class="section svc-related-section" aria-labelledby="related-title"><div class="wrap">
  <div class="section-head"><p class="label">Related services</p><h2 id="related-title">The rest of the picture.</h2><p class="section-intro">Most projects touch more than one of these. One conversation covers all of them.</p></div>
  <div class="svc-related">{related}</div>
</div></section>
<!-- contact -->
<!-- /contact -->
</main>
<!-- footer -->
<!-- /footer -->
</body>
</html>
'''
