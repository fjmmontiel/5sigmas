import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = path.resolve('artifacts/coding-visual-review/video-states');
const chapters = [
  '01-que-es-agent-harness',
  '02-contexto-workspace-sandboxing-aislamiento',
  '03-specs-planificacion-task-decomposition-checkpoints',
  '04-tools-permisos-approvals-hooks-secretos-trust-boundaries',
  '05-tests-verifiers-review-diffs-stop-conditions-evaluacion',
  '06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad',
];
const modes = [
  { name: 'desktop-normal', viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', mobile: false },
  { name: 'mobile-normal', viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', mobile: true },
  { name: 'desktop-reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', mobile: false },
  { name: 'mobile-reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', mobile: true },
];

function articleRoute(locale, stem) {
  return `${locale === 'en' ? '/en' : ''}/series/coding-agents-agent-harnesses/${stem}/`;
}

async function waitForSeek(video, target) {
  await video.evaluate(async (node, requested) => {
    const deadline = performance.now() + 10000;
    node.pause();
    node.currentTime = requested;
    while (node.seeking || Math.abs(node.currentTime - requested) > 0.25) {
      if (performance.now() > deadline) throw new Error(`seek timeout target=${requested} current=${node.currentTime}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }, target);
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const receipt = { generatedAt: new Date().toISOString(), series: 'coding-agents-agent-harnesses', states: [] };
try {
  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: mode.viewport,
      isMobile: mode.mobile,
      hasTouch: mode.mobile,
      reducedMotion: mode.reducedMotion,
    });
    try {
      for (const locale of ['es', 'en']) {
        for (const stem of chapters) {
          const page = await context.newPage();
          const runtime = { consoleErrors: [], pageErrors: [], requestFailures: [] };
          page.on('console', (message) => { if (message.type() === 'error') runtime.consoleErrors.push(message.text()); });
          page.on('pageerror', (error) => runtime.pageErrors.push(String(error)));
          page.on('requestfailed', (request) => {
            const failure = request.failure()?.errorText || 'unknown';
            if (!(failure.includes('ERR_ABORTED') && /\.(?:mp4|webm|ogg)(?:$|\?)/i.test(request.url()))) {
              runtime.requestFailures.push({ url: request.url(), failure });
            }
          });
          await page.goto(`${baseUrl}${articleRoute(locale, stem)}`, { waitUntil: 'networkidle' });
          const poster = page.locator('[data-s5-inline-video-start]');
          const video = page.locator('[data-s5-inline-video-player]');
          await poster.waitFor({ state: 'visible' });
          if (mode.mobile) await poster.tap();
          else { await poster.focus(); await page.keyboard.press('Enter'); }
          await video.waitFor({ state: 'visible' });
          await page.waitForFunction(() => {
            const node = document.querySelector('[data-s5-inline-video-player]');
            return Boolean(node && Number.isFinite(node.duration) && node.duration >= 35 && node.duration <= 37);
          }, null, { timeout: 10000 });
          const duration = await video.evaluate((node) => node.duration);
          const states = [
            ['start', 0.25],
            ['intermediate', duration * 0.5],
            ['final', Math.max(0, duration - 0.35)],
          ];
          for (const [state, target] of states) {
            await waitForSeek(video, target);
            const filename = `${locale}-${stem}-${mode.name}-${state}.png`;
            await video.screenshot({ path: path.join(outputDir, filename), type: 'png', animations: 'disabled' });
            receipt.states.push({ locale, stem, mode: mode.name, state, currentTime: await video.evaluate((node) => node.currentTime), duration, filename });
          }
          if (runtime.consoleErrors.length || runtime.pageErrors.length || runtime.requestFailures.length) {
            throw new Error(`${locale}/${stem}/${mode.name}: runtime errors ${JSON.stringify(runtime)}`);
          }
          await page.close();
        }
      }
    } finally {
      await context.close();
    }
  }
  if (receipt.states.length !== 144) throw new Error(`expected 144 video-state frames, got ${receipt.states.length}`);
  receipt.result = 'PASS';
  await fs.writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ result: 'PASS', videoStateFrames: receipt.states.length }));
} finally {
  await browser.close();
}
