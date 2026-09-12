#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  '01-que-es-agent-harness',
  '02-contexto-workspace-sandboxing-aislamiento',
  '03-specs-planificacion-task-decomposition-checkpoints',
  '04-tools-permisos-approvals-hooks-secretos-trust-boundaries',
  '05-tests-verifiers-review-diffs-stop-conditions-evaluacion',
  '06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad',
];
const pairs = chapters.map((slug) => ({
  es: `/series/coding-agents-agent-harnesses/${slug}/`,
  en: `/en/series/coding-agents-agent-harnesses/${slug}/`,
}));
const expectedHub = {
  es: {
    route: '/series/',
    href: pairs[0].es,
    title: 'Coding agents y agent harnesses',
    meta: '6 capítulos',
  },
  en: {
    route: '/en/series/',
    href: pairs[0].en,
    title: 'Coding Agents & Agent Harnesses',
    meta: '6 chapters',
  },
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const normalizePath = (href) => {
  if (!href) return null;
  try {
    const pathname = new URL(href, 'https://5sigmas.com').pathname;
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    return null;
  }
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
    { name: 'mobile', width: 390, height: 844, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.hasTouch,
      isMobile: viewport.hasTouch,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    for (const [locale, hub] of Object.entries(expectedHub)) {
      const badResources = [];
      const listener = (response) => {
        try {
          const url = new URL(response.url());
          const origin = new URL(base).origin;
          if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) {
            badResources.push(`${response.status()} ${url.pathname}`);
          }
        } catch {}
      };
      page.on('response', listener);
      const response = await page.goto(`${base}${hub.route}`, { waitUntil: 'networkidle' });
      page.off('response', listener);
      check(response?.ok(), `${hub.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const rows = page.locator('.s5-simple-list a.s5-list-row');
      check((await rows.count()) === 12, `${hub.route}: ${viewport.name} expected exactly 12 canonical series rows, got ${await rows.count()}`);
      const target = rows.filter({ has: page.locator(`span.s5-list-row__title:text-is("${hub.title}")`) });
      check((await target.count()) === 1, `${hub.route}: ${viewport.name} missing unique Coding Agents row ${JSON.stringify(hub.title)}`);
      if (await target.count()) {
        check(normalizePath(await target.first().getAttribute('href')) === hub.href, `${hub.route}: ${viewport.name} Coding Agents row points to ${JSON.stringify(await target.first().getAttribute('href'))}, expected ${hub.href}`);
        const text = (await target.first().textContent()) || '';
        check(text.includes(hub.meta), `${hub.route}: ${viewport.name} Coding Agents row missing ${JSON.stringify(hub.meta)}`);
      }
      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${hub.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${hub.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
      check(badResources.length === 0, `${hub.route}: ${viewport.name} broken same-origin resources ${JSON.stringify(badResources)}`);
      await page.screenshot({ path: path.join(outDir, `coding-agents-release-hub-${locale}-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    }

    for (let index = 0; index < pairs.length; index += 1) {
      for (const locale of ['es', 'en']) {
        const route = pairs[index][locale];
        const oppositeLocale = locale === 'es' ? 'en' : 'es';
        const badResources = [];
        const listener = (response) => {
          try {
            const url = new URL(response.url());
            const origin = new URL(base).origin;
            if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) {
              badResources.push(`${response.status()} ${url.pathname}`);
            }
          } catch {}
        };
        page.on('response', listener);
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        page.off('response', listener);
        check(response?.ok(), `${route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
        const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
        check(htmlLang.startsWith(locale), `${route}: ${viewport.name} wrong html lang ${htmlLang}`);
        check((await page.locator('.s5-reader-shell').count()) === 1, `${route}: ${viewport.name} missing canonical reader shell`);
        check(((await page.locator('main h1').first().innerText().catch(() => '')).trim()).length >= 25, `${route}: ${viewport.name} missing article h1`);
        check(badResources.length === 0, `${route}: ${viewport.name} broken same-origin resources ${JSON.stringify(badResources)}`);

        const languageLinks = await page.locator('a[href]').evaluateAll((nodes) => nodes
          .map((node) => ({ text: (node.textContent || '').replace(/\s+/g, ' ').trim(), href: node.getAttribute('href'), hreflang: node.getAttribute('hreflang') }))
          .filter((item) => item.hreflang || /^(English|Español)$/i.test(item.text)));
        const currentTarget = languageLinks.find((item) => item.hreflang === locale || (locale === 'es' ? item.text === 'Español' : item.text === 'English'));
        const oppositeTarget = languageLinks.find((item) => item.hreflang === oppositeLocale || (oppositeLocale === 'es' ? item.text === 'Español' : item.text === 'English'));
        check(normalizePath(currentTarget?.href) === pairs[index][locale], `${route}: ${viewport.name} current-locale selector drifted to ${JSON.stringify(currentTarget?.href)}`);
        check(normalizePath(oppositeTarget?.href) === pairs[index][oppositeLocale], `${route}: ${viewport.name} opposite-locale selector drifted to ${JSON.stringify(oppositeTarget?.href)}`);

        const prev = page.locator('.s5-reader-topbar .s5-reader-arrow--prev').first();
        const next = page.locator('.s5-reader-topbar .s5-reader-arrow--next').first();
        check((await prev.count()) === 1 && (await next.count()) === 1, `${route}: ${viewport.name} reader previous/next controls missing`);
        if ((await prev.count()) && (await next.count())) {
          if (index === 0) {
            check(await prev.evaluate((node) => node.classList.contains('is-disabled')), `${route}: ${viewport.name} first chapter previous control must be disabled`);
          } else {
            check(normalizePath(await prev.getAttribute('href')) === pairs[index - 1][locale], `${route}: ${viewport.name} previous target drifted from ${pairs[index - 1][locale]}`);
          }
          if (index === pairs.length - 1) {
            check(await next.evaluate((node) => node.classList.contains('is-disabled')), `${route}: ${viewport.name} final chapter next control must be disabled`);
            const completion = page.locator('.s5-reader-end__next').first();
            check((await completion.count()) === 1, `${route}: ${viewport.name} missing completion link`);
            if (await completion.count()) {
              check(normalizePath(await completion.getAttribute('href')) === expectedHub[locale].route, `${route}: ${viewport.name} completion must return to ${expectedHub[locale].route}`);
            }
          } else {
            check(normalizePath(await next.getAttribute('href')) === pairs[index + 1][locale], `${route}: ${viewport.name} next target drifted from ${pairs[index + 1][locale]}`);
          }
        }
        const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        check(overflow.scrollWidth <= overflow.clientWidth + 1, `${route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding Agents release-surface QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding Agents release-surface QA PASS: ES/EN Series hubs expose the series among 12 canonical rows, all 12 chapter routes load without broken same-origin resources, locale switching and six-chapter reader progression remain exact, and desktop/mobile page geometry is clean.');
