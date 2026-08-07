import { chromium } from 'playwright';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const paths = [
  '/',
  '/visuales/',
  '/temas/',
  '/series/',
  '/series/modelos-razonadores/03-test-time-compute/',
];

const browser = await chromium.launch({ headless: true });
const failures = new Set();

try {
  for (const path of paths) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const request = response.request();
        failures.add(
          `${path}: HTTP ${response.status()} ${response.url()} `
          + `[type=${request.resourceType()}; frame=${request.frame().url()}; `
          + `navigation=${request.isNavigationRequest()}]`,
        );
      }
    });

    page.on('requestfailed', (request) => {
      failures.add(
        `${path}: request failed ${request.url()} `
        + `(${request.failure()?.errorText ?? 'unknown error'}) `
        + `[type=${request.resourceType()}; frame=${request.frame().url()}; `
        + `navigation=${request.isNavigationRequest()}]`,
      );
    });

    const response = await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      failures.add(`${path}: document returned ${response?.status() ?? 'no response'}`);
    }

    await page.waitForTimeout(250);
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.size > 0) {
  console.error('Browser resource audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Browser resource audit passed for ${paths.length} representative pages.`);
