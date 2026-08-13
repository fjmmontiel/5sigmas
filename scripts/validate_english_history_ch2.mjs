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
  if (!body.includes('Chapter 2 — Mechanize')) failures.push('missing English chapter title');
  for (const concept of ['programmable computer', 'Turing', 'stored-program']) if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`missing core concept ${concept}`);
  for (const forbidden of ['Capítulo ', 'Prerrequisitos', 'Siguiente capítulo', 'Mecanizar —']) if (body.includes(forbidden)) failures.push(`Spanish leakage ${JSON.stringify(forbidden)}`);
  for (const selector of ['.calc-limit','.logic-wrap','.turing-wrap','.stored-wrap','.mech-time']) if (await page.locator(selector).count() !== 1) failures.push(`missing ${selector}`);
  if (await page.locator('video[data-s5-inline-video-player]').count()) failures.push('unexpected inherited Spanish video');
  const dims = await page.evaluate(()=>[document.documentElement.clientWidth,document.documentElement.scrollWidth]);
  if (dims[1] > dims[0] + 2) failures.push(`${viewport.name} horizontal overflow`);
  if (viewport.name === 'desktop') await page.screenshot({path:path.join(outDir,'english-history-02-mechanize.png'),fullPage:true});
  await page.close();
}
await browser.close();
if (failures.length) { for (const failure of failures) console.error(failure); process.exit(1); }
console.log('English history chapter 2 QA passed.');
