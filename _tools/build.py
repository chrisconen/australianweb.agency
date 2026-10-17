"""AWA page builder. Keeps the shared header, contact section and footer identical on every page and renders the
service pages from _tools/services/<slug>.json.  usage: python _tools/build.py

Shared blocks live between <!-- header -->...<!-- /header -->, <!-- contact -->...<!-- /contact --> and
<!-- footer -->...<!-- /footer --> markers; this script rewrites those blocks in place on every page listed in PAGES.
"""
import html
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
PAGES = ['index.html', 'work.html', 'agent-test.html', 'pilot.html', 'privacy.html', 'brief.html'] + [f'{s}.html' for s, _ in SERVICES]
# every "start a brief" button points here (we work in writing; no calls)
BOOKING = 'brief.html'


def header(page):
    home = page == 'index.html'
    at = (lambda frag: f'#{frag}') if home else (lambda frag: f'index.html#{frag}')
    cur = lambda href: ' aria-current="page"' if href == page else ''
    drop = ''.join(f'<a href="{s}.html"{cur(s + ".html")}>{html.escape(n)}</a>' for s, n in SERVICES)
    promo = '' if page == 'pilot.html' else ('<div class="promo-bar"><div class="wrap promo-inner"><p><span class="mono">Founding clients</span> '
             '30% off for five Australian businesses, plus three months of care free.</p>'
             '<a href="pilot.html" data-track="pilot">See the offer <span aria-hidden="true">↗</span></a></div></div>')
    return f'''<!-- header -->
<a class="skip" href="#main">Skip to content</a>
<script src="awa-stats.js" defer></script>
{promo}
<header class="site-header"><div class="wrap header-inner">
  <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">awa<span>.</span></span><span class="brand-name">Australian<br>Web Agency</span></a>
  <button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false">Menu <span class="menu-lines" aria-hidden="true"><i></i><i></i></span></button>
  <nav class="site-nav" id="site-nav" aria-label="Main navigation">
    <div class="nav-drop"><a href="{at('services')}">Services</a><div class="nav-drop-menu">{drop}</div></div>
    <a href="{at('connected')}">Systems</a><a href="{at('team')}">How we work</a><a href="work.html"{cur('work.html')}>Work</a>
    <a class="nav-test" href="agent-test.html"{cur('agent-test.html')}>Free AI test</a>
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


def footer():
    svc = ''.join(f'<a href="{s}.html">{html.escape(n)}</a>' for s, n in SERVICES)
    return f'''<!-- footer -->
<footer class="site-footer"><div class="wrap footer-grid">
  <div class="footer-brand"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">awa<span>.</span></span><span class="brand-name">Australian<br>Web Agency</span></a><p>AI-native web studio. One senior developer, an AI engineering team and one point of contact, Australia-wide.</p></div>
  <nav class="footer-col" aria-label="Services"><p class="mono">Services</p>{svc}</nav>
  <nav class="footer-col" aria-label="Studio"><p class="mono">Studio</p><a href="work.html">Work</a><a href="index.html#team">How we work</a><a href="agent-test.html">Free AI test</a><a href="pilot.html">Founding clients</a><a href="privacy.html">Privacy</a><a href="mailto:info@australianweb.agency">info@australianweb.agency</a></nav>
  <p class="footer-copy mono">© <span data-year>2026</span> Australian Web Agency · AI-native by design</p>
</div></footer>
<!-- /footer -->'''


def replace_block(s, name, block):
    pat = re.compile(rf'<!-- {name} -->.*?<!-- /{name} -->', re.S)
    if not pat.search(s):
        raise SystemExit(f'missing <!-- {name} --> markers')
    return pat.sub(lambda m: block, s, count=1)


def refresh_shared(page):
    p = ROOT / page
    if not p.exists():
        return
    s = p.read_text('utf-8')
    s = re.sub(r'href="brief\.html[^"]*"(\s+data-track="brief_start")|href="[^"]*"(\s+data-track="book")', lambda m: m.group(0) if m.group(1) else f'href="{BOOKING}"' + m.group(2), s)
    s = replace_block(s, 'header', header(page))
    s = replace_block(s, 'footer', footer())
    if '<!-- contact -->' in s:
        s = replace_block(s, 'contact', CONTACT)
    p.write_text(s, 'utf-8')


if __name__ == '__main__':
    import service_page  # noqa: E402  (renders the service pages; lives next to this file)
    for slug, _ in SERVICES:
        src = ROOT / '_tools' / 'services' / f'{slug}.json'
        if src.exists():
            (ROOT / f'{slug}.html').write_text(service_page.render(slug, json.loads(src.read_text('utf-8'))), 'utf-8')
    for page in PAGES:
        refresh_shared(page)
    print('built')
