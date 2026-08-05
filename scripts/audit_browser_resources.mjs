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

    await context.addInitScript(() => {
      const NativeURL = globalThis.URL;
      globalThis.__s5UrlCalls = [];
      globalThis.URL = new Proxy(NativeURL, {
        construct(target, args, newTarget) {
          const result = Reflect.construct(target, args, newTarget);
          const input = String(args[0] ?? '');
          const base = args.length > 1 ? String(args[1]) : '';
          if (
            input === 'sitemap.xml'
            || input === '.'
            || input.startsWith('../')
            || input.startsWith('../../')
          ) {
            globalThis.__s5UrlCalls.push({
              input,
              base,
              result: String(result),
              stack: new Error().stack,
            });
          }
          return result;
        },
      });
    });

    const page = await context.newPage();
    const pageFailures = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const request = response.request();
        pageFailures.push(
          `HTTP ${response.status()} ${response.url()} `
          + `[type=${request.resourceType()}; frame=${request.frame().url()}; `
          + `navigation=${request.isNavigationRequest()}]`,
        );
      }
    });

    page.on('requestfailed', (request) => {
      pageFailures.push(
        `request failed ${request.url()} (${request.failure()?.errorText ?? 'unknown error'}) `
        + `[type=${request.resourceType()}; frame=${request.frame().url()}; `
        + `navigation=${request.isNavigationRequest()}]`,
      );
    });

    const response = await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      pageFailures.push(`document returned ${response?.status() ?? 'no response'}`);
    }

    await page.waitForTimeout(250);

    if (pageFailures.length > 0) {
      const diagnostics = await page.evaluate(() => {
        const configNode = document.querySelector('#__config');
        let configBase = 'missing';
        try {
          configBase = JSON.parse(configNode?.textContent ?? '{}').base ?? 'missing';
        } catch {
          configBase = 'invalid JSON';
        }
        return {
          configBase,
          documentBase: document.baseURI,
          location: window.location.href,
          scope: String(globalThis.__md_scope ?? 'missing'),
          urlCalls: globalThis.__s5UrlCalls ?? [],
        };
      });

      for (const failure of pageFailures) {
        failures.add(
          `${path}: ${failure} [config.base=${diagnostics.configBase}; `
          + `scope=${diagnostics.scope}; document.baseURI=${diagnostics.documentBase}; `
          + `location=${diagnostics.location}; `
          + `URL calls=${JSON.stringify(diagnostics.urlCalls)}]`,
        );
      }
    }

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
