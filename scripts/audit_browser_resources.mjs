import { chromium } from 'playwright';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const defaultPaths = [
  '/',
  '/visuales/',
  '/temas/',
  '/series/',
  '/series/modelos-razonadores/03-test-time-compute/',
];
const requestedPaths = (process.env.S5_BROWSER_RESOURCE_PATHS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const paths = requestedPaths.length ? [...new Set(requestedPaths)] : defaultPaths;

const profileCatalog = {
  'desktop-normal': {
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'no-preference',
    isMobile: false,
    hasTouch: false,
  },
  'desktop-reduced': {
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
    isMobile: false,
    hasTouch: false,
  },
  'mobile-normal': {
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
    isMobile: true,
    hasTouch: true,
  },
  'mobile-reduced': {
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
  },
};
const requestedProfiles = (process.env.S5_BROWSER_RESOURCE_PROFILES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const profileNames = requestedProfiles.length
  ? [...new Set(requestedProfiles)]
  : Object.keys(profileCatalog);

for (const path of paths) {
  if (!path.startsWith('/')) throw new Error(`Browser resource audit path must start with '/': ${path}`);
}
for (const name of profileNames) {
  if (!profileCatalog[name]) {
    throw new Error(
      `Unknown browser resource profile '${name}'. Expected one of: ${Object.keys(profileCatalog).join(', ')}`,
    );
  }
}

const isTransientExternalFontFailure = (url, resourceType) => {
  if (resourceType !== 'font') return false;
  try {
    return new URL(url).hostname === 'fonts.gstatic.com';
  } catch {
    return false;
  }
};

const isExpectedTeardownAbort = ({ phase, errorText }) => (
  phase === 'teardown' && /ERR_ABORTED/i.test(errorText ?? '')
);

// Deterministic negative mutations: never let an ERR_ABORTED blanket allow-list creep back in.
const classifierMutations = [
  [{ phase: 'teardown', errorText: 'net::ERR_ABORTED' }, true],
  [{ phase: 'navigation', errorText: 'net::ERR_ABORTED' }, false],
  [{ phase: 'lazy-load', errorText: 'net::ERR_ABORTED' }, false],
  [{ phase: 'settle', errorText: 'net::ERR_ABORTED' }, false],
  [{ phase: 'teardown', errorText: 'net::ERR_FAILED' }, false],
];
for (const [event, expected] of classifierMutations) {
  if (isExpectedTeardownAbort(event) !== expected) {
    throw new Error(`Browser resource failure-classifier mutation failed for ${JSON.stringify(event)}`);
  }
}

const safeFrameUrl = (request) => {
  try {
    return request.frame().url();
  } catch {
    return '<detached-frame>';
  }
};

const exerciseLazyResources = async (page) => {
  await page.evaluate(async () => {
    const root = document.scrollingElement ?? document.documentElement;
    const maxY = Math.max(0, root.scrollHeight - window.innerHeight);
    if (maxY > 0) {
      const steps = Math.min(12, Math.max(2, Math.ceil(maxY / Math.max(window.innerHeight, 1))));
      for (let index = 1; index <= steps; index += 1) {
        window.scrollTo({ top: Math.round((maxY * index) / steps), behavior: 'instant' });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
    }

    for (const video of document.querySelectorAll('video')) {
      if (video.preload === 'none') video.preload = 'metadata';
      video.load();
    }
  });
};

const browser = await chromium.launch({ headless: true });
const failures = new Set();
let auditedContexts = 0;

try {
  for (const path of paths) {
    for (const profileName of profileNames) {
      const profile = profileCatalog[profileName];
      const context = await browser.newContext({
        viewport: profile.viewport,
        colorScheme: 'light',
        reducedMotion: profile.reducedMotion,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
      });
      const page = await context.newPage();
      let phase = 'navigation';
      const contextFailures = [];
      const label = `${path} [${profileName}]`;

      page.on('pageerror', (error) => {
        contextFailures.push(`${label}: pageerror during ${phase}: ${error.message}`);
      });

      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        contextFailures.push(`${label}: console:error during ${phase}: ${message.text()}`);
      });

      page.on('response', (response) => {
        if (response.status() < 400) return;
        const request = response.request();
        if (isTransientExternalFontFailure(response.url(), request.resourceType())) return;
        contextFailures.push(
          `${label}: HTTP ${response.status()} during ${phase}: ${response.url()} `
          + `[type=${request.resourceType()}; frame=${safeFrameUrl(request)}; `
          + `navigation=${request.isNavigationRequest()}]`,
        );
      });

      page.on('requestfailed', (request) => {
        if (isTransientExternalFontFailure(request.url(), request.resourceType())) return;
        const event = {
          phase,
          errorText: request.failure()?.errorText ?? 'unknown error',
        };
        if (isExpectedTeardownAbort(event)) return;
        contextFailures.push(
          `${label}: request failed during ${phase}: ${request.url()} `
          + `(${event.errorText}) `
          + `[type=${request.resourceType()}; frame=${safeFrameUrl(request)}; `
          + `navigation=${request.isNavigationRequest()}]`,
        );
      });

      try {
        const response = await page.goto(`${baseUrl}${path}`, {
          waitUntil: 'networkidle',
          timeout: 30_000,
        });
        if (!response?.ok()) {
          contextFailures.push(`${label}: document returned ${response?.status() ?? 'no response'}`);
        }

        phase = 'lazy-load';
        await exerciseLazyResources(page);
        await page.waitForTimeout(250);

        phase = 'settle';
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(100);
      } catch (error) {
        contextFailures.push(`${label}: audit exception during ${phase}: ${error.message}`);
      } finally {
        // Keep every listener active through context teardown. The verdict is computed only afterwards.
        phase = 'teardown';
        await context.close();
        auditedContexts += 1;
      }

      for (const failure of contextFailures) failures.add(failure);
    }
  }
} finally {
  await browser.close();
}

if (failures.size > 0) {
  console.error('Browser resource audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Browser resource audit passed for ${paths.length} pages across ${profileNames.length} profiles `
  + `(${auditedContexts} contexts), including lazy-resource exercise and post-teardown verdicts.`,
);
