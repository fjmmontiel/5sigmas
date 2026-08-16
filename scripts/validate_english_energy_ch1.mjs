#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${pageScrollWidth - pageClientWidth}px`);

    const body = await page.locator('body').innerText();
    for (const expected of [
      'Chapter 1 — Electricity and well-being: the real mechanisms',
      'The four channels that turn electricity into well-being',
      'Electricity and human development: the curve is steepest at low access',
      'An outage costs more than the missing electricity',
      'Electricity is enabling infrastructure',
      'Multi-Tier Framework',
    ]) {
      if (!body.includes(expected)) failures.push(`${viewport.name}: missing English content ${JSON.stringify(expected)}`);
    }
    for (const forbidden of ['Capítulo ', 'Electricidad y bienestar', 'Los cuatro canales', 'Coste de los cortes', 'Siguiente lectura']) {
      if (body.includes(forbidden)) failures.push(`${viewport.name}: Spanish leakage ${JSON.stringify(forbidden)}`);
    }

    const mechanism = page.locator('[data-demo="01-mecanismos"]');
    if (await mechanism.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical electricity-mechanisms visual`);
    } else {
      if (await mechanism.locator('.elec-dim').count() !== 2) failures.push(`${viewport.name}: mechanisms visual lost canonical quantity/quality source dimensions`);
      if (await mechanism.locator('.elec-channel').count() !== 4) failures.push(`${viewport.name}: mechanisms visual lost one of four canonical channels`);
      if (await mechanism.locator('.elec-metric').count() !== 4) failures.push(`${viewport.name}: mechanisms visual lost one of four canonical well-being outcomes`);
      if (await mechanism.locator('button[data-tab]').count() !== 0) failures.push(`${viewport.name}: mechanisms visual still contains invented English tab interaction`);

      const text = (await mechanism.textContent()) || '';
      for (const expected of [
        'The four channels that turn electricity into well-being',
        'Electricity supply',
        'Quantity',
        'kWh per capita',
        'Quality',
        'Reliability · Stability · Outage cost',
        'Health',
        'Logistics and industry',
        'Services and education',
        'Reduced domestic burden',
        'Well-being',
        'Life expectancy',
        'Infant mortality',
        'Productivity',
        'Access to services',
      ]) {
        if (!text.includes(expected)) failures.push(`${viewport.name}: mechanisms visual missing ${JSON.stringify(expected)}`);
      }
      for (const forbidden of [
        'Los cuatro canales', 'Suministro eléctrico', 'Cantidad', 'kWh per cápita', 'Calidad',
        'Logística e industria', 'Servicios y educación', 'Reducción de carga doméstica',
        'Bienestar', 'Esperanza de vida', 'Mortalidad infantil', 'Productividad', 'Acceso a servicios',
      ]) {
        if (text.includes(forbidden)) failures.push(`${viewport.name}: mechanisms visual Spanish leakage ${JSON.stringify(forbidden)}`);
      }

      const [clientWidth, scrollWidth] = await mechanism.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: mechanisms visual internal overflow ${scrollWidth - clientWidth}px`);

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          before: bodyText.indexOf('Electricity is best understood as infrastructure.'),
          visual: bodyText.indexOf('The four channels that turn electricity into well-being'),
          after: bodyText.indexOf('Health and essential services'),
        };
      });
      if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) {
        failures.push(`${viewport.name}: mechanisms visual moved away from its canonical article hook`);
      }

      await mechanism.screenshot({ path: path.join(outDir, `english-energy-ch1-mechanisms-${viewport.name}.png`), animations: 'disabled' });
    }

    const outage = page.locator('.out-wrap');
    if (await outage.count() !== 1) {
      failures.push(`${viewport.name}: expected one current outage visual`);
    } else {
      const buttons = outage.locator('button[data-tab]');
      if (await buttons.count() < 2) failures.push(`${viewport.name}: outage visual lost interactive tabs`);
      else {
        await buttons.nth(1).click();
        if ((await buttons.nth(1).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: outage visual second tab does not activate`);
      }
    }

    for (const selector of ['.kwh-wrap', '.infra-wrap']) {
      if (await page.locator(selector).count() !== 1) failures.push(`${viewport.name}: expected one ${selector}`);
    }

    const videos = page.locator('video[data-s5-inline-video-player]');
    if (await videos.count() !== 1) {
      failures.push(`${viewport.name}: expected one declared native-English chapter video, found ${await videos.count()}`);
    } else {
      const video = videos.first();
      const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
      const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
      if (sourceUrl.pathname !== '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar.mp4') {
        failures.push(`${viewport.name}: chapter video is not the native-English Energy asset: ${sourceUrl.pathname}`);
      }
      if (posterUrl.pathname !== '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar.jpg') {
        failures.push(`${viewport.name}: chapter poster is not the native-English Energy asset: ${posterUrl.pathname}`);
      }
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.screenshot({ path: path.join(outDir, `english-energy-ch1-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy chapter 1 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Energy chapter 1 QA passed: canonical mechanisms flow, native-English media, current remaining visuals, hook placement and desktop/mobile layout are clean.');
