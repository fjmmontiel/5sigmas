#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/02-mecanizar/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
for (const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
  const page = await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
  const response = await page.goto(`${base}${route}`,{waitUntil:'networkidle'});
  if (!response?.ok()) failures.push(`HTTP ${response?.status() ?? 'no response'}`);
  const body = await page.locator('body').innerText();
  if (!body.includes('Chapter 2: Mechanize')) failures.push('missing canonical English chapter title');

  const canonicalNarrative = [
    'Pascaline',
    'Step Reckoner',
    'Jacquard loom',
    'Analytical Engine',
    'Ada Lovelace',
    'Boolean algebra',
    'A Symbolic Analysis of Relay and Switching Circuits',
    'halting problem',
    'A Mathematical Theory of Communication',
    'stored-program concept',
    'Manchester Baby',
    'EDSAC',
    'Dartmouth Summer Research Project on Artificial Intelligence',
    'Chapter 3 — Learn',
    'Core sources',
    'What is the difference between automating and programming?'
  ];
  for (const phrase of canonicalNarrative) if (!body.includes(phrase)) failures.push(`missing canonical narrative phrase ${JSON.stringify(phrase)}`);

  const optional = page.locator('details.s5-optional');
  if (await optional.count() !== 1) failures.push(`expected canonical halting-problem disclosure, found ${await optional.count()}`);
  const referenceRows = page.locator('table tbody tr');
  if (await referenceRows.count() < 15) failures.push(`expected at least 15 canonical reference rows, found ${await referenceRows.count()}`);

  for (const forbidden of ['Capítulo ', 'Prerrequisitos', 'Siguiente capítulo', 'Mecanizar —', 'Fuentes base', 'Preguntas frecuentes']) if (body.includes(forbidden)) failures.push(`Spanish leakage ${JSON.stringify(forbidden)}`);
  for (const selector of ['.calc-limit','.logic-wrap','.turing-wrap','.stored-wrap','.mech-time']) if (await page.locator(selector).count() !== 1) failures.push(`missing ${selector}`);
  const videos = page.locator('video[data-s5-inline-video-player]');
  if (await videos.count() !== 1) {
    failures.push(`expected one native-English chapter video, found ${await videos.count()}`);
  } else {
    const video = videos.first();
    const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
    const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
    if (sourceUrl.pathname !== '/en/series/from-cave-to-agi/02-mecanizar.mp4') failures.push(`unexpected video source ${sourceUrl.pathname}`);
    if (posterUrl.pathname !== '/en/series/from-cave-to-agi/02-mecanizar.jpg') failures.push(`unexpected video poster ${posterUrl.pathname}`);
  }
  const dims = await page.evaluate(()=>[document.documentElement.clientWidth,document.documentElement.scrollWidth]);
  if (dims[1] > dims[0] + 2) failures.push(`${viewport.name} horizontal overflow`);
  if (viewport.name === 'desktop') await page.screenshot({path:path.join(outDir,'english-history-02-mechanize.png'),fullPage:true});
  await page.close();
}
await browser.close();
if (failures.length) { for (const failure of failures) console.error(failure); process.exit(1); }
console.log('English history chapter 2 QA passed with canonical narrative and native-English media.');
