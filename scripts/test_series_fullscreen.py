"""Exercise native fullscreen controls on the real built ES/EN learning pages."""
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
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        for locale in ('es', 'en'):
            prefix = '' if locale == 'es' else '/en'
            page.goto(base + prefix + '/series/agentes-ia/01-que-es-un-agente/', wait_until='networkidle')
            root = page.locator('[data-sx-guide]')
            button = root.locator('[data-sx-fullscreen]')
            button.focus()
            page.keyboard.press('Enter')
            page.wait_for_function('document.fullscreenElement?.matches("[data-sx-guide]")')
            expect(button).to_have_attribute('aria-pressed', 'true')
            expect(button).to_have_attribute('aria-label', 'Salir de pantalla completa' if locale == 'es' else 'Exit fullscreen')
            report['checks'].append({'name': locale + '-native-fullscreen-and-label', 'pass': True})
            root.locator('[data-sx-next]').focus()
            page.keyboard.press('Escape')
            page.wait_for_function('!document.fullscreenElement')
            expect(button).to_be_focused()
            expect(button).to_have_attribute('aria-pressed', 'false')
            report['checks'].append({'name': locale + '-escape-and-focus-return', 'pass': True})
            button.click()
            page.wait_for_function('!!document.fullscreenElement')
            button.click()
            page.wait_for_function('!document.fullscreenElement')
            expect(button).to_be_focused()
            report['checks'].append({'name': locale + '-button-can-also-exit', 'pass': True})
        browser.close()
    report['status'] = 'PASS' if not report['errors'] else 'FAIL'
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False), flush=True)
    if report['status'] != 'PASS':
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8001')
    parser.add_argument('--output', type=Path, default=Path('artifacts/series-ui-review/fullscreen-controls.json'))
    args = parser.parse_args()
    run(args.base_url, args.output)
