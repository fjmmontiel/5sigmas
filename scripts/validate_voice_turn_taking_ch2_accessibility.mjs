#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const cases = [
  { locale: 'es', route: '/series/agentes-voz-tiempo-real/02-turn-taking/' },
  { locale: 'en', route: '/en/series/agentes-voz-tiempo-real/02-turn-taking/' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.hasTouch,
        isMobile: viewport.hasTouch,
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);

      const visual = page.locator('.s5v-turn-signals');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one turn-taking visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 20, `${testCase.route}: ${viewport.name} turn-taking visual missing meaningful aria-label`);

        const cards = visual.locator('.s5v-arch-map__pipe > span');
        check((await cards.count()) === 4, `${testCase.route}: ${viewport.name} expected four decision cards`);
        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);

        for (let index = 0; index < await cards.count(); index += 1) {
          const box = await cards.nth(index).boundingBox();
          check(Boolean(box && box.width >= (viewport.name === 'mobile' ? 180 : 70)), `${testCase.route}: ${viewport.name} card ${index + 1} collapsed horizontally (${JSON.stringify(box)})`);
          check(Boolean(box && box.height <= 150), `${testCase.route}: ${viewport.name} card ${index + 1} wraps pathologically (${JSON.stringify(box)})`);
        }

        const copy = (await visual.locator('.s5v__copy').innerText()).trim();
        check(copy.length >= 50, `${testCase.route}: ${viewport.name} visual explanatory copy missing`);
        if (testCase.locale === 'en') {
          check(!copy.includes('aporta una observación') && !copy.includes('decisión'), `${testCase.route}: ${viewport.name} Spanish visual copy leaked into English`);
          const bodyText = await visual.innerText();
          for (const token of ['Actividad de voz', 'Fin de turno', 'Interrupción', '¿Terminó la idea?']) {
            check(!bodyText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
          }
        }

        await visual.screenshot({
          path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-${viewport.name}-signals.png`),
          animations: 'disabled',
        });
      }

      const documentOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      check(documentOverflow.scrollWidth <= documentOverflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(documentOverflow)}`);

      const h1 = (await page.locator('main h1').first().innerText()).trim();
      check(h1.length >= 20, `${testCase.route}: ${viewport.name} missing article h1`);
      const tables = page.locator('main table');
      for (let index = 0; index < await tables.count(); index += 1) {
        const table = tables.nth(index);
        const box = await table.boundingBox();
        if (box) check(box.width <= viewport.width + 1, `${testCase.route}: ${viewport.name} table ${index + 1} exceeds viewport (${JSON.stringify(box)})`);
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      await page.screenshot({
        path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-${viewport.name}-page.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Turn-taking chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Turn-taking chapter browser/accessibility QA PASS: ES/EN route language, visual semantics, localization, desktop/mobile geometry, table/page overflow, runtime errors and review screenshots are valid.');
