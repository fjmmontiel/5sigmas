#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  { route: '/en/series/seguridad-ia/01-prompt-injection/', title: 'Chapter 1 — Prompt injection', concepts: ['control', 'untrusted', 'authorization'], demos: 3, prefix: 'sec-01-', screenshot: 'english-security-01-prompt-injection.png' },
  { route: '/en/series/seguridad-ia/02-jailbreaks/', title: 'Chapter 2 — Jailbreaks', concepts: ['attack budget', 'N=1', 'execution'], demos: 3, prefix: 'sec-02-', screenshot: 'english-security-02-jailbreaks.png' },
  { route: '/en/series/seguridad-ia/03-envenenamiento/', title: 'Chapter 3 — Poisoning', concepts: ['provenance', 'runtime memory', 'Sleeper Agents'], demos: 4, prefix: 'sec-03-', screenshot: 'english-security-03-poisoning.png' },
  { route: '/en/series/seguridad-ia/04-red-teaming/', title: 'Chapter 4 — Red teaming', concepts: ['trajectory', 'grader validity', 'release gate'], demos: 4, prefix: 'sec-04-', screenshot: 'english-security-04-red-teaming.png' },
  { route: '/en/series/seguridad-ia/05-controles-produccion/', title: 'Chapter 5 — Production controls', concepts: ['least privilege', 'MCP', 'kill path'], demos: 4, prefix: 'sec-05-', screenshot: 'english-security-05-production-controls.png' },
];

const forbidden = ['Capítulo ', 'Preguntas frecuentes', 'Prerrequisitos', 'Siguiente capítulo', 'Fuentes base'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;

try {
  for (const chapter of chapters) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${chapter.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${chapter.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(chapter.title)) failures.push(`${chapter.route}: missing English chapter title`);
      for (const concept of chapter.concepts) if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${chapter.route}: missing core concept ${concept}`);
      for (const token of forbidden) if (body.includes(token)) failures.push(`${chapter.route}: Spanish leakage ${JSON.stringify(token)}`);

      const demoValues = await page.locator('[data-demo^="sec-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
      if (demoValues.length !== chapter.demos) failures.push(`${chapter.route}: expected ${chapter.demos} teaching visuals, found ${demoValues.length}`);
      if (new Set(demoValues).size !== demoValues.length) failures.push(`${chapter.route}: duplicate data-demo visual identifiers`);
      for (const demo of demoValues) if (!demo?.startsWith(chapter.prefix)) failures.push(`${chapter.route}: unexpected visual identifier ${JSON.stringify(demo)}`);
      if (viewport.name === 'desktop') totalVisuals += demoValues.length;

      const details = page.locator('[data-demo^="sec-"] details');
      if (await details.count() === 0) failures.push(`${chapter.route}: visuals expose no interactive disclosure`);
      else {
        const candidate = details.first();
        const before = await candidate.getAttribute('open');
        await candidate.locator('summary').click();
        const after = await candidate.getAttribute('open');
        if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
      }

      if (await page.locator('video[data-s5-inline-video-player]').count()) failures.push(`${chapter.route}: unexpected inherited Spanish video`);
      if (await page.locator('audio').count()) failures.push(`${chapter.route}: unexpected inherited Spanish audio`);

      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${chapter.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const runtimeError of runtimeErrors) failures.push(`${chapter.route}: ${runtimeError}`);

      if (viewport.name === 'desktop') await page.screenshot({ path: path.join(outDir, chapter.screenshot), fullPage: true, animations: 'disabled' });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (totalVisuals !== 18) failures.push(`AI Security series: expected 18 native English visuals, found ${totalVisuals}`);
if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('Complete English AI Security QA passed: Chapters 1–5, 18 unique defensive visuals, interactions, no Spanish media inheritance, desktop/mobile clean.');
