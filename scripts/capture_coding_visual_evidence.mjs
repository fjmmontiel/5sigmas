#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/coding-visual-evidence/pages');
await fs.mkdir(outDir, { recursive: true });

const slugs = [
  '01-que-es-agent-harness',
  '02-contexto-workspace-sandboxing-aislamiento',
  '03-specs-planificacion-task-decomposition-checkpoints',
  '04-tools-permisos-approvals-hooks-secretos-trust-boundaries',
  '05-tests-verifiers-review-diffs-stop-conditions-evaluacion',
  '06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad',
];
const routes = slugs.flatMap((slug) => [
  { locale: 'es', slug, route: `/series/coding-agents-agent-harnesses/${slug}/` },
  { locale: 'en', slug, route: `/en/series/coding-agents-agent-harnesses/${slug}/` },
]);
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];
const motions = [
  { name: 'normal', reducedMotion: 'no-preference' },
  { name: 'reduced', reducedMotion: 'reduce' },
];

const failures = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const entry of routes) {
    for (const viewport of viewports) {
      for (const motion of motions) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch,
          reducedMotion: motion.reducedMotion,
        });
        const page = await context.newPage();
        const runtimeErrors = [];
        const consoleErrors = [];
        page.on('pageerror', (error) => runtimeErrors.push(error.message));
        page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        const response = await page.goto(`${base}${entry.route}`, { waitUntil: 'networkidle' });
        if (!response?.ok()) failures.push(`${entry.route} ${viewport.name}/${motion.name}: HTTP ${response?.status() ?? 'none'}`);
        const state = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          h1: document.querySelectorAll('main h1').length,
          lang: document.documentElement.lang,
        }));
        if (state.scrollWidth > state.clientWidth + 1) failures.push(`${entry.route} ${viewport.name}/${motion.name}: page overflow ${JSON.stringify(state)}`);
        if (state.h1 !== 1) failures.push(`${entry.route} ${viewport.name}/${motion.name}: expected one H1, got ${state.h1}`);
        if (!String(state.lang).toLowerCase().startsWith(entry.locale)) failures.push(`${entry.route} ${viewport.name}/${motion.name}: wrong lang ${state.lang}`);
        for (const error of runtimeErrors) failures.push(`${entry.route} ${viewport.name}/${motion.name}: runtime ${error}`);
        for (const error of consoleErrors.filter((text) => !/favicon|Failed to load resource.*404/i.test(text))) failures.push(`${entry.route} ${viewport.name}/${motion.name}: console ${error}`);
        await page.screenshot({
          path: path.join(outDir, `${entry.slug}-${entry.locale}-${viewport.name}-${motion.name}-page.jpg`),
          fullPage: true,
          type: 'jpeg',
          quality: 78,
          animations: 'disabled',
        });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding visual evidence capture failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Captured ${routes.length * viewports.length * motions.length} full-page Coding route×locale×viewport×motion screenshots.`);
