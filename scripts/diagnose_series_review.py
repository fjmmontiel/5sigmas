"""Bounded diagnostic for PR 378; never changes page content or deployment."""
from pathlib import Path
from datetime import datetime, timezone
import json, hashlib
from playwright.sync_api import sync_playwright

OUT = Path('artifacts/series-ui-review')
OUT.mkdir(parents=True, exist_ok=True)
report = {'kind': 'diagnostic-not-final-acceptance', 'created_at': datetime.now(timezone.utc).isoformat(), 'engines': []}
with sync_playwright() as pw:
    for engine, options in [('chromium', {}), ('chrome', {'channel': 'chrome'})]:
        result = {'engine': engine, 'errors': [], 'requests_failed': []}
        report['engines'].append(result)
        try:
            browser = pw.chromium.launch(headless=True, **options)
            ctx = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            p = ctx.new_page()
            p.on('pageerror', lambda e: result['errors'].append(str(e)))
            p.on('requestfailed', lambda r: result['requests_failed'].append({'url': r.url, 'failure': r.failure}))
            p.goto('http://127.0.0.1:8001/series/', wait_until='networkidle')
            p.evaluate('document.fonts.ready')
            result['card_hrefs'] = p.locator('[data-sx-card] .sx-card-open').evaluate_all('(els)=>els.map(e=>e.getAttribute("href"))')
            p.screenshot(path=str(OUT / f'diagnostic-{engine}-catalog.png'), full_page=True)
            p.locator('[data-sx-card] .sx-card-open').nth(7).click()
            p.wait_for_timeout(500)
            result['navigation'] = p.evaluate('()=>({hash:location.hash, visible:!!document.querySelector("#serie-agentes-ia")?.checkVisibility(), hubReady:document.querySelector("[data-sx-hub]")?.dataset.ready})')
            p.screenshot(path=str(OUT / f'diagnostic-{engine}-series.png'), full_page=True)
            p.locator('#serie-agentes-ia [data-sx-play]').click()
            p.wait_for_timeout(4500)
            result['video'] = p.locator('#serie-agentes-ia video').evaluate('v=>({currentSrc:v.currentSrc, src:v.getAttribute("src"), dataSrc:v.dataset.src, readyState:v.readyState, networkState:v.networkState, error:v.error?{code:v.error.code,message:v.error.message}:null, paused:v.paused, currentTime:v.currentTime, h264:v.canPlayType(\'video/mp4; codecs="avc1.42E01E"\'), userAgent:navigator.userAgent})')
            p.screenshot(path=str(OUT / f'diagnostic-{engine}-playback.png'))
            for key, route in [('agent','agentes-ia/01-que-es-un-agente'),('voice','agentes-voz-tiempo-real/02-turn-taking'),('inference','llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget')]:
                p.goto('http://127.0.0.1:8001/series/'+route+'/', wait_until='networkidle')
                g = p.locator('[data-sx-guide]')
                g.locator('[data-sx-step="3"]').click()
                g.scroll_into_view_if_needed()
                p.screenshot(path=str(OUT / f'diagnostic-{engine}-{key}.png'))
            p.set_viewport_size({'width':390,'height':844})
            p.goto('http://127.0.0.1:8001/series/',wait_until='networkidle')
            p.screenshot(path=str(OUT / f'diagnostic-{engine}-mobile.png'))
            ctx.close(); browser.close()
        except Exception as exc:
            result['errors'].append(str(exc))
        (OUT/'diagnostic.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
