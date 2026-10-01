"""Real browser regression for Ver-to-series discovery in PR 378."""
import hashlib
import json
import os
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

OUT = Path('artifacts/series-ui-review')
OUT.mkdir(parents=True, exist_ok=True)
report = {'head': os.environ.get('REVIEW_HEAD_SHA'), 'created_at': datetime.now(timezone.utc).isoformat(), 'checks': [], 'captures': [], 'errors': []}

def save():
    report['status'] = 'PASS' if not report['errors'] and report['checks'] and all(x['pass'] for x in report['checks']) else 'FAIL'
    (OUT/'gallery-discovery.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True)
    report['browser'] = browser.version
    for width, height in [(1440,1000),(390,844)]:
        for prefix in ['', '/en']:
            ctx = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
            page = ctx.new_page()
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            try:
                for state, port in [('before',8000),('after',8001)]:
                    page.goto(f'http://127.0.0.1:{port}{prefix}/visuales/', wait_until='networkidle')
                    page.evaluate('document.fonts.ready')
                    cards = page.locator('.s5-watch-card')
                    if state == 'after':
                        expect(page.locator('.s5-watch-card .sx-parent-series')).to_have_count(cards.count())
                        valid = cards.evaluate_all("cards=>cards.length>0 && cards.every(card=>{const chapter=Array.from(card.querySelectorAll('a')).find(a=>a.pathname.match(/\\/series\\/[^/]+\\/[^/]+\\//));const parent=card.querySelector('.sx-parent-series');return chapter && parent && parent.hash==='#serie-'+chapter.pathname.match(/\\/series\\/([^/]+)\\//)[1]})")
                        report['checks'].append({'id':f'parents-{width}-{prefix}', 'pass':valid, 'count':cards.count()})
                    first = cards.first
                    first.scroll_into_view_if_needed()
                    name = f'gallery-{width}-{prefix.strip("/") or "es"}-{state}.png'
                    first.screenshot(path=str(OUT/name))
                    report['captures'].append({'file':name, 'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest(), 'url':page.url, 'width':width, 'state':state, 'kind':'unaltered element screenshot'})
                link = page.locator('.s5-watch-card .sx-parent-series').first
                target = link.get_attribute('href').split('#',1)[1]
                link.click()
                expect(page.locator('#'+target)).to_be_visible()
                report['checks'].append({'id':f'parent-opens-series-{width}-{prefix}', 'pass':True, 'hash':page.evaluate('location.hash')})
            except Exception as exc:
                report['errors'].append(f'{width}/{prefix}: {exc}')
            finally:
                ctx.close()
                save()
    browser.close()
save()
print(json.dumps(report,ensure_ascii=False))
if report['status'] != 'PASS':
    raise SystemExit(1)
