"""Test the standalone owner reviewer in real Chromium, without a web server."""
from __future__ import annotations
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

def run(args):
 out=args.output;out.mkdir(parents=True,exist_ok=True);report={'checks':[],'errors':[],'captures':[]}
 def check(n,v,detail=None):
  report['checks'].append({'name':n,'pass':bool(v),'detail':detail})
  (out/'reviewer-e2e.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(**({'executable_path':args.chromium} if args.chromium else {}),headless=True)
  report['browser']=browser.version
  page=browser.new_page(viewport={'width':1600,'height':1100})
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  if args.chromium:
   # Managed local Chromium disallows file navigation; exercise the same HTML
   # in memory there. CI also verifies the real double-click file:// entrypoint.
   page.set_content(args.html.read_text(encoding='utf-8'),wait_until='domcontentloaded',timeout=90000)
  else:
   page.goto(args.html.resolve().as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('window.__REVIEW_DATA && document.querySelector("#busy").textContent===""',timeout=90000)
  def ready():
   page.wait_for_function('document.querySelector("#busy").textContent===""');page.wait_for_timeout(180)
   return page.frames[1]
  def shot(n):
   page.screenshot(path=str(out/(n+'.png')));report['captures'].append(n+'.png')
  f=ready();check('13-visible-catalog-cards',f.locator('[data-sx-card]:visible').count()==13)
  check('catalog-before-path-map',not f.locator('#mapa').evaluate('e=>e.open'))
  check('4-learning-paths',f.locator('.sx-path').count()==4,f.locator('.sx-path').count())
  search=f.locator('[data-sx-search]');search.fill('prefill');page.wait_for_timeout(100)
  results=f.locator('[data-sx-result-url]');check('real-chapter-search-results',results.count()>0,results.all_text_contents())
  shot('01-catalog-search')
  dest=results.first.get_attribute('href');results.first.click();f=ready()
  check('search-result-opens-chapter',page.evaluate('S.route')==dest,[dest,page.evaluate('S.route')])
  check('reader-chapter-menu-present',f.locator('[data-sx-reader-index]').count()==1)
  if f.locator('[data-sx-reader-index]').count():
   f.locator('[data-sx-reader-index] summary').click();links=f.locator('[data-sx-reader-index] a')
   check('reader-all-six-chapters',links.count()==6,links.count())
   check('reader-current-chapter-labelled',f.locator('[data-sx-reader-index] [aria-current="page"]').count()==1)
   shot('02-reader-chapter-index');href=links.nth(1).get_attribute('href');links.nth(1).click();f=ready()
   check('reader-jump-works',page.evaluate('S.route')==href)
  page.locator('#home').click();f=ready();check('catalog-search-persists-after-reading',f.locator('[data-sx-search]').input_value()=='prefill')
  f.locator('[data-sx-search]').fill('');page.wait_for_timeout(80)
  # Real catalogue links, not parent-side simulation.
  card=f.locator('[data-sx-card] a[href="#serie-agentes-voz-tiempo-real"]')
  if not card.count():card=f.locator('a[href="#serie-agentes-voz-tiempo-real"]').first
  card.first.click();page.wait_for_timeout(180);f=page.frames[1]
  detail=f.locator('#serie-agentes-voz-tiempo-real')
  check('ficha-opens-from-catalog',detail.is_visible())
  check('ficha-start-action-above-player',detail.locator('.sx-detail-actions .sx-primary').count()==1)
  detail.locator('[data-sx-jump-chapters]').click();check('ficha-chapter-jump-focus',f.evaluate('document.activeElement.closest(".sx-roadmap")!==null'))
  shot('03-series-detail')
  detail.locator('.sx-detail-actions .sx-primary').click();f=ready();check('ficha-start-opens-first-chapter','/01-' in page.evaluate('S.route'))
  page.locator('[data-mode="visuals"]').click();f=ready()
  check('one-visual-at-a-time',f.locator('.ctxmix').count()==1)
  buttons=f.locator('.ctxmix button');before=f.locator('.ctxmix').get_attribute('data-state');buttons.nth(1).click();page.wait_for_timeout(100)
  check('original-control-changes-state',f.locator('.ctxmix').get_attribute('data-state')!=before)
  shot('04-interactive-security')
  for i in range(page.evaluate('D.visuals.length')):
   page.evaluate('(i)=>{S.index=i;render()}',i);f=ready()
   record=page.evaluate('target()')
   check(record['id']+'-rendered',f.locator('.review-isolated').inner_text().strip()!='')
   check(record['id']+'-single-source-root',f.locator('.review-isolated').evaluate('e=>e.children.length')==1)
   geometry=f.locator('.review-isolated > :first-child').evaluate('e=>({width:e.getBoundingClientRect().width,viewport:innerWidth})')
   check(record['id']+'-legible-desktop-width',geometry['width']>=min(500,geometry['viewport']-100),geometry)
   if record['id'] in {'10-01-01','09-06-01','12-01-01','13-01-01'}:shot('visual-'+record['id'])
   page.evaluate('S.device="mobile";render()');f=ready()
   mobile=f.locator('.review-isolated > :first-child').evaluate('e=>({width:e.getBoundingClientRect().width,viewport:innerWidth})')
   check(record['id']+'-mobile-root-fits',0<mobile['width']<=mobile['viewport']+1,mobile)
   page.evaluate('S.theme="slate";render()');f=ready()
   check(record['id']+'-mobile-dark-visible',f.locator('.review-isolated > :first-child').is_visible() and f.locator('body').get_attribute('data-md-color-scheme')=='slate')
   page.evaluate('S.device="desktop";S.theme="default"')
  page.evaluate('S.index=D.visuals.findIndex(x=>x.id==="10-01-01");render()');f=ready()
  newSize=f.locator('.s5v__head h3').evaluate('e=>getComputedStyle(e).fontSize')
  page.locator('[data-version="before"]').click();f=ready();oldSize=f.locator('.s5v__head h3').evaluate('e=>getComputedStyle(e).fontSize')
  check('before-after-load-different-real-assets',newSize!=oldSize,{'before':oldSize,'after':newSize})
  page.locator('[data-version="after"]').click();ready()
  page.locator('[data-device="mobile"]').click();f=ready();check('mobile-is-real-390px-layout',f.evaluate('innerWidth')==390,f.evaluate('innerWidth'))
  page.locator('[data-theme="slate"]').click();f=ready();check('real-dark-scheme',f.locator('body').get_attribute('data-md-color-scheme')=='slate')
  page.locator('#motion').click();f=ready();check('reduced-motion-media-query',f.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'))
  shot('05-mobile-dark')
  page.locator('[data-device="desktop"]').click();ready();page.locator('[data-theme="default"]').click();ready()
  page.locator('[data-mode="references"]').click();ready()
  for i in range(page.evaluate('D.references.length')):
   page.evaluate('(i)=>{S.index=i;render()}',i);f=ready();ref=page.evaluate('target()')
   check(ref['id']+'-original-reference-rendered',f.locator(ref['selector']).count()>0)
   if ref['id']=='R4-reference':shot('06-reference-best-of-n')
  check('reference-covers-all-six-series',sorted(set(page.evaluate('D.references.map(x=>x.series)')))==list(range(1,7)))
  check('iframe-no-runtime-errors',not page.evaluate('S.notes.filter(x=>x.type==="runtime")'),page.evaluate('S.notes.filter(x=>x.type==="runtime")'))
  page.locator('#home').click();f=ready();f.locator('[data-sx-search]').fill('');page.wait_for_timeout(100)
  page.set_viewport_size({'width':390,'height':844});ready();shot('07-reviewer-phone')
  check('reviewer-phone-no-document-overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  browser.close()
 report['status']='PASS' if all(c['pass'] for c in report['checks']) and not report['errors'] else 'FAIL'
 (out/'reviewer-e2e.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'status':report['status'],'checks':len(report['checks']),'failed':[c for c in report['checks'] if not c['pass']],'errors':report['errors']},ensure_ascii=False,indent=2))
 if report['status']!='PASS':raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--html',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--chromium');run(p.parse_args())
