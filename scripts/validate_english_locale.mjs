#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = [
  '/en/',
  '/en/series/',
  '/en/series/agentes-ia/00_presentacion_serie/',
  '/en/series/agentes-ia/01-que-es-un-agente/',
  '/en/series/agentes-ia/02-anatomia-de-un-agente/',
  '/en/series/agentes-ia/03-como-evaluar-un-agente/',
  '/en/series/agentes-ia/04-seguridad-agentes/',
  '/en/series/agentes-ia/05-de-la-demo-a-produccion/',
  '/en/meta/about/',
];

const forbiddenSpanish = [
  'Capítulo ',
  'Qué deberías recordar',
  'Tiempo de lectura',
  'Pantalla completa',
  'Prerrequisitos:',
  'Biblioteca',
  'Estás en',
  'Anterior',
  'Siguiente capítulo',
  'Lectura estimada',
];

const normalizeVisible = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const failures = [];

const assertNoSpanish = async (route) => {
  const body = await page.locator('body').innerText();
  for (const marker of forbiddenSpanish) {
    if (body.includes(marker)) failures.push(`${route}: Spanish UI marker ${JSON.stringify(marker)}`);
  }
};

const assertNoOverflow = async (route, suffix = '') => {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (overflow.scroll > overflow.viewport + 2) {
    failures.push(`${route}${suffix}: horizontal overflow ${overflow.scroll}px > ${overflow.viewport}px`);
  }
};

for (const route of routes) {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  if (!response || !response.ok()) {
    failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
    continue;
  }

  const lang = await page.locator('html').getAttribute('lang');
  if (!lang || !lang.toLowerCase().startsWith('en')) {
    failures.push(`${route}: expected html lang=en, got ${lang}`);
  }
  await assertNoSpanish(route);
  await assertNoOverflow(route);
}

const contentChecks = [
  ['/en/series/agentes-ia/01-que-es-un-agente/', 'An agent is a loop with permissions'],
  ['/en/series/agentes-ia/03-como-evaluar-un-agente/', 'A demo measures an output. An agent needs a trace.'],
  ['/en/series/agentes-ia/04-seguridad-agentes/', 'Incoming data can become an instruction'],
];
for (const [route, expected] of contentChecks) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  const body = await page.locator('body').innerText();
  if (!body.includes(expected)) failures.push(`${route}: translated visual missing: ${expected}`);
}

await page.goto(`${base}/en/`, { waitUntil: 'domcontentloaded' });
const spanishAlternate = await page.locator('link[rel="alternate"][hreflang="es"]').count();
const englishAlternate = await page.locator('link[rel="alternate"][hreflang="en"]').count();
if (!spanishAlternate || !englishAlternate) {
  failures.push(`/en/: expected hreflang alternates for es and en`);
}
await page.screenshot({ path: path.join(outDir, 'english-home-desktop.png'), fullPage: true });

const readerRoute = '/en/series/agentes-ia/02-anatomia-de-un-agente/';
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}${readerRoute}`, { waitUntil: 'networkidle' });

for (const selector of ['.s5-reader-context', '.s5-reader-shell', '.s5-reader-direct', '.s5-reader-end', '.s5-reading-meta']) {
  if (await page.locator(selector).count() !== 1) {
    failures.push(`${readerRoute}: expected exactly one ${selector} reader component`);
  }
}

const contextText = await page.locator('.s5-reader-context').innerText().catch(() => '');
const normalizedContext = normalizeVisible(contextText);
if (!normalizedContext.includes('learn') || !normalizedContext.includes('03 of 06') || !normalizedContext.includes('ai agents')) {
  failures.push(`${readerRoute}: localized reader context is incomplete: ${JSON.stringify(contextText)}`);
}

const readingMeta = await page.locator('.s5-reading-meta').innerText().catch(() => '');
const normalizedReadingMeta = normalizeVisible(readingMeta);
if (!normalizedReadingMeta.includes('estimated reading') || !/\d+\s+min/.test(normalizedReadingMeta)) {
  failures.push(`${readerRoute}: compact English reading-time treatment is missing: ${JSON.stringify(readingMeta)}`);
}

const readerHrefs = await page.locator('.s5-reader-topbar a, .s5-reader-direct a, .s5-reader-end a').evaluateAll((links) =>
  links.map((link) => link.getAttribute('href')).filter(Boolean)
);
for (const href of readerHrefs) {
  if (!href.startsWith('/en/')) failures.push(`${readerRoute}: reader link escapes English locale: ${href}`);
}

const globalNav = page.locator('.s5-reader-global-nav');
await globalNav.waitFor({ state: 'visible' }).catch(() => {});
if (await globalNav.getAttribute('aria-label').catch(() => null) !== 'Main navigation') {
  failures.push(`${readerRoute}: desktop reader header is not localized as Main navigation`);
}
if (await globalNav.locator('a').count() < 3) {
  failures.push(`${readerRoute}: desktop reader header lost the English global navigation`);
}

const libraryOpen = page.locator('[data-s5-reader-open]:visible').first();
await libraryOpen.click().catch(() => {});
const library = page.locator('[data-s5-reader-library]');
await library.waitFor({ state: 'visible' }).catch(() => {});
if (!await library.isVisible().catch(() => false)) {
  failures.push(`${readerRoute}: full reader library does not open`);
} else {
  const libraryText = await library.innerText();
  const normalizedLibrary = normalizeVisible(libraryText);
  for (const expected of ['series and technical notes.', 'ai agents', 'reading']) {
    if (!normalizedLibrary.includes(expected)) failures.push(`${readerRoute}: reader library missing English copy ${JSON.stringify(expected)}`);
  }
  const libraryHeading = normalizeVisible(await library.locator('h2').innerText().catch(() => ''));
  if (libraryHeading !== 'series and technical notes.') {
    failures.push(`${readerRoute}: reader library heading is not localized: ${JSON.stringify(libraryHeading)}`);
  }
  for (const marker of forbiddenSpanish) {
    if (libraryText.includes(marker)) failures.push(`${readerRoute}: reader library leaked Spanish marker ${JSON.stringify(marker)}`);
  }
  await page.screenshot({ path: path.join(outDir, 'english-agent-library-desktop.png'), fullPage: false });
  await page.locator('[data-s5-reader-close]').click();
}
await assertNoOverflow(readerRoute, ' desktop reader');
await page.screenshot({ path: path.join(outDir, 'english-agent-anatomy-desktop.png'), fullPage: false });

const finalRoute = '/en/series/agentes-ia/05-de-la-demo-a-produccion/';
await page.goto(`${base}${finalRoute}`, { waitUntil: 'networkidle' });
const completionHref = await page.locator('.s5-reader-end__next').getAttribute('href').catch(() => null);
const completionText = await page.locator('.s5-reader-end__next').innerText().catch(() => '');
if (completionHref !== '/en/series/' || !normalizeVisible(completionText).includes('series completed')) {
  failures.push(`${finalRoute}: series completion must stay in English and return to /en/series/; got href=${JSON.stringify(completionHref)} text=${JSON.stringify(completionText)}`);
}

const presentationRoute = '/en/series/agentes-ia/00_presentacion_serie/';
await page.goto(`${base}${presentationRoute}`, { waitUntil: 'networkidle' });
if (await page.locator('.s5-reading-meta').count()) {
  failures.push(`${presentationRoute}: series presentation should not show chapter reading-time metadata`);
}

await page.setViewportSize({ width: 390, height: 844 });
for (const [route, filename] of [
  ['/en/', 'english-home-mobile.png'],
  [readerRoute, 'english-agent-anatomy-mobile.png'],
  ['/en/series/agentes-ia/04-seguridad-agentes/', 'english-agent-security-mobile.png'],
]) {
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await assertNoSpanish(`${route} mobile`);
  await assertNoOverflow(route, ' mobile');

  if (route !== '/en/') {
    const topbar = page.locator('.s5-reader-topbar');
    if (!await topbar.isVisible().catch(() => false)) {
      failures.push(`${route} mobile: compact reader navigator is not visible`);
    } else {
      const box = await topbar.boundingBox();
      if (!box || box.height > 56 || box.x < 8 || box.x + box.width > 382) {
        failures.push(`${route} mobile: compact reader navigator dimensions regressed: ${JSON.stringify(box)}`);
      }
    }
    if (await page.locator('.s5-reader-direct:visible, .s5-reader-rail:visible').count()) {
      failures.push(`${route} mobile: duplicate desktop reader layers are visible`);
    }
  }

  await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
}

await browser.close();

if (failures.length) {
  console.error('English locale browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`English locale browser QA passed: ${routes.length} routes, translated visuals, hreflang, localized reader shell, desktop/mobile overflow.`);
