import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const reports = [
  {
    path: '/articulos-tecnicos/reactive-proactive-voice-agents/',
    animations: [
      ['rp-contract', '.s5v-contract', 3],
      ['rp-safe-window', '.s5v-window', 2],
      ['rp-clocks', '.s5v-clocks'],
      ['rp-activity-gate', '.s5v-gate', 2],
      ['rp-barge-in', '.s5v-barge', 2],
      ['rp-batch', '.s5v-batch', 4],
      ['rp-runtime', '.s5v-runtime'],
    ],
  },
  {
    path: '/articulos-tecnicos/voice-agent-architectures/',
    animations: [
      ['arch-map', '.s5v-arch-map', 2],
      ['arch-cascade', '.s5v-cascade', 5],
      ['arch-prosody-loss', '.s5v-prosody-loss', 2],
      ['arch-half-cascade', '.s5v-half'],
      ['arch-speech-plan', '.s5v-speech-plan'],
      ['arch-duplex', '.s5v-duplex'],
      ['arch-latency', '.s5v-latency'],
      ['arch-decision', '.s5v-decision', 2],
      ['arch-surface-plane', '.s5v-surface'],
      ['arch-voice-prompt', '.s5v-voice-prompt'],
    ],
  },
];

const viewports = [
  ['desktop', { viewport: { width: 1440, height: 1000 } }],
  ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
];

async function assertNoOverflow(shell, label) {
  const result = await shell.evaluate((node) => {
    const viewport = node.querySelector('.anim-brand-shell__viewport');
    const visual = viewport?.querySelector('.s5v');
    return {
      shell: [node.clientWidth, node.scrollWidth],
      viewport: viewport ? [viewport.clientWidth, viewport.scrollWidth] : null,
      visual: visual ? [visual.clientWidth, visual.scrollWidth] : null,
      document: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
      scrollX: window.scrollX,
    };
  });

  for (const [name, pair] of Object.entries(result)) {
    if (!Array.isArray(pair)) continue;
    if (pair[1] - pair[0] > 2) {
      throw new Error(`${label}: horizontal overflow in ${name}: ${pair[0]} / ${pair[1]}`);
    }
  }
  if (result.scrollX !== 0 || result.document[1] - result.document[0] > 2) {
    throw new Error(`${label}: page-level horizontal overflow: ${JSON.stringify(result)}`);
  }
}

async function assertVisualDensity(root, label, mode) {
  const metrics = await root.evaluate((node) => {
    const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
    const interactive = node.querySelectorAll('button, input').length;
    const rect = node.getBoundingClientRect();
    const tinyText = [...node.querySelectorAll('b, span, p, small, em, code')]
      .filter((el) => {
        const style = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && Number.parseFloat(style.fontSize) < 9;
      })
      .length;
    return { chars: text.length, interactive, width: rect.width, height: rect.height, tinyText };
  });

  if (metrics.chars > 330) {
    throw new Error(`${label}: the visual duplicates too much prose (${metrics.chars} visible characters)`);
  }
  if (metrics.tinyText > 0) {
    throw new Error(`${label}: contains ${metrics.tinyText} visible text elements below 9px`);
  }
  if (mode === 'mobile' && metrics.width > 366) {
    throw new Error(`${label}: mobile visual is wider than the usable column (${metrics.width}px)`);
  }
  if (mode === 'mobile' && metrics.height > 900) {
    throw new Error(`${label}: mobile visual behaves like a mega-deck (${metrics.height}px high)`);
  }
}

async function prepareAnimation(page, selector, step) {
  const root = page.locator(selector);
  await root.waitFor({ state: 'visible' });
  if (step) {
    const button = root.locator(`[data-s5v-step="${step}"]`);
    if (await button.count()) await button.click();
    else await root.evaluate((node, value) => { node.dataset.step = String(value); }, step);
  }
  if (selector === '.s5v-speech-plan') {
    await root.locator('input[data-s5v-var="energy"]').fill('68');
    await root.locator('input[data-s5v-var="pace"]').fill('104');
  }
  return root;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const [mode, pageOptions] of viewports) {
    const page = await browser.newPage(pageOptions);

    for (const report of reports) {
      await page.goto(`${baseUrl}${report.path}`, { waitUntil: 'networkidle' });

      for (const [name, selector, step] of report.animations) {
        const root = await prepareAnimation(page, selector, step);
        const shell = root.locator('xpath=ancestor::*[@data-anim-shell][1]');
        await shell.scrollIntoViewIfNeeded();
        await page.waitForTimeout(220);

        await assertNoOverflow(shell, `${mode} ${name}`);
        await assertVisualDensity(root, `${mode} ${name}`, mode);

        await shell.screenshot({
          path: `${outputDir}/voice-${name}-${mode}.png`,
          animations: 'disabled',
        });
      }

      const pageName = report.path.includes('reactive-proactive') ? 'reactive-report' : 'architectures-report';
      await page.screenshot({
        path: `${outputDir}/voice-${pageName}-${mode}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }

    await page.close();
  }
} finally {
  await browser.close();
}
