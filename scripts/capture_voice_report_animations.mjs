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
      contrastMode: node.getAttribute('data-anim-contrast'),
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
  if (result.contrastMode !== 'off') {
    throw new Error(`${label}: the shared animation shell is overriding the microlab colour semantics (${result.contrastMode})`);
  }
}

async function assertVisualDensity(root, label, mode) {
  const metrics = await root.evaluate((node) => {
    const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
    const interactive = node.querySelectorAll('button, input').length;
    const rect = node.getBoundingClientRect();
    const tinyText = [...node.querySelectorAll('b, span, p, small, em, code')]
      .map((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === 'string' ? el.className : '',
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
          size: Number.parseFloat(style.fontSize),
          width: box.width,
          height: box.height,
        };
      })
      .filter((item) => item.width > 0 && item.height > 0 && item.size < 9);
    return { chars: text.length, interactive, width: rect.width, height: rect.height, tinyText };
  });

  if (metrics.chars > 330) {
    throw new Error(`${label}: the visual duplicates too much prose (${metrics.chars} visible characters)`);
  }
  if (metrics.tinyText.length > 0) {
    throw new Error(`${label}: visible text below 9px: ${JSON.stringify(metrics.tinyText)}`);
  }
  if (mode === 'mobile' && metrics.width > 366) {
    throw new Error(`${label}: mobile visual is wider than the usable column (${metrics.width}px)`);
  }
  if (mode === 'mobile' && metrics.height > 900) {
    throw new Error(`${label}: mobile visual behaves like a mega-deck (${metrics.height}px high)`);
  }
}

async function assertFocusIsolation(page, label) {
  await page.waitForFunction(() => document.body.classList.contains('s5-voice-animation-focus'), null, { timeout: 3000 });
  const blockers = await page.evaluate(() => {
    const selectors = ['.md-header', '.md-tabs', '.s5-reader-topbar', '.s5-reader-rail', '.s5-reader-direct-toggle'];
    return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const visible = box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05;
      return { selector, visible, display: style.display, visibility: style.visibility, opacity: style.opacity };
    }));
  });

  const visible = blockers.filter((item) => item.visible);
  if (visible.length > 0) {
    throw new Error(`${label}: sticky site chrome overlaps the focused microlab: ${JSON.stringify(visible)}`);
  }
}

async function assertTextContrast(root, label) {
  const failures = await root.evaluate((node) => {
    const parse = (value) => {
      const match = value.match(/[\d.]+/g);
      if (!match || match.length < 3) return null;
      return match.slice(0, 3).map(Number);
    };
    const luminance = (rgb) => {
      const linear = rgb.map((value) => {
        const channel = value / 255;
        return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    };
    const ratio = (foreground, background) => {
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    };
    const backgroundOf = (element) => {
      let current = element;
      while (current && current !== node.parentElement) {
        const value = getComputedStyle(current).backgroundColor;
        const rgba = value.match(/[\d.]+/g)?.map(Number) || [];
        if (rgba.length >= 3 && (rgba.length < 4 || rgba[3] > .92)) return parse(value);
        current = current.parentElement;
      }
      return [255, 255, 255];
    };

    const targets = [
      ...node.querySelectorAll('[aria-pressed="true"]'),
      ...node.querySelectorAll('.s5v__rule b, .s5v__rule span'),
      ...node.querySelectorAll('.s5v-runtime__bus b, .s5v-runtime__bus code'),
      ...node.querySelectorAll('.s5v-voice-prompt__pack'),
    ];

    return targets.map((element) => {
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const background = backgroundOf(element);
      const box = element.getBoundingClientRect();
      if (!foreground || !background || box.width === 0 || box.height === 0) return null;
      const value = ratio(foreground, background);
      return {
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        foreground: style.color,
        background,
        ratio: Number(value.toFixed(2)),
      };
    }).filter((item) => item && item.ratio < 4.2);
  });

  if (failures.length > 0) {
    throw new Error(`${label}: insufficient text contrast: ${JSON.stringify(failures)}`);
  }
}

async function prepareAnimation(page, selector, step) {
  const root = page.locator(selector);
  await root.waitFor({ state: 'visible' });
  if (step) {
    const button = root.locator(`[data-s5v-step="${step}"]`);
    if (await button.count()) await button.click();
    else await root.evaluate((node, value) => {
      node.dataset.s5vPaused = 'true';
      node.dataset.step = String(value);
      node.style.setProperty('--s5v-step', String(value));
      const stepValue = node.querySelector('[data-s5v-step-value]');
      if (stepValue) stepValue.textContent = String(value);
      if (node.classList.contains('s5v-batch')) {
        const count = node.querySelector('.s5v-batch__progress b');
        if (count) count.textContent = value >= 4 ? '3/3' : `${Math.max(0, value - 1)}/3`;
      }
    }, step);
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
        await root.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
        await page.waitForTimeout(320);

        await assertNoOverflow(shell, `${mode} ${name}`);
        await assertVisualDensity(root, `${mode} ${name}`, mode);
        await assertFocusIsolation(page, `${mode} ${name}`);
        await assertTextContrast(root, `${mode} ${name}`);

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
