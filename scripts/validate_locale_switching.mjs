#!/usr/bin/env node

import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const absolute = (path) => `https://5sigmas.com${path}`;

const languageTargets = async () => page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href]')];
  return links
    .map((node) => ({
      text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
      href: node.getAttribute('href'),
      hreflang: node.getAttribute('hreflang'),
    }))
    .filter((item) => item.hreflang || /^(English|Español)$/i.test(item.text));
});

const alternate = async (lang) => page.locator(`link[rel="alternate"][hreflang="${lang}"]`).getAttribute('href').catch(() => null);

const assertTranslatedPair = async ({ es, en }) => {
  for (const [route, currentLanguage] of [[es, 'es'], [en, 'en']]) {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      continue;
    }

    const esHref = await alternate('es');
    const enHref = await alternate('en');
    if (esHref !== absolute(es)) failures.push(`${route}: hreflang=es ${JSON.stringify(esHref)} != ${absolute(es)}`);
    if (enHref !== absolute(en)) failures.push(`${route}: hreflang=en ${JSON.stringify(enHref)} != ${absolute(en)}`);

    const targets = await languageTargets();
    const spanish = targets.find((item) => item.hreflang === 'es' || item.text === 'Español');
    const english = targets.find((item) => item.hreflang === 'en' || item.text === 'English');
    const expectedSpanishPath = es;
    const expectedEnglishPath = en;
    const normalizeTarget = (href) => {
      if (!href) return null;
      try {
        const parsed = new URL(href, 'https://5sigmas.com');
        return parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
      } catch {
        return null;
      }
    };
    if (normalizeTarget(spanish?.href) !== expectedSpanishPath) {
      failures.push(`${route}: Spanish selector target ${JSON.stringify(spanish?.href)} does not preserve the translated route`);
    }
    if (normalizeTarget(english?.href) !== expectedEnglishPath) {
      failures.push(`${route}: English selector target ${JSON.stringify(english?.href)} does not preserve the translated route`);
    }

    const opposite = currentLanguage === 'es' ? english : spanish;
    if (opposite?.href) {
      const target = new URL(opposite.href, `${base}${route}`);
      const targetResponse = await page.request.get(`${base}${target.pathname}`);
      if (!targetResponse.ok()) failures.push(`${route}: opposite-locale selector target returns ${targetResponse.status()}: ${target.pathname}`);
    }
  }
};

await assertTranslatedPair({
  es: '/series/agentes-ia/02-anatomia-de-un-agente/',
  en: '/en/series/agentes-ia/02-anatomia-de-un-agente/',
});
await assertTranslatedPair({
  es: '/series/agentes-ia/00_presentacion_serie/',
  en: '/en/series/agentes-ia/00_presentacion_serie/',
});
await assertTranslatedPair({ es: '/', en: '/en/' });

const untranslated = '/series/fundamentos-ia-iag/02-que-es-ia-generativa/';
await page.goto(`${base}${untranslated}`, { waitUntil: 'networkidle' });
const untranslatedEn = await alternate('en');
if (untranslatedEn !== null) {
  failures.push(`${untranslated}: must not advertise hreflang=en until an English equivalent exists; got ${JSON.stringify(untranslatedEn)}`);
}
const untranslatedTargets = await languageTargets();
const untranslatedEnglish = untranslatedTargets.find((item) => item.hreflang === 'en' || item.text === 'English');
if (untranslatedEnglish?.href) {
  const target = new URL(untranslatedEnglish.href, `${base}${untranslated}`);
  const targetResponse = await page.request.get(`${base}${target.pathname}`);
  if (!targetResponse.ok()) {
    failures.push(`${untranslated}: English selector must never point to a 404; got ${target.pathname} → ${targetResponse.status()}`);
  }
}

await browser.close();

if (failures.length) {
  console.error('Locale-switch quality QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Locale-switch quality QA passed: translated pages preserve route equivalence; untranslated pages expose no false hreflang and no 404 language target.');
