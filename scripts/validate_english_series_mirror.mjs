#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const presentations = [
  ['fundamentos-ia-iag', 'AI and Generative AI Foundations'],
  ['from-cave-to-agi', 'From the Caves to AGI'],
  ['multimodalidad-iag', 'Multimodality in Generative AI'],
  ['modelos-razonadores', 'Reasoning Models'],
  ['ia-pib-bienestar-energia', 'AI, GDP, Well-being and Energy'],
  ['datacenters-espacio', 'Data Centers in Space'],
  ['seguridad-ia', 'AI Security'],
  ['agentes-ia', 'AI Agents'],
];

const nativePresentationMedia = new Map([
  ['fundamentos-ia-iag', '00_presentacion_serie'],
  ['multimodalidad-iag', '00_presentacion_serie'],
]);

const forbidden = [
  'Prerrequisitos', 'Terminada', 'Técnico', 'Capítulos', 'Ver todas las series',
  'Reproducir ataque', 'Reiniciar', 'Idea clave', 'Cargar gráfico externo', 'Abrir OWID',
  'Tierra', 'Órbita', 'Calor', 'Agua local', 'Permisos + suelo',
];

const failures = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const noOverflow = async (route) => {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (sizes.scroll > sizes.viewport + 2) failures.push(`${route}: horizontal overflow ${sizes.scroll}px > ${sizes.viewport}px`);
};

const visit = async (route) => {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
  await noOverflow(route);
  return page.locator('body').innerText().catch(() => '');
};

const hubText = await visit('/en/series/');
const hubLinks = await page.locator('.s5-simple-list a.s5-list-row').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
if (hubLinks.length !== 8) failures.push(`/en/series/: expected 8 canonical series cards, got ${hubLinks.length}`);
for (const [slug, title] of presentations) {
  const expected = `/en/series/${slug}/00_presentacion_serie/`;
  if (!hubLinks.includes(expected)) failures.push(`/en/series/: missing ${expected}`);
  if (!hubText.includes(title)) failures.push(`/en/series/: missing title ${JSON.stringify(title)}`);
}

for (const [slug, expectedTitle] of presentations) {
  const route = `/en/series/${slug}/00_presentacion_serie/`;
  const body = await visit(route);
  if (!body.includes(expectedTitle)) failures.push(`${route}: missing canonical English series title ${JSON.stringify(expectedTitle)}`);
  for (const marker of forbidden) {
    if (body.includes(marker)) failures.push(`${route}: Spanish visual/UI marker leaked: ${JSON.stringify(marker)}`);
  }

  const nativeMedia = nativePresentationMedia.get(slug);
  const videos = page.locator('video[data-s5-inline-video-player]');
  const videoCount = await videos.count();
  if (nativeMedia) {
    if (videoCount !== 1) {
      failures.push(`${route}: expected one declared native-English presentation video, found ${videoCount}`);
    } else {
      const video = videos.first();
      const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
      const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
      const expectedRoot = `/en/series/${slug}/`;
      if (!sourceUrl.pathname.startsWith(expectedRoot) || !sourceUrl.pathname.endsWith(`/${nativeMedia}.mp4`)) {
        failures.push(`${route}: native presentation video escaped English locale media: ${sourceUrl.pathname}`);
      }
      if (!posterUrl.pathname.startsWith(expectedRoot) || !posterUrl.pathname.endsWith(`/${nativeMedia}.jpg`)) {
        failures.push(`${route}: native presentation poster escaped English locale media: ${posterUrl.pathname}`);
      }
    }
  } else if (videoCount) {
    failures.push(`${route}: presentation exposed video before native-English media was declared`);
  }
}

await page.goto(`${base}/en/series/ia-pib-bienestar-energia/00_presentacion_serie/`, { waitUntil: 'networkidle' });
for (const expected of ['Electricity → well-being', 'AI as an electrical technology', 'GDP vs well-being', 'AI and GDP today']) {
  if (!(await page.locator('body').innerText()).includes(expected)) failures.push(`energy series: missing localized visual ${JSON.stringify(expected)}`);
}
const loadButtons = await page.locator('.sp-card-load').allTextContents();
if (!loadButtons.every((value) => value.trim() === 'Load external chart')) {
  failures.push(`energy series: shared chart loader is not localized: ${JSON.stringify(loadButtons)}`);
}

await page.goto(`${base}/en/series/datacenters-espacio/00_presentacion_serie/`, { waitUntil: 'networkidle' });
const dataCenterBody = await page.locator('body').innerText();
for (const expected of ['Ground', 'Orbit', 'Grid: 4–10 years', 'Launch mass and communications still close the balance']) {
  if (!dataCenterBody.includes(expected)) failures.push(`data-center series: missing localized animation text ${JSON.stringify(expected)}`);
}

await page.goto(`${base}/en/series/seguridad-ia/00_presentacion_serie/`, { waitUntil: 'networkidle' });
const securityBody = await page.locator('body').innerText();
for (const expected of ['Play attack', 'Hostile content', 'Crosses authorization', 'The risk is not a response. It is a path.']) {
  if (!securityBody.includes(expected)) failures.push(`security series: missing localized series-map text ${JSON.stringify(expected)}`);
}

for (const route of [
  '/en/series/',
  '/en/series/ia-pib-bienestar-energia/00_presentacion_serie/',
  '/en/series/datacenters-espacio/00_presentacion_serie/',
  '/en/series/seguridad-ia/00_presentacion_serie/',
]) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await noOverflow(`${route} mobile`);
}

await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${base}/en/series/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, 'english-series-mirror-desktop.png'), fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/en/series/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, 'english-series-mirror-mobile.png'), fullPage: true });

await browser.close();

if (failures.length) {
  console.error('English series mirror QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English series mirror QA passed: eight canonical series entries, localized embedded visuals, native-English presentation media only when declared, desktop/mobile overflow clean.');
