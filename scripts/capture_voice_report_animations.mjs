import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const reports = [
  {
    path: '/articulos-tecnicos/reactive-proactive-voice-agents/',
    animations: [
      ['reactive-panorama', '.vrpv-panorama'],
      ['reactive-clocks', '.vrpv-clock'],
      ['reactive-barge-in', '.vrpv-barge'],
      ['reactive-runtime', '.vrpv-runtime'],
    ],
  },
  {
    path: '/articulos-tecnicos/voice-agent-architectures/',
    animations: [
      ['architectures-comparison', '.varch-compare'],
      ['architectures-latency', '.varch-latency'],
      ['architectures-prosody', '.varch-prosody'],
      ['architectures-surface-plane', '.varch-surface'],
    ],
  },
];

const viewports = [
  ['desktop', { viewport: { width: 1440, height: 1000 } }],
  ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
];

function columnCount(value) {
  if (!value || value === 'none') return 0;
  return value.trim().split(/\s+/).length;
}

async function assertNoOverflow(shell, label) {
  const result = await shell.evaluate((node) => {
    const viewport = node.querySelector('.anim-brand-shell__viewport');
    const root = viewport?.firstElementChild;
    return {
      shell: [node.clientWidth, node.scrollWidth],
      viewport: viewport ? [viewport.clientWidth, viewport.scrollWidth] : null,
      root: root ? [root.clientWidth, root.scrollWidth] : null,
      pageScrollX: window.scrollX,
      document: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
    };
  });

  for (const [name, pair] of Object.entries(result)) {
    if (!Array.isArray(pair)) continue;
    if (pair[1] - pair[0] > 2) {
      throw new Error(`${label}: horizontal overflow in ${name}: ${pair[0]} / ${pair[1]}`);
    }
  }
  if (result.pageScrollX !== 0 || result.document[1] - result.document[0] > 2) {
    throw new Error(`${label}: page-level horizontal overflow: ${JSON.stringify(result)}`);
  }
}

async function assertResponsiveMode(page, selector, mode) {
  const values = await page.locator(selector).evaluate((root) => {
    const get = (query, property) => {
      const node = root.querySelector(query);
      return node ? getComputedStyle(node)[property] : null;
    };
    return {
      panorama: get('.vrpv__flow', 'gridTemplateColumns'),
      clocks: get('.vrpv-clock__lane', 'gridTemplateColumns'),
      barge: get('.vrpv-barge__sequence', 'gridTemplateColumns'),
      runtime: get('.vrpv-runtime__layout', 'gridTemplateColumns'),
      compareLane: get('.varch-compare__lane', 'gridTemplateColumns'),
      comparePipe: get('.varch-compare__pipe', 'flexDirection'),
      latency: get('.varch-latency__body', 'gridTemplateColumns'),
      latencyRow: get('.varch-latency__row', 'gridTemplateColumns'),
      prosodyRoutes: get('.varch-prosody__routes', 'gridTemplateColumns'),
      prosodyPipe: get('.varch-prosody__pipe', 'flexDirection'),
      surface: get('.varch-surface__architecture', 'gridTemplateColumns'),
    };
  });

  const checks = {
    '.vrpv-panorama': ['panorama', mode === 'mobile' ? 1 : 5],
    '.vrpv-clock': ['clocks', mode === 'mobile' ? 1 : 2],
    '.vrpv-barge': ['barge', mode === 'mobile' ? 1 : 5],
    '.vrpv-runtime': ['runtime', mode === 'mobile' ? 1 : 3],
    '.varch-compare': ['compareLane', mode === 'mobile' ? 1 : 3],
    '.varch-latency': ['latency', mode === 'mobile' ? 1 : 2],
    '.varch-prosody': ['prosodyRoutes', mode === 'mobile' ? 1 : 3],
    '.varch-surface': ['surface', mode === 'mobile' ? 1 : 3],
  };

  const [key, expected] = checks[selector];
  const actual = columnCount(values[key]);
  if (actual !== expected) {
    throw new Error(`${mode} ${selector}: expected ${expected} columns, got ${actual} (${values[key]})`);
  }

  if (mode === 'mobile' && selector === '.varch-compare' && values.comparePipe !== 'column') {
    throw new Error(`mobile comparison pipe must be vertical, got ${values.comparePipe}`);
  }
  if (mode === 'mobile' && selector === '.varch-latency' && columnCount(values.latencyRow) !== 1) {
    throw new Error(`mobile latency row must use the full width, got ${values.latencyRow}`);
  }
  if (mode === 'mobile' && selector === '.varch-prosody' && values.prosodyPipe !== 'column') {
    throw new Error(`mobile prosody pipe must be vertical, got ${values.prosodyPipe}`);
  }
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const [mode, pageOptions] of viewports) {
    const page = await browser.newPage(pageOptions);

    for (const report of reports) {
      await page.goto(`${baseUrl}${report.path}`, { waitUntil: 'networkidle' });
      await page.emulateMedia({ reducedMotion: 'reduce' });

      for (const [name, selector] of report.animations) {
        const root = page.locator(selector);
        await root.waitFor({ state: 'visible' });
        const shell = root.locator('xpath=ancestor::*[@data-anim-shell][1]');
        await shell.scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);

        await assertNoOverflow(shell, `${mode} ${name}`);
        await assertResponsiveMode(page, selector, mode);

        await shell.screenshot({
          path: `${outputDir}/voice-${name}-${mode}.png`,
          animations: 'disabled',
        });
      }
    }

    await page.close();
  }
} finally {
  await browser.close();
}
