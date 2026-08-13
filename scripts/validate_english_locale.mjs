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
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const failures = [];

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

  const body = await page.locator('body').innerText();
  for (const marker of forbiddenSpanish) {
    if (body.includes(marker)) failures.push(`${route}: Spanish UI marker ${JSON.stringify(marker)}`);
  }

  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (overflow.scroll > overflow.viewport + 2) {
    failures.push(`${route}: horizontal overflow ${overflow.scroll}px > ${overflow.viewport}px`);
  }
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

await page.setViewportSize({ width: 390, height: 844 });
for (const [route, filename] of [
  ['/en/', 'english-home-mobile.png'],
  ['/en/series/agentes-ia/02-anatomia-de-un-agente/', 'english-agent-anatomy-mobile.png'],
  ['/en/series/agentes-ia/04-seguridad-agentes/', 'english-agent-security-mobile.png'],
]) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (overflow.scroll > overflow.viewport + 2) {
    failures.push(`${route} mobile: horizontal overflow ${overflow.scroll}px > ${overflow.viewport}px`);
  }
  await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
}

await browser.close();

if (failures.length) {
  console.error('English locale browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`English locale browser QA passed: ${routes.length} routes, translated visuals, hreflang, desktop/mobile overflow.`);
