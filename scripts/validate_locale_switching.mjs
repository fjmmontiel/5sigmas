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

const assertSeriesHub = async ({ route, entries }) => {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) {
    failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
    return;
  }
  const links = await page.locator('.s5-simple-list a.s5-list-row').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
  const body = await page.locator('body').innerText();
  if (links.length !== 10) failures.push(`${route}: expected 10 canonical series cards, got ${links.length}`);
  for (const { targetRoute, title } of entries) {
    if (!links.includes(targetRoute)) failures.push(`${route}: missing canonical series route ${targetRoute}`);
    if (!body.includes(title)) failures.push(`${route}: missing canonical series title ${JSON.stringify(title)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (geometry.scroll > geometry.viewport + 2) failures.push(`${route}: mobile horizontal overflow ${geometry.scroll}px > ${geometry.viewport}px`);
  await page.setViewportSize({ width: 1280, height: 900 });
};

const voicePairs = [
  { es: '/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/', en: '/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/' },
  { es: '/series/agentes-voz-tiempo-real/02-turn-taking/', en: '/en/series/agentes-voz-tiempo-real/02-turn-taking/' },
  { es: '/series/agentes-voz-tiempo-real/03-presupuesto-latencia/', en: '/en/series/agentes-voz-tiempo-real/03-presupuesto-latencia/' },
  { es: '/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/', en: '/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/' },
  { es: '/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/', en: '/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/' },
  { es: '/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/', en: '/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/' },
];

const codingPairs = [
  { es: '/series/coding-agents-agent-harnesses/01-que-es-agent-harness/', en: '/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness/' },
  { es: '/series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento/', en: '/en/series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento/' },
  { es: '/series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints/', en: '/en/series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints/' },
  { es: '/series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries/', en: '/en/series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries/' },
  { es: '/series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion/', en: '/en/series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion/' },
  { es: '/series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad/', en: '/en/series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad/' },
];

const assertReaderSequence = async (routes, hubRoute, label) => {
  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${route}: ${label} reader route returned ${response?.status() ?? 'no response'}`);
      continue;
    }
    if (await page.locator('.s5-reader-shell').count() !== 1) failures.push(`${route}: ${label} missing canonical reader shell`);

    const prev = page.locator('.s5-reader-topbar .s5-reader-arrow--prev').first();
    const next = page.locator('.s5-reader-topbar .s5-reader-arrow--next').first();
    if (await prev.count() !== 1 || await next.count() !== 1) {
      failures.push(`${route}: ${label} reader previous/next controls missing`);
      continue;
    }

    if (index === 0) {
      if (!(await prev.evaluate((node) => node.classList.contains('is-disabled')))) failures.push(`${route}: ${label} first chapter previous control must be disabled`);
    } else if (normalizeTarget(await prev.getAttribute('href')) !== routes[index - 1]) {
      failures.push(`${route}: ${label} previous chapter target drifted from ${routes[index - 1]}`);
    }

    if (index === routes.length - 1) {
      if (!(await next.evaluate((node) => node.classList.contains('is-disabled')))) failures.push(`${route}: ${label} final chapter next control must be disabled`);
      const completion = page.locator('.s5-reader-end__next').first();
      if (await completion.count() !== 1 || normalizeTarget(await completion.getAttribute('href')) !== hubRoute) {
        failures.push(`${route}: ${label} completion must return to ${hubRoute}`);
      }
    } else if (normalizeTarget(await next.getAttribute('href')) !== routes[index + 1]) {
      failures.push(`${route}: ${label} next chapter target drifted from ${routes[index + 1]}`);
    }
  }
};

await assertSeriesHub({
  route: '/series/',
  entries: [
    { targetRoute: voicePairs[0].es, title: 'Agentes de voz en tiempo real' },
    { targetRoute: codingPairs[0].es, title: 'Coding agents y agent harnesses' },
  ],
});
await assertSeriesHub({
  route: '/en/series/',
  entries: [
    { targetRoute: voicePairs[0].en, title: 'Realtime Voice Agents' },
    { targetRoute: codingPairs[0].en, title: 'Coding Agents & Agent Harnesses' },
  ],
});

for (const pair of voicePairs) await assertTranslatedPair(pair);
await assertReaderSequence(voicePairs.map((pair) => pair.es), '/series/', 'Spanish Realtime Voice Agents');
await assertReaderSequence(voicePairs.map((pair) => pair.en), '/en/series/', 'English Realtime Voice Agents');

for (const pair of codingPairs) await assertTranslatedPair(pair);
await assertReaderSequence(codingPairs.map((pair) => pair.es), '/series/', 'Spanish Coding Agents & Agent Harnesses');
await assertReaderSequence(codingPairs.map((pair) => pair.en), '/en/series/', 'English Coding Agents & Agent Harnesses');

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
console.log('Locale-switch quality QA passed: bilingual Series hubs expose Realtime Voice Agents and Coding Agents & Agent Harnesses, all twelve routes across both six-chapter collections preserve translated selectors and sitemap pairs, reader navigation stays inside each collection, and safe fallbacks remain valid.');
