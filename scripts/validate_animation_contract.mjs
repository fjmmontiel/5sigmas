import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const currentBase = (process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const previousBase = (process.env.S5_BASE_PREVIEW_URL || '').replace(/\/$/, '');
const changedFilesPath = process.env.S5_CHANGED_FILES_FILE || '';
const outputDir = path.resolve(process.env.S5_ANIMATION_CONTRACT_DIR || 'artifacts/visual-review/animation-contract');
const docsDir = path.resolve('docs');
const fallbackUrls = [
  '/series/seguridad-ia/01-prompt-injection/',
  '/series/agentes-ia/01-que-es-un-agente/',
  '/series/multimodalidad-iag/03-arquitecturas/',
  '/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/',
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function sourceUrl(file) {
  const rel = file.replace(/^docs\//, '').replace(/\.md$/, '');
  if (!rel.startsWith('series/') && !rel.startsWith('articulos-tecnicos/')) return null;
  if (rel.endsWith('/index')) return `/${rel.slice(0, -'/index'.length)}/`;
  return `/${rel}/`;
}

async function readChangedFiles() {
  if (!changedFilesPath) return [];
  try {
    return (await fs.readFile(changedFilesPath, 'utf8')).split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveScope(changed) {
  const urls = new Set();
  const demos = new Set();
  for (const file of changed) {
    if (/^docs\/(series|articulos-tecnicos)\/.*\.md$/.test(file)) {
      const url = sourceUrl(file);
      if (url) urls.add(url);
    }
    if (/^docs\/snippets\/.*\.html$/.test(file)) {
      try {
        const text = await fs.readFile(path.resolve(file), 'utf8');
        for (const match of text.matchAll(/data-demo=["']([^"']+)["']/g)) demos.add(match[1]);
      } catch {
        // A deleted snippet has no current DOM to validate.
      }
    }
  }

  const snippetPaths = changed.filter((file) => /^docs\/snippets\/.*\.html$/.test(file)).map((file) => file.replace(/^docs\//, ''));
  if (snippetPaths.length) {
    const markdown = (await walk(docsDir)).filter((file) => file.endsWith('.md'));
    for (const source of markdown) {
      const text = await fs.readFile(source, 'utf8');
      if (!snippetPaths.some((snippet) => text.includes(snippet))) continue;
      const repoPath = path.relative(process.cwd(), source).split(path.sep).join('/');
      const url = sourceUrl(repoPath);
      if (url) urls.add(url);
    }
  }

  if (!urls.size) fallbackUrls.forEach((url) => urls.add(url));
  return { urls: [...urls].sort(), demos };
}

async function inspect(page, base, url) {
  const response = await page.goto(`${base}${url}`, { waitUntil: 'load', timeout: 30_000 });
  if (!response?.ok()) return { status: response?.status() || 0, overflow: null, shells: [] };
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(60);
  return page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.02 && rect.width > 0 && rect.height > 0;
    };
    const shells = [...document.querySelectorAll('.anim-brand-shell')].map((root, index) => {
      const demoRoot = root.matches('[data-demo]') ? root : root.querySelector('[data-demo]');
      const authorRoot = demoRoot || root;
      const leaves = [...authorRoot.querySelectorAll('*')].filter((node) => visible(node) && node.children.length === 0 && Boolean((node.textContent || '').trim()));
      const fonts = leaves.map((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0')).filter((value) => Number.isFinite(value) && value > 0);
      const rect = root.getBoundingClientRect();
      const controls = [...authorRoot.querySelectorAll('button,input,select,textarea,[role="tab"]')].filter(visible);
      return {
        index: index + 1,
        demo: demoRoot?.getAttribute('data-demo') || `index-${index + 1}`,
        words: (authorRoot.innerText || '').trim().split(/\s+/).filter(Boolean).length,
        textLeaves: leaves.length,
        minTextPx: fonts.length ? Math.min(...fonts) : null,
        width: rect.width,
        height: rect.height,
        controls: controls.length,
        fullscreenOff: demoRoot?.getAttribute('data-anim-fullscreen') === 'off',
      };
    });
    return {
      status: 200,
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      shells,
    };
  });
}

function key(shell) {
  return shell.demo || `index-${shell.index}`;
}

function compare(current, previous, context, isChanged) {
  const violations = [];
  const label = `${context.url} · ${context.viewport} · ${current.demo}`;

  if (isChanged) {
    if (current.minTextPx !== null && current.minTextPx < 11) {
      violations.push(`${label}: changed demo uses ${current.minTextPx.toFixed(1)}px text (<11px).`);
    }
    if (current.controls === 0 && !current.fullscreenOff) {
      violations.push(`${label}: static demo must set data-anim-fullscreen="off".`);
    }
  }

  if (!previous) return violations;
  const growth = (value, old, ratio, absolute) => value > Math.max(old * ratio, old + absolute);
  if (growth(current.words, previous.words, 1.20, 12)) {
    violations.push(`${label}: words regressed ${previous.words} → ${current.words} (>20%).`);
  }
  if (growth(current.textLeaves, previous.textLeaves, 1.20, 3)) {
    violations.push(`${label}: visible labels regressed ${previous.textLeaves} → ${current.textLeaves} (>20%).`);
  }
  if (current.minTextPx !== null && previous.minTextPx !== null && current.minTextPx < previous.minTextPx - 0.5) {
    violations.push(`${label}: minimum text shrank ${previous.minTextPx.toFixed(1)}px → ${current.minTextPx.toFixed(1)}px.`);
  }
  if (growth(current.height, previous.height, 1.15, 80)) {
    violations.push(`${label}: shell height regressed ${Math.round(previous.height)}px → ${Math.round(current.height)}px (>15%).`);
  }
  if (current.controls > previous.controls + 2) {
    violations.push(`${label}: controls increased ${previous.controls} → ${current.controls}.`);
  }
  return violations;
}

function safe(value) {
  return value.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9_-]+/g, '__') || 'home';
}

const changed = await readChangedFiles();
const scope = await resolveScope(changed);
const browser = await chromium.launch({ headless: true });
const report = {
  currentBase,
  previousBase: previousBase || null,
  changedDemos: [...scope.demos].sort(),
  urls: scope.urls,
  comparisons: [],
  violations: [],
};

try {
  const viewports = [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, mobile: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
  ];

  for (const config of viewports) {
    const currentPage = await browser.newPage({ viewport: config.viewport, isMobile: config.mobile });
    const previousPage = previousBase ? await browser.newPage({ viewport: config.viewport, isMobile: config.mobile }) : null;

    for (const url of scope.urls) {
      const current = await inspect(currentPage, currentBase, url);
      if (current.status !== 200) {
        report.violations.push(`${url} · ${config.name}: current preview returned ${current.status}.`);
        continue;
      }
      if ((current.overflow || 0) > 2) {
        report.violations.push(`${url} · ${config.name}: document has ${Math.round(current.overflow)}px horizontal overflow.`);
      }

      const previous = previousPage ? await inspect(previousPage, previousBase, url) : { status: 0, overflow: 0, shells: [] };
      const previousMap = new Map(previous.shells.map((shell) => [key(shell), shell]));

      for (const shell of current.shells) {
        const old = previousMap.get(key(shell));
        const changedDemo = scope.demos.has(shell.demo) || !old;
        const violations = compare(shell, old, { url, viewport: config.name }, changedDemo);
        report.violations.push(...violations);
        report.comparisons.push({ url, viewport: config.name, current: shell, previous: old || null, changedDemo, violations });

        if (changedDemo) {
          const locator = currentPage.locator('.anim-brand-shell').nth(shell.index - 1);
          if (await locator.count()) {
            await locator.scrollIntoViewIfNeeded();
            const prefix = `${safe(url)}__${safe(shell.demo)}__${config.name}`;
            await locator.screenshot({ path: path.join(outputDir, `${prefix}__default.png`), animations: 'disabled' });
            const buttons = locator.locator('[data-demo] button:visible:not([disabled])');
            if (await buttons.count() > 1) {
              await buttons.last().click();
              await currentPage.waitForTimeout(100);
              const overflow = await currentPage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
              if (overflow > 2) report.violations.push(`${url} · ${config.name} · ${shell.demo}: interaction introduced ${Math.round(overflow)}px overflow.`);
              await locator.screenshot({ path: path.join(outputDir, `${prefix}__interaction.png`), animations: 'disabled' });
            }
          }
        }
      }
    }
    await currentPage.close();
    if (previousPage) await previousPage.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.violations.length) {
  console.error(`Animation contract failed with ${report.violations.length} violation(s):`);
  for (const violation of report.violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log(`Animation contract passed for ${report.comparisons.length} shell/viewport comparisons across ${scope.urls.length} page(s).`);
