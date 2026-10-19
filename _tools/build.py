"""AWA page builder. Keeps the shared header, contact section and footer identical on every page and renders the
service pages from _tools/services/<slug>.json.  usage: python _tools/build.py

Shared blocks live between <!-- header -->...<!-- /header -->, <!-- contact -->...<!-- /contact --> and
<!-- footer -->...<!-- /footer --> markers; this script rewrites those blocks in place on every page listed in PAGES.
Stylesheet links on those pages are inlined as <style data-src="x.css"> blocks, so edit the .css files and rebuild.
"""
import html
import commerce_pages
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERVICES = [  # slug, nav name
    ('ai-visibility', 'AI visibility & agent readiness'),
    ('websites', 'Websites & web apps'),
    ('online-stores', 'Online stores & agentic commerce'),
    ('automation', 'Automation & integrations'),
    ('ai-assistants', 'AI assistants & internal tools'),
    ('care', 'Care, hosting & growth'),
]
PAGES = commerce_pages.PAGES + ['index.html', 'work.html', 'agent-test.html', 'pilot.html', 'privacy.html', 'brief.html'] + [f'{s}.html' for s, _ in SERVICES]
# every "start a brief" button points here (we work in writing; no calls)
BOOKING = 'brief.html'


def header(page):
    home = page == 'index.html'
    at = (lambda frag: f'#{frag}') if home else (lambda frag: f'index.html#{frag}')
    cur = lambda href: ' aria-current="page"' if href == page else ''
    drop = ''.join(f'<a href="{s}.html"{cur(s + ".html")}>{html.escape(n)}</a>' for s, n in SERVICES)
    promo = '<div class="promo-bar"><div class="wrap promo-inner"><p><span class="mono">NEW / NEOCART × AWA</span> Free shop software. A$999 setup + GST. Hosting &amp; domain separate.</p><a href="free-online-store.html">Explore the offer ↗</a></div></div>'
    return f'''<!-- header -->
<script>document.documentElement.classList.add('js')</script>
<a class="skip" href="#main">Skip to content</a>
<script src="awa-stats.js" defer></script>
{promo}
<header class="site-header"><div class="wrap header-inner">
  <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">awa<span>.</span></span><span class="brand-name">Australian<br>Web Agency</span></a>
  <button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false">Menu <span class="menu-lines" aria-hidden="true"><i></i><i></i></span></button>
  <nav class="site-nav" id="site-nav" aria-label="Main navigation">
    <div class="nav-drop"><a href="{at('services')}">Services</a><div class="nav-drop-menu">{drop}</div></div>
    <a href="{at('connected')}">Systems</a><a href="{at('team')}">How we work</a><a href="work.html"{cur('work.html')}>Work</a>
    <a class="nav-shop" href="free-online-store.html"{cur('free-online-store.html')}>Free store <small>A$0</small></a>
    <a href="journal.html"{cur('journal.html')}>Journal</a>
    <a class="btn btn-lime" href="brief.html" data-track="brief_start">Start a brief <span aria-hidden="true">↗</span></a>
  </nav>
</div></header>
<!-- /header -->'''


CONTACT = f'''<!-- contact -->
<section class="contact" id="contact" aria-labelledby="contact-title"><div class="wrap contact-grid">
  <div><p class="label">Next step</p><h2 id="contact-title">Let’s build what’s next.</h2></div>
  <div class="contact-actions">
    <p>We work in writing, so every decision is on record and time zones don’t matter. Send a five-minute brief and get a written plan and a fixed quote within two business days, from Chris, not a sales team.</p>
    <a class="btn btn-lime contact-book" href="{BOOKING}" data-track="brief_start">Start your project brief <span aria-hidden="true">↗</span></a>
    <a class="contact-mail" href="mailto:info@australianweb.agency">info@australianweb.agency</a>
    <a class="text-link" href="agent-test.html">Or start with the free AI test ↗</a>
  </div>
</div></section>
<!-- /contact -->'''


def footer(page):
    svc = ''.join(f'<a href="{s}.html">{html.escape(n)}</a>' for s, n in SERVICES)
    return f'''<!-- footer -->
{commerce_pages.recommendations(page)}
<footer class="site-footer"><div class="wrap footer-grid">
  <div class="footer-brand"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">awa<span>.</span></span><span class="brand-name">Australian<br>Web Agency</span></a><p>AI-native web studio. One senior developer, an AI engineering team and one point of contact, Australia-wide.</p></div>
  <nav class="footer-col" aria-label="Services"><p class="mono">Services</p>{svc}</nav>
  <nav class="footer-col" aria-label="Studio"><p class="mono">Studio</p><a href="work.html">Work</a><a href="index.html#team">How we work</a><a href="agent-test.html">Free AI test</a><a href="free-online-store.html">Free online store</a><a href="journal.html">Journal</a><a href="pilot.html">Founding clients</a><a href="privacy.html">Privacy</a><a href="mailto:info@australianweb.agency">info@australianweb.agency</a></nav>
  <p class="footer-copy mono">© <span data-year>2026</span> Australian Web Agency · AI-native by design</p>
</div></footer>
<!-- /footer -->'''


def replace_block(s, name, block):
    pat = re.compile(rf'<!-- {name} -->.*?<!-- /{name} -->', re.S)
    if not pat.search(s):
        raise SystemExit(f'missing <!-- {name} --> markers')
    return pat.sub(lambda m: block, s, count=1)


CSS_TAG = re.compile(r'<link rel="stylesheet" href="([\w-]+\.css)">|<style data-src="([\w-]+\.css)">.*?</style>', re.S)


def inline_css(s):
    # ponytail: whole stylesheets inlined (about 10 KB gzipped per page) instead of critical-path extraction;
    # saves one to three render-blocking requests. Edit the .css files, then rebuild.
    def css(m):
        name = m.group(1) or m.group(2)
        code = re.sub(r'/\*.*?\*/', '', (ROOT / name).read_text('utf-8'), flags=re.S)
        return f'<style data-src="{name}">{re.sub(r"\s*\n\s*", chr(10), code).strip()}</style>'
    return CSS_TAG.sub(css, s)


def refresh_shared(page):
    p = ROOT / page
    if not p.exists():
        return
    s = p.read_text('utf-8')
    s = re.sub(r'href="brief\.html[^"]*"(\s+data-track="brief_start")|href="[^"]*"(\s+data-track="book")', lambda m: m.group(0) if m.group(1) else f'href="{BOOKING}"' + m.group(2), s)
    s = replace_block(s, 'header', header(page))
    s = replace_block(s, 'footer', footer(page))
    if '<!-- contact -->' in s:
        s = replace_block(s, 'contact', CONTACT)
    if 'data-src="signal.css"' not in s and 'href="signal.css"' not in s:
        s = s.replace('</head>', '<link rel="stylesheet" href="signal.css">\n</head>', 1)
    s = s.replace('<meta name="theme-color" content="#0e1c27">', '<meta name="theme-color" content="#191a18">')
    # Keep social previews aligned with the shared art direction.
    if page not in commerce_pages.PAGES:
        s = s.replace('https://australianweb.agency/og.jpg', 'https://australianweb.agency/assets/signal-wave.webp')
        s = s.replace('<meta property="og:image:width" content="1200">', '<meta property="og:image:width" content="1536">')
        s = s.replace('<meta property="og:image:height" content="630">', '<meta property="og:image:height" content="1024">')
    p.write_text(inline_css(s), 'utf-8')


if __name__ == '__main__':
    import service_page  # noqa: E402  (renders the service pages; lives next to this file)
    commerce_pages.render_all()
    for slug, _ in SERVICES:
        src = ROOT / '_tools' / 'services' / f'{slug}.json'
        if src.exists():
            (ROOT / f'{slug}.html').write_text(service_page.render(slug, json.loads(src.read_text('utf-8'))), 'utf-8')
    for page in PAGES:
        refresh_shared(page)
    print('built')
