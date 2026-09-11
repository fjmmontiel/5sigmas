#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const fail = (message) => failures.push(message);

const cases = [
  {
    locale: 'es',
    route: '/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    opposite: '/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    hub: '/series/',
    seriesPrefix: '/series/coding-agents-agent-harnesses/',
  },
  {
    locale: 'en',
    route: '/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    opposite: '/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    hub: '/en/series/',
    seriesPrefix: '/en/series/coding-agents-agent-harnesses/',
  },
];

const normalizeTarget = (href) => {
  if (!href) return null;
  try {
    const parsed = new URL(href, 'https://5sigmas.com');
    return parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
  } catch {
    return null;
  }
};

const absolute = (route) => `https://5sigmas.com${route}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  const sitemapResponses = await Promise.all([
    page.request.get(`${base}/sitemap.xml`),
    page.request.get(`${base}/en/sitemap.xml`),
  ]);
  const sitemapTexts = [];
  for (const [index, response] of sitemapResponses.entries()) {
    if (!response.ok()) fail(`${index === 0 ? 'ES' : 'EN'} sitemap returned HTTP ${response.status()}`);
    sitemapTexts.push(response.ok() ? await response.text() : '');
  }

  const esRoute = cases[0].route;
  const enRoute = cases[1].route;
  for (const [label, xml] of [['ES sitemap', sitemapTexts[0]], ['EN sitemap', sitemapTexts[1]]]) {
    if (!xml.includes(`hreflang="es" href="${absolute(esRoute)}"`)) fail(`${label}: missing ES 2.1 alternate`);
    if (!xml.includes(`hreflang="en" href="${absolute(enRoute)}"`)) fail(`${label}: missing EN 2.1 alternate`);
  }

  for (const testCase of cases) {
    const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      fail(`${testCase.route}: HTTP ${response?.status() ?? 'no response'}`);
      continue;
    }

    const lang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
    if (!lang.startsWith(testCase.locale)) fail(`${testCase.route}: wrong html lang ${JSON.stringify(lang)}`);
    if (await page.locator('.s5-reader-shell').count() !== 1) fail(`${testCase.route}: missing canonical reader shell`);
    if (await page.locator('link[rel="alternate"][hreflang]').count() !== 0) fail(`${testCase.route}: page-level hreflang links must remain absent under the Material locale-root contract`);

    const languageTargets = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
      .map((node) => ({
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
        href: node.getAttribute('href'),
        hreflang: node.getAttribute('hreflang'),
      }))
      .filter((item) => item.hreflang || /^(English|Español)$/i.test(item.text)));
    const spanish = languageTargets.find((item) => item.hreflang === 'es' || item.text === 'Español');
    const english = languageTargets.find((item) => item.hreflang === 'en' || item.text === 'English');
    if (normalizeTarget(spanish?.href) !== esRoute) fail(`${testCase.route}: Spanish locale target drifted to ${JSON.stringify(spanish?.href)}`);
    if (normalizeTarget(english?.href) !== enRoute) fail(`${testCase.route}: English locale target drifted to ${JSON.stringify(english?.href)}`);

    const oppositeResponse = await page.request.get(`${base}${testCase.opposite}`);
    if (!oppositeResponse.ok()) fail(`${testCase.route}: opposite locale returns HTTP ${oppositeResponse.status()}`);

    const currentLinks = page.locator(`.s5-reader-shell a[aria-current="page"]`);
    if (await currentLinks.count() < 1) fail(`${testCase.route}: current chapter is not identified in reader navigation`);
    else {
      const targets = await currentLinks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      if (!targets.some((href) => normalizeTarget(href) === testCase.route)) fail(`${testCase.route}: aria-current reader target does not point to the current chapter`);
    }

    const prev = page.locator('.s5-reader-topbar .s5-reader-arrow--prev').first();
    const next = page.locator('.s5-reader-topbar .s5-reader-arrow--next').first();
    if (await prev.count() !== 1 || await next.count() !== 1) {
      fail(`${testCase.route}: reader previous/next controls missing`);
      continue;
    }
    if (!await prev.evaluate((node) => node.classList.contains('is-disabled'))) fail(`${testCase.route}: chapter 2.1 must remain the first chapter`);

    const nextDisabled = await next.evaluate((node) => node.classList.contains('is-disabled'));
    if (nextDisabled) {
      const completion = page.locator('.s5-reader-end__next').first();
      if (await completion.count() !== 1 || normalizeTarget(await completion.getAttribute('href')) !== testCase.hub) {
        fail(`${testCase.route}: current one-chapter series completion must return to ${testCase.hub}`);
      }
    } else {
      const nextTarget = normalizeTarget(await next.getAttribute('href'));
      if (!nextTarget?.startsWith(testCase.seriesPrefix) || nextTarget === testCase.route) {
        fail(`${testCase.route}: next chapter escapes the Coding Agents series (${JSON.stringify(nextTarget)})`);
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding agent harness chapter locale/navigation QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Coding agent harness chapter locale/navigation QA PASS: ES/EN selector targets, sitemap mirror, canonical reader shell, first-chapter boundary and series-contained continuation are valid.');
