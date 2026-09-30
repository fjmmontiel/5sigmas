"""Browser regressions for real series links; no DOM/style overrides."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def run(base: str, output: Path) -> None:
    report = {'checks': [], 'errors': []}
    output.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, channel='chrome')
        report['browser'] = browser.version
        for width in (1440, 390):
            page = browser.new_page(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            for locale in ('es', 'en'):
                prefix = '' if locale == 'es' else '/en'
                series = '#serie-agentes-ia'
                page.goto(base + prefix + '/series/' + series, wait_until='networkidle')
                expect(page.locator(series)).to_be_visible()
                other = '/en' if locale == 'es' else ''
                links = page.locator('.md-select a[href]').evaluate_all('(nodes) => nodes.map(n => ({href:n.href,path:new URL(n.href).pathname}))')
                # Inspect the real locale selector target, then follow its URL.
                # No synthetic URL is used to hide loss of the selected series.
                href = next((link['href'] for link in links if link['path'] == other + '/series/'), None)
                assert href and href.endswith(other + '/series/' + series), href
                from urllib.parse import urlsplit
                parsed = urlsplit(href)
                page.goto(base + parsed.path + '#' + parsed.fragment, wait_until='networkidle')
                expect(page.locator(series)).to_be_visible()
                report['checks'].append({'name': f'{width}-{locale}-selected-series-survives-locale', 'pass': True})
                chapter = base + prefix + '/series/agentes-ia/01-que-es-un-agente/'
                page.goto(chapter + '#s5-diagrama-original', wait_until='networkidle')
                tab = page.locator('[data-sx-tab="original"]')
                expect(tab).to_have_attribute('aria-selected', 'true')
                expect(page.locator('#s5-diagrama-original')).to_be_visible()
                # An existing inner anchor must survive direct entry too.
                ids = page.locator('#s5-diagrama-original [id]').evaluate_all("nodes => nodes.filter(n => { const b=n.getBoundingClientRect(); return b.width>0 && b.height>0; }).map(n=>n.id)")
                if ids:
                    anchor = ids[0]
                    page.goto(chapter + '#' + anchor, wait_until='networkidle')
                    expect(tab).to_have_attribute('aria-selected', 'true')
                    expect(page.locator('#s5-diagrama-original')).to_be_visible()
                report['checks'].append({'name': f'{width}-{locale}-original-and-inner-deeplink', 'pass': True})
                page.screenshot(path=str(output.parent / f'navigation-{width}-{locale}-reference.png'), full_page=False)
            page.close()
        browser.close()
    report['status'] = 'PASS' if not report['errors'] else 'FAIL'
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False), flush=True)
    assert report['status'] == 'PASS', report['errors']


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8001')
    parser.add_argument('--output', type=Path, default=Path('artifacts/series-ui-review/navigation-regression.json'))
    args = parser.parse_args()
    run(args.base_url, args.output)
