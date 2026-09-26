import { chromium } from 'playwright';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';

const series = [
  'fundamentos-ia-iag',
  'from-cave-to-agi',
  'multimodalidad-iag',
  'modelos-razonadores',
  'ia-pib-bienestar-energia',
  'datacenters-espacio',
  'seguridad-ia',
];

const routes = [];
for (const locale of ['es', 'en']) {
  const prefix = locale === 'en' ? '/en' : '';
  for (const slug of series) {
    routes.push({ locale, slug, path: `${prefix}/series/${slug}/00_presentacion_serie/` });
  }
  routes.push({ locale, slug: 'seguridad-ia-01', path: `${prefix}/series/seguridad-ia/01-prompt-injection/` });
}

const profiles = [
  { name: 'desktop-normal', reducedMotion: 'no-preference' },
  { name: 'desktop-reduced', reducedMotion: 'reduce' },
];

const failures = [];
const evidence = [];
let mutationDetected = false;

const snapshot = (page) => page.evaluate(() => ({
  viewportWidth: document.documentElement.clientWidth,
  documentScrollWidth: document.documentElement.scrollWidth,
  tooltip: [...document.querySelectorAll('.md-tooltip2[role="tooltip"]')].at(-1) ? (() => {
    const tooltip = [...document.querySelectorAll('.md-tooltip2[role="tooltip"]')].at(-1);
    const inner = tooltip.querySelector('.md-tooltip2__inner');
    const rect = inner?.getBoundingClientRect();
    const style = inner ? getComputedStyle(inner) : null;
    return {
      id: tooltip.id || null,
      active: tooltip.classList.contains('md-tooltip2--active'),
      text: (tooltip.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      inner: rect ? {
        left: Number(rect.left.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        computedInlineSize: style.inlineSize,
        computedMaxInlineSize: style.maxInlineSize,
      } : null,
    };
  })() : null,
}));

let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });

  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      reducedMotion: profile.reducedMotion,
      colorScheme: 'light',
    });
    const page = await context.newPage();

    for (const route of routes) {
      const label = `${route.locale}/${route.slug}/${profile.name}`;
      try {
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
        await page.evaluate(() => document.fonts.ready);

        const baseline = await snapshot(page);
        if (baseline.documentScrollWidth > baseline.viewportWidth + 4) {
          throw new Error(`baseline global overflow ${baseline.viewportWidth}->${baseline.documentScrollWidth}`);
        }

        const permalink = page.locator('.md-typeset .headerlink').first();
        if (await permalink.count() !== 1) throw new Error('no article permalink available for real tooltip activation');
        await permalink.scrollIntoViewIfNeeded();
        await permalink.hover();
        await page.waitForTimeout(profile.reducedMotion === 'reduce' ? 80 : 450);

        const active = await snapshot(page);
        if (!active.tooltip?.inner) throw new Error('Material inline tooltip was not mounted after hover');
        if (active.documentScrollWidth > active.viewportWidth + 4) {
          throw new Error(`active tooltip global overflow ${active.viewportWidth}->${active.documentScrollWidth}`);
        }
        if (active.tooltip.inner.right > active.viewportWidth + 4 || active.tooltip.inner.left < -4) {
          throw new Error(`tooltip bounds escape viewport ${JSON.stringify(active.tooltip.inner)}`);
        }
        if (active.tooltip.inner.width > 420) {
          throw new Error(`inline tooltip failed shrink-wrap contract ${JSON.stringify(active.tooltip.inner)}`);
        }

        await page.mouse.move(1, 1);
        await page.keyboard.press('Escape');
        await page.evaluate(() => document.activeElement?.blur?.());
        await page.waitForTimeout(300);
        const dismissed = await snapshot(page);
        if (dismissed.documentScrollWidth > dismissed.viewportWidth + 4) {
          throw new Error(`dismissed tooltip global overflow ${dismissed.viewportWidth}->${dismissed.documentScrollWidth}`);
        }

        evidence.push({ label, baseline, active, dismissed });

        if (!mutationDetected && profile.name === 'desktop-normal' && route.locale === 'en' && route.slug === 'seguridad-ia') {
          await page.addStyleTag({ content: `
            .md-tooltip2[role="tooltip"] > .md-tooltip2__inner {
              inline-size: 100vw !important;
              max-inline-size: none !important;
            }
          ` });
          await permalink.hover();
          await page.waitForTimeout(450);
          const mutated = await snapshot(page);
          mutationDetected = mutated.documentScrollWidth > mutated.viewportWidth + 4;
          if (!mutationDetected) {
            failures.push(`${label}: negative mutation did not reproduce horizontal overflow`);
          }
        }
      } catch (error) {
        failures.push(`${label}: ${error.message}`);
      }
    }

    await context.close();
  }
} finally {
  if (browser) await browser.close();
}

if (!mutationDetected) failures.push('negative mutation detector never observed the known viewport-width tooltip failure');

const summary = {
  scope: 'material-inline-tooltip-overflow-regression',
  golden: false,
  routes: routes.length,
  profiles: profiles.map((profile) => profile.name),
  expectedContexts: routes.length * profiles.length,
  observedContexts: evidence.length,
  mutationDetected,
  failures,
};
console.log(JSON.stringify(summary));
if (failures.length) process.exit(1);
