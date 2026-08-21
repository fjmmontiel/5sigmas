import { chromium } from 'playwright';

const base = process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const cases = [
  { path: '/herramientas/amenazas-prompt-injection/', locale: 'es' },
  { path: '/en/tools/prompt-injection-threat/', locale: 'en' }
];
const widths = [390, 1440];
const browser = await chromium.launch({ headless: true });
try {
  for (const c of cases) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      await page.goto(`${base}${c.path}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-s5-prompt-injection]');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (overflow) throw new Error(`${c.path} overflows at ${width}px`);
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      const parsed = JSON.parse(jsonLd);
      if (parsed['@type'] !== 'WebApplication') throw new Error(`${c.path} missing WebApplication JSON-LD`);
      const preset = page.locator('[data-field="preset"]');
      await preset.selectOption('privileged-agent');
      if ((await page.locator('[data-output="reachablePaths"]').textContent()) !== '5') throw new Error(`${c.path} privileged preset should expose 5 modeled paths`);
      await page.locator('[data-field="quarantineReader"]').check();
      if ((await page.locator('[data-output="reachablePaths"]').textContent()) !== '0') throw new Error(`${c.path} indirect quarantine should block modeled privileged influence`);
      await page.locator('[data-field="vector"]').selectOption('direct');
      if ((await page.locator('[data-output="reachablePaths"]').textContent()) === '0') throw new Error(`${c.path} must not claim quarantine blocks direct-user steering`);
      const labels = await page.locator('label').count();
      if (labels < 10) throw new Error(`${c.path} unexpectedly missing labeled controls`);
      await page.close();
    }
  }
  console.log('Prompt-injection browser validation passed.');
} finally {
  await browser.close();
}
