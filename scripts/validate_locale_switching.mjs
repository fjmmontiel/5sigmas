#!/usr/bin/env node

import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const absolute = (path) => `https://5sigmas.com${path}`;
const normalizeTarget = (href) => {
  if (!href) return null;
  try {
    const parsed = new URL(href, 'https://5sigmas.com');
    return parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
  } catch {
    return null;
  }
};

const languageTargets = async () => page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href]')];
  return links
    .map((node) => ({ text: (node.textContent || '').replace(/\s+/g, ' ').trim(), href: node.getAttribute('href'), hreflang: node.getAttribute('hreflang') }))
    .filter((item) => item.hreflang || /^(English|Español)$/i.test(item.text));
});

const assertNoPageAlternates = async (route) => {
  const alternates = await page.locator('link[rel="alternate"][hreflang]').count();
  if (alternates !== 0) failures.push(`${route}: page-level hreflang links must be absent because Material treats them as locale roots`);
};

const sitemapText = async (route) => {
  const response = await page.request.get(`${base}${route}`);
  if (!response.ok()) {
    failures.push(`${route}: HTTP ${response.status()}`);
    return '';
  }
  return response.text();
};

const esSitemap = await sitemapText('/sitemap.xml');
const enSitemap = await sitemapText('/en/sitemap.xml');

const assertSitemapPair = (esRoute, enRoute) => {
  const esHref = `hreflang="es" href="${absolute(esRoute)}"`;
  const enHref = `hreflang="en" href="${absolute(enRoute)}"`;
  for (const [name, xml] of [['Spanish sitemap', esSitemap], ['English sitemap', enSitemap]]) {
    if (!xml.includes(esHref)) failures.push(`${name}: missing ${esHref}`);
    if (!xml.includes(enHref)) failures.push(`${name}: missing ${enHref}`);
  }
};

const assertTranslatedPair = async ({ es, en }) => {
  for (const [route, currentLanguage] of [[es, 'es'], [en, 'en']]) {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      continue;
    }
    await assertNoPageAlternates(route);
    const targets = await languageTargets();
    const spanish = targets.find((item) => item.hreflang === 'es' || item.text === 'Español');
    const english = targets.find((item) => item.hreflang === 'en' || item.text === 'English');
    if (normalizeTarget(spanish?.href) !== es) failures.push(`${route}: Spanish selector target ${JSON.stringify(spanish?.href)} does not preserve the translated route`);
    if (normalizeTarget(english?.href) !== en) failures.push(`${route}: English selector target ${JSON.stringify(english?.href)} does not preserve the translated route`);
    const opposite = currentLanguage === 'es' ? english : spanish;
    if (opposite?.href) {
      const target = new URL(opposite.href, `${base}${route}`);
      const targetResponse = await page.request.get(`${base}${target.pathname}`);
      if (!targetResponse.ok()) failures.push(`${route}: opposite-locale selector target returns ${targetResponse.status()}: ${target.pathname}`);
    }
  }
  assertSitemapPair(es, en);
};

await assertTranslatedPair({ es: '/series/agentes-ia/02-anatomia-de-un-agente/', en: '/en/series/agentes-ia/02-anatomia-de-un-agente/' });
await assertTranslatedPair({ es: '/series/agentes-ia/00_presentacion_serie/', en: '/en/series/agentes-ia/00_presentacion_serie/' });
await assertTranslatedPair({ es: '/series/fundamentos-ia-iag/02-que-es-ia-generativa/', en: '/en/series/fundamentos-ia-iag/02-que-es-ia-generativa/' });
await assertTranslatedPair({ es: '/series/multimodalidad-iag/01-el-problema/', en: '/en/series/multimodalidad-iag/01-el-problema/' });
await assertTranslatedPair({ es: '/series/ia-pib-bienestar-energia/03-pib-vs-bienestar/', en: '/en/series/ia-pib-bienestar-energia/03-pib-vs-bienestar/' });
await assertTranslatedPair({ es: '/series/datacenters-espacio/01-por-que-ahora/', en: '/en/series/datacenters-espacio/01-por-que-ahora/' });
await assertTranslatedPair({ es: '/series/seguridad-ia/01-prompt-injection/', en: '/en/series/seguridad-ia/01-prompt-injection/' });
await assertTranslatedPair({ es: '/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/', en: '/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/' });
await assertTranslatedPair({ es: '/temas/', en: '/en/temas/' });
await assertTranslatedPair({ es: '/temas/llms/', en: '/en/temas/llms/' });
await assertTranslatedPair({ es: '/temas/transformer/', en: '/en/temas/transformer/' });
await assertTranslatedPair({ es: '/temas/razonamiento/', en: '/en/temas/razonamiento/' });
await assertTranslatedPair({ es: '/temas/evaluacion-modelos/', en: '/en/temas/evaluacion-modelos/' });
await assertTranslatedPair({ es: '/temas/agentes-ia/', en: '/en/temas/agentes-ia/' });
await assertTranslatedPair({ es: '/temas/prompt-injection/', en: '/en/temas/prompt-injection/' });
await assertTranslatedPair({ es: '/visuales/', en: '/en/visuales/' });
await assertTranslatedPair({ es: '/videos/', en: '/en/videos/' });
await assertTranslatedPair({ es: '/videos/series/fundamentos-ia-iag/00_presentacion_serie/', en: '/en/videos/series/fundamentos-ia-iag/00_presentacion_serie/' });
await assertTranslatedPair({ es: '/herramientas/', en: '/en/tools/' });
await assertTranslatedPair({ es: '/herramientas/coste-latencia-llm/', en: '/en/tools/llm-cost-latency/' });
await assertTranslatedPair({ es: '/', en: '/en/' });

const untranslated = '/temas/agi/';
await page.goto(`${base}${untranslated}`, { waitUntil: 'networkidle' });
await assertNoPageAlternates(untranslated);
const untranslatedTargets = await languageTargets();
const untranslatedEnglish = untranslatedTargets.find((item) => item.hreflang === 'en' || item.text === 'English');
if (normalizeTarget(untranslatedEnglish?.href) !== '/en/') failures.push(`${untranslated}: until translated, English selector should safely fall back to /en/; got ${JSON.stringify(untranslatedEnglish?.href)}`);
if (esSitemap.includes(`hreflang="en" href="${absolute(`/en${untranslated}`)}"`)) failures.push(`${untranslated}: Spanish sitemap must not advertise an English equivalent before it exists`);

await browser.close();

if (failures.length) {
  console.error('Locale-switch quality QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Locale-switch quality QA passed: selectors preserve translated routes, explicit localized tool slugs, XML sitemap hreflang pairs, and safe fallbacks.');
