#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/01-representar/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
for (const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
  const page = await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
  const response = await page.goto(`${base}${route}`,{waitUntil:'networkidle'});
  if (!response?.ok()) failures.push(`HTTP ${response?.status() ?? 'no response'}`);
  const body = await page.locator('body').innerText();
  if (!body.includes('Chapter 1: Represent')) failures.push('missing English chapter title');
  for (const forbidden of ['Capítulo ', 'Siguiente capítulo', 'Representar —', 'Álgebra:', 'Prerrequisitos', 'Hace posible', 'No permite', 'Anterior', 'Preguntas frecuentes', 'Fuentes base']) {
    if (body.includes(forbidden)) failures.push(`Spanish leakage ${JSON.stringify(forbidden)}`);
  }
  for (const selector of [
    '[data-demo="01-sistemas-numeracion"].num-wrap',
    '[data-demo="01-algebra-despejar"].alg-wrap',
    '[data-demo="01-cadena-deductiva"].ded-wrap',
    '[data-demo="01-timeline-representar"].rep-wrap',
  ]) {
    if (await page.locator(selector).count() !== 1) failures.push(`missing ${selector}`);
  }

  const numeralTabs = page.locator('[data-demo="01-sistemas-numeracion"] .num-tab');
  const numeralPanels = page.locator('[data-demo="01-sistemas-numeracion"] .num-panel');
  if (await numeralTabs.count() !== 4) failures.push(`expected four canonical numeral-system tabs, found ${await numeralTabs.count()}`);
  if (await numeralPanels.count() !== 4) failures.push(`expected four canonical numeral-system panels, found ${await numeralPanels.count()}`);
  const binaryTab = page.locator('[data-demo="01-sistemas-numeracion"] .num-tab[data-tab="binary"]');
  await binaryTab.click();
  if (!(await binaryTab.getAttribute('class'))?.includes('num-tab--active')) failures.push('number-system tabs did not switch to Binary');
  if (!(await page.locator('[data-demo="01-sistemas-numeracion"] .num-panel[data-panel="binary"]').getAttribute('class'))?.includes('num-panel--active')) failures.push('Binary number-system panel did not activate');

  const algebraSteps = page.locator('[data-demo="01-algebra-despejar"] .alg-s-item');
  if (await algebraSteps.count() !== 4) failures.push(`expected four canonical algebra steps, found ${await algebraSteps.count()}`);
  await page.locator('[data-demo="01-algebra-despejar"] #alg-next').click();
  if (!(await page.locator('[data-demo="01-algebra-despejar"] .alg-panel[data-panel="1"]').getAttribute('class'))?.includes('alg-panel--active')) failures.push('algebra stepper did not advance');

  const deductiveSteps = page.locator('[data-demo="01-cadena-deductiva"] .ded-step');
  if (await deductiveSteps.count() !== 4) failures.push(`expected four canonical deductive steps, found ${await deductiveSteps.count()}`);
  await page.locator('[data-demo="01-cadena-deductiva"] #ded-next').click();
  if (!(await page.locator('[data-demo="01-cadena-deductiva"] .ded-panel[data-panel="1"]').getAttribute('class'))?.includes('ded-panel--active')) failures.push('deductive stepper did not advance');

  const timeline = page.locator('[data-demo="01-timeline-representar"]');
  if (await timeline.locator('.rep-dot').count() !== 7) failures.push(`expected seven canonical timeline milestones, found ${await timeline.locator('.rep-dot').count()}`);
  if ((await timeline.locator('#repTitle').innerText()) !== 'The first counters') failures.push('unexpected first timeline milestone');
  await timeline.locator('#repNext').click();
  await page.waitForTimeout(300);
  if ((await timeline.locator('#repTitle').innerText()) !== 'Formal arithmetic') failures.push('representation timeline did not advance');

  const videos = page.locator('video[data-s5-inline-video-player]');
  if (await videos.count() !== 1) {
    failures.push(`expected one native-English chapter video, found ${await videos.count()}`);
  } else {
    const video = videos.first();
    const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
    const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
    if (sourceUrl.pathname !== '/en/series/from-cave-to-agi/01-representar.mp4') failures.push(`unexpected video source ${sourceUrl.pathname}`);
    if (posterUrl.pathname !== '/en/series/from-cave-to-agi/01-representar.jpg') failures.push(`unexpected video poster ${posterUrl.pathname}`);
  }

  const dims = await page.evaluate(()=>[document.documentElement.clientWidth,document.documentElement.scrollWidth]);
  if (dims[1] > dims[0] + 2) failures.push(`${viewport.name} horizontal overflow ${dims[1] - dims[0]}px`);
  if (viewport.name === 'desktop') await page.screenshot({path:path.join(outDir,'english-cave-01-represent.png'),fullPage:true,animations:'disabled'});
  await page.close();
}
await browser.close();
if (failures.length) { for (const failure of [...new Set(failures)]) console.error(failure); process.exit(1); }
console.log('English From Caves to AGI Chapter 1 QA passed: canonical narrative/visual structure, four interactions, native-English media, desktop/mobile clean.');
