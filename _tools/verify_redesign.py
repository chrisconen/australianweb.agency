"""AWA agency regression audit. Start localhost:8766, then run this file.

Requires Playwright + BeautifulSoup. External requests are blocked. Brief
error handling is tested against an intercepted fixture, never a real inbox.
"""
from pathlib import Path
from urllib.parse import urlsplit,unquote
import sys,json,re,subprocess,mimetypes
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import build,commerce_pages

ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:8766/'
OUT=ROOT/'.tmp/verification'
LEGACY_ASSETS={}

def static_audit():
 docs={name:BeautifulSoup((ROOT/name).read_text(encoding='utf-8'),'html.parser') for name in build.PAGES}
 for name,doc in docs.items():
  assert len(doc.select('h1'))==1,(name,'one H1')
  assert doc.html.get('lang')=='en-AU',name
  ids=[e['id'] for e in doc.select('[id]')]
  assert len(ids)==len(set(ids)),(name,'duplicate ids')
  assert len(doc.select('.site-header'))==1 and len(doc.select('.site-footer'))==1,name
  assert doc.select_one('style[data-src="signal.css"]'),name
  rec=doc.select('.journal-recommendations');assert len(rec)==1,name
  assert rec[0].find_next_sibling().get('class')==['site-footer'],name
  expected=2 if name in [a['slug']+'.html' for a in commerce_pages.ARTICLES] else 3
  assert len(rec[0].select('.journal-card'))==expected,name
  assert not rec[0].select(f'.journal-card a[href="{name}"]'),name
  for ld in doc.select('script[type="application/ld+json"]'):json.loads(ld.string)
  for el in doc.select('a[href],link[href],img[src],script[src]'):
   value=el.get('href') or el.get('src');url=urlsplit(value)
   if url.scheme or url.netloc:continue
   dest=unquote(url.path).lstrip('/') or name
   if not (ROOT/dest).exists() and dest.startswith('clips/'):
    # The user's pre-existing local clip deletions are deliberately not staged.
    # Read the committed asset used by production, without restoring their file.
    LEGACY_ASSETS[dest]=subprocess.check_output(['git','show','HEAD:'+dest],cwd=ROOT)
   else:
    assert (ROOT/dest).exists(),(name,'missing resource',value)
   if url.fragment and dest in docs:
    assert docs[dest].find(id=unquote(url.fragment)),(name,'missing fragment',value)
  if name in commerce_pages.PAGES:
   content=doc.main.get_text(' ',strip=True)
   assert 'EUR' not in content and '€' not in content and '499' not in content,name
 home=docs['index.html'];sections=[e.get('id') for e in home.select('main>section')]
 assert sections.index('services')<sections.index('free-store')<sections.index('connected')
 assert len(docs['work.html'].select('.archive-card'))==54
 return docs

def check():
 static_audit();OUT.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
  ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
  for path,data in LEGACY_ASSETS.items():
   ctx.route(BASE+path,lambda r,request,data=data,path=path:r.fulfill(body=data,content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream'))
  page=ctx.new_page();errors=[];failed=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:failed.append((r.status,r.url)) if r.url.startswith(BASE) and r.status>=400 else None)
  for name in build.PAGES:
   response=page.goto(BASE+name,wait_until='networkidle');assert response.status==200,name
   assert page.locator('h1').is_visible(),name
   for width in [1440,1024,768,390,320]:
    page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(60)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(name,width,'horizontal overflow')
   page.set_viewport_size({'width':390,'height':844})
   page.locator('.menu-toggle').click();assert page.locator('#site-nav').is_visible(),name
   page.keyboard.press('Escape');assert page.locator('.menu-toggle').get_attribute('aria-expanded')=='false',name
   assert not page.locator('#site-nav').is_visible(),name
   for image in page.locator('img').all():
    if not image.is_visible():continue
    image.scroll_into_view_if_needed()
    page.wait_for_function('(i)=>i.complete && i.naturalWidth>0',arg=image.element_handle())
    image.evaluate('i=>i.decode()')
   if page.locator('.article-toc').count():
    link=page.locator('.article-toc a').first;link.click();assert urlsplit(page.url).fragment==link.get_attribute('href')[1:]
   print('PASS',name,flush=True)
  page.goto(BASE+'free-online-store.html',wait_until='networkidle')
  assert '1,251' in page.locator('#cost-first').inner_text()
  page.locator('#cost-hosting').fill('30');page.locator('#cost-domain').fill('24')
  assert '1,383' in page.locator('#cost-first').inner_text()
  assert '384' in page.locator('#cost-next').inner_text()
  page.locator('#cost-hosting').fill('-1');assert page.locator('#cost-error').is_visible()
  page.locator('#cost-hosting').fill('');assert page.locator('#cost-first').inner_text()=='Check the inputs'
  page.locator('#cost-hosting').fill('0');page.locator('#cost-domain').fill('0')
  assert '999' in page.locator('#cost-first').inner_text()
  page.locator('[data-demo-product="sneaker"]').click();assert '129.00' in page.locator('#demo-product-price').inner_text()
  page.locator('.zero-faq summary').first.click();assert page.locator('.zero-faq details').first.get_attribute('open') is not None
  target=page.locator('.zero-hero a[href^="brief.html"]').get_attribute('href')
  page.goto(BASE+target,wait_until='networkidle')
  assert page.locator('input[name="services"][value="online-stores"]').is_checked()
  assert 'AUD 999' in page.locator('[name="note"]').input_value()
  ctx.route('http://127.0.0.1:8787/brief',lambda r:r.fulfill(status=200 if r.request.method=='OPTIONS' else 500,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS'},content_type='application/json',body=json.dumps({'ok':False,'message':'Controlled preview failure'})))
  page.locator('[name="name"]').fill('Preview Test');page.locator('[name="email"]').fill('preview@example.com');page.locator('[name="goal"]').fill('Testing the local preview error state only.')
  page.locator('#brief-form button[type="submit"]').click()
  page.wait_for_function('document.querySelector("#brief-status").textContent.includes("Controlled preview failure")')
  assert page.locator('#brief-form button[type="submit"]').is_enabled()
  page.goto(BASE+'work.html',wait_until='networkidle');page.set_viewport_size({'width':1440,'height':1000})
  for button in page.locator('[data-filter]').all():
   button.click();category=button.get_attribute('data-filter');cards=page.locator('.archive-card:not([hidden])');assert cards.count()>0
   for card in cards.all():assert category=='all' or card.get_attribute('data-category')==category
  page.locator('[data-filter="all"]').click();assert page.locator('.archive-card:not([hidden])').count()==54
  ctx.route('**/demos/altovia/',lambda r:r.fulfill(content_type='text/html',body='<h1>Local preview fixture</h1>'))
  page.locator('[data-preview]').first.click();assert page.locator('.preview-dialog').is_visible()
  page.keyboard.press('Escape');assert not page.locator('.preview-dialog').is_visible()
  assert not errors,errors
  assert not failed,failed
  nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844},reduced_motion='reduce')
  nojs.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
  tab=nojs.new_page()
  for name in ['index.html','free-online-store.html','free-online-store-costs.html','journal.html','brief.html','work.html']:
   tab.goto(BASE+name,wait_until='networkidle')
   assert tab.locator('#site-nav').is_visible(),(name,'no-JS navigation')
   assert not tab.evaluate('document.documentElement.scrollWidth>innerWidth'),(name,'no-JS overflow')
   tab.locator('.journal-recommendations').scroll_into_view_if_needed();assert tab.locator('.journal-recommendations').is_visible()
  motion=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');tab=motion.new_page();tab.goto(BASE)
  assert tab.locator('.signal-hero-art img').evaluate('e=>getComputedStyle(e).animationName')=='none'
  browser.close()
 report={'status':'passed','pages':len(build.PAGES),'widths':[320,390,768,1024,1440],'committed_asset_fixtures':list(LEGACY_ASSETS),'checks':['static links/anchors/metadata','shared recommendations','mobile navigation and Escape','all local image loads','cost calculation and invalid inputs','demo selection and FAQ','brief prefill and simulated API failure','54-project archive filters and preview modal','no-JavaScript navigation','reduced motion','no page errors or local HTTP failures']}
 (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))

if __name__=='__main__':check()
