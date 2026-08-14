#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

const measure = async (page, route, viewport) => {
  await page.setViewportSize(viewport);
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${route} returned ${response?.status() ?? 'no response'}`);

  return page.evaluate(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
    };
    const image = document.querySelector('.s5-start-card__media img');
    return {
      card: rect('.s5-start-card'),
      media: rect('.s5-start-card__media'),
      cta: rect('.s5-start-card__cta'),
      loops: document.querySelectorAll('.s5-learning-loop__item').length,
      entries: document.querySelectorAll('.s5-entry').length,
      mediaCards: document.querySelectorAll('.s5-media-card').length,
      paths: document.querySelectorAll('.s5-simple-list .s5-list-row').length,
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
      imageSource: image?.getAttribute('src') || null,
      localImages: [...document.querySelectorAll('img[src^="/"]')].map((img) => img.getAttribute('src')),
      localLinks: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      body: document.body.innerText,
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
};

const desktop = { width: 1440, height: 1000 };
const page = await browser.newPage({ viewport: desktop });
const es = await measure(page, '/', desktop);
const en = await measure(page, '/en/', desktop);

if (!en.imageLoaded || en.imageSource !== '/en/series/modelos-razonadores/01-que-es-razonar.jpg') {
  failures.push(`/en/: canonical native-English hero visual is missing or broken: ${JSON.stringify(en.imageSource)}`);
}
if (!en.media || en.media.height < 220) failures.push(`/en/: English hero media is visually too small: ${JSON.stringify(en.media)}`);
if (!en.card || !es.card) {
  failures.push('Homepage parity: missing Spanish or English start card');
} else {
  const ratio = en.card.height / es.card.height;
  if (ratio < 0.78 || ratio > 1.22) failures.push(`Homepage parity: English start-card height ${en.card.height.toFixed(1)}px diverges from Spanish ${es.card.height.toFixed(1)}px (ratio ${ratio.toFixed(2)})`);
}
if (!en.media || !en.cta || Math.abs(en.cta.y - (en.media.bottom - en.cta.height)) > 18) failures.push('/en/: English CTA no longer overlays the visual like the Spanish learning card');
if (en.loops !== 3 || es.loops !== 3) failures.push(`Homepage parity: expected three-step learning loops, got ES=${es.loops} EN=${en.loops}`);
if (en.entries !== 3) failures.push(`/en/: expected three canonical entry surfaces, got ${en.entries}`);
if (en.mediaCards !== 3) failures.push(`/en/: expected three native-English visual cards, got ${en.mediaCards}`);
if (en.paths < 4) failures.push(`/en/: expected at least four learning-path rows, got ${en.paths}`);
for (const required of ['/en/temas/', '/en/series/', '/en/articulos-tecnicos/']) {
  if (!en.localLinks.includes(required)) failures.push(`/en/: missing canonical library entry ${required}`);
}
for (const src of en.localImages) {
  if (!src.startsWith('/en/')) failures.push(`/en/: local image bypasses English media namespace: ${src}`);
}
for (const token of ['Ruta recomendada', 'Elige una ruta', 'Explicaciones visuales', 'Nota técnica']) {
  if (en.body.includes(token)) failures.push(`/en/: Spanish homepage leakage ${JSON.stringify(token)}`);
}
if (en.scrollWidth > en.viewport + 2) failures.push('/en/: desktop homepage horizontally overflows');

await page.goto(`${base}/en/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, 'english-home-parity-desktop.png'), fullPage: true, animations: 'disabled' });

const mobile = { width: 390, height: 844 };
const enMobile = await measure(page, '/en/', mobile);
if (!enMobile.imageLoaded || !enMobile.media || enMobile.media.height < 130) failures.push(`/en/: mobile hero visual is missing or too small: ${JSON.stringify(enMobile.media)}`);
if (enMobile.scrollWidth > enMobile.viewport + 2) failures.push('/en/: mobile homepage horizontally overflows');
if (!enMobile.card || enMobile.card.width > 390 || enMobile.card.width < 330) failures.push(`/en/: mobile start card width regressed: ${JSON.stringify(enMobile.card)}`);
await page.screenshot({ path: path.join(outDir, 'english-home-parity-mobile.png'), fullPage: true, animations: 'disabled' });

await browser.close();

if (failures.length) {
  console.error('English homepage parity QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English homepage parity QA passed: canonical library breadth, native-English media, hero weight, CTA overlap and desktop/mobile layout are protected.');
