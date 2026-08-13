#!/usr/bin/env node

import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const jsonLd = async () => {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = [];
  for (const [index, value] of raw.entries()) {
    try {
      parsed.push(JSON.parse(value));
    } catch (error) {
      failures.push(`${page.url()}: invalid JSON-LD block ${index}: ${error.message}`);
    }
  }
  return parsed;
};

const nodes = (documents) => documents.flatMap((document) =>
  Array.isArray(document?.['@graph']) ? document['@graph'] : [document]
);

const findType = (documents, type) => nodes(documents).find((node) => {
  const value = node?.['@type'];
  return Array.isArray(value) ? value.includes(type) : value === type;
});

const visit = async (route) => {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) {
    failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
  }
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
  const expectedCanonical = `https://5sigmas.com${route}`;
  if (canonical !== expectedCanonical) {
    failures.push(`${route}: canonical ${JSON.stringify(canonical)} != ${expectedCanonical}`);
  }
  return jsonLd();
};

let documents = await visit('/en/');
const website = findType(documents, 'WebSite');
const organization = findType(documents, 'Organization');
const person = findType(documents, 'Person');
if (!website || website.inLanguage !== 'en' || website.url !== 'https://5sigmas.com/en/') {
  failures.push('/en/: localized WebSite schema is missing or invalid');
}
if (!organization || organization['@id'] !== 'https://5sigmas.com/#organization' || organization.url !== 'https://5sigmas.com/') {
  failures.push('/en/: Organization must reuse the global 5sigmas entity');
}
if (!person || person['@id'] !== 'https://5sigmas.com/#francisco-maldonado') {
  failures.push('/en/: Person must reuse the global Francisco Maldonado entity');
}
const homeTitle = await page.title();
if (!homeTitle.includes('AI explained with technical rigor')) {
  failures.push(`/en/: English home title regressed: ${JSON.stringify(homeTitle)}`);
}

documents = await visit('/en/meta/about/');
const profile = findType(documents, 'ProfilePage');
const aboutPerson = findType(documents, 'Person');
if (!profile || profile.inLanguage !== 'en' || !aboutPerson) {
  failures.push('/en/meta/about/: expected ProfilePage + Person schema in English');
}
if (aboutPerson?.jobTitle !== 'Real-time AI systems engineer') {
  failures.push(`/en/meta/about/: English Person jobTitle regressed: ${JSON.stringify(aboutPerson?.jobTitle)}`);
}

documents = await visit('/en/series/');
const seriesHub = findType(documents, 'CollectionPage');
if (!seriesHub || seriesHub.inLanguage !== 'en') {
  failures.push('/en/series/: expected English CollectionPage schema');
}

documents = await visit('/en/series/agentes-ia/00_presentacion_serie/');
const presentation = findType(documents, 'CollectionPage');
if (!presentation || presentation.inLanguage !== 'en' || presentation.mainEntity?.['@type'] !== 'CreativeWorkSeries') {
  failures.push('/en/series/agentes-ia/00_presentacion_serie/: expected CollectionPage → CreativeWorkSeries schema');
}
if (presentation?.mainEntity?.inLanguage !== 'en') {
  failures.push('/en/series/agentes-ia/00_presentacion_serie/: CreativeWorkSeries must declare inLanguage=en');
}

const articleRoute = '/en/series/agentes-ia/02-anatomia-de-un-agente/';
documents = await visit(articleRoute);
const article = findType(documents, 'TechArticle');
const breadcrumb = findType(documents, 'BreadcrumbList');
if (!article || article.inLanguage !== 'en') {
  failures.push(`${articleRoute}: expected English TechArticle schema`);
}
if (article?.['@id'] !== `https://5sigmas.com${articleRoute}#article`) {
  failures.push(`${articleRoute}: TechArticle @id is not locale-canonical: ${JSON.stringify(article?.['@id'])}`);
}
if (article?.author?.['@id'] !== 'https://5sigmas.com/#francisco-maldonado') {
  failures.push(`${articleRoute}: TechArticle author must reuse global Person entity`);
}
if (article?.publisher?.['@id'] !== 'https://5sigmas.com/#organization') {
  failures.push(`${articleRoute}: TechArticle publisher must reuse global Organization entity`);
}
if (article?.isPartOf?.['@type'] !== 'CreativeWorkSeries' || !String(article?.isPartOf?.url || '').startsWith('https://5sigmas.com/en/series/agentes-ia/')) {
  failures.push(`${articleRoute}: TechArticle isPartOf must point to the English series`);
}
if (!breadcrumb || breadcrumb.itemListElement?.[0]?.name !== 'Home' || breadcrumb.itemListElement?.[0]?.item !== 'https://5sigmas.com/en/') {
  failures.push(`${articleRoute}: localized BreadcrumbList must begin at English Home`);
}
if (breadcrumb?.itemListElement?.[1]?.name !== 'AI Agents') {
  failures.push(`${articleRoute}: BreadcrumbList should identify the English AI Agents series`);
}

const imageUrl = article?.image?.url;
if (!imageUrl || !imageUrl.startsWith('https://5sigmas.com/en/assets/images/social/')) {
  failures.push(`${articleRoute}: TechArticle social image must be generated inside the English locale: ${JSON.stringify(imageUrl)}`);
} else {
  const localImage = new URL(imageUrl);
  const imageResponse = await page.request.get(`${base}${localImage.pathname}`);
  if (!imageResponse.ok() || !String(imageResponse.headers()['content-type'] || '').startsWith('image/')) {
    failures.push(`${articleRoute}: generated English social card is not fetchable as an image (${imageResponse.status()})`);
  }
}

const sitemap = await page.request.get(`${base}/en/sitemap.xml`);
if (!sitemap.ok()) {
  failures.push(`/en/sitemap.xml: HTTP ${sitemap.status()}`);
} else {
  const xml = await sitemap.text();
  for (const expected of [
    'https://5sigmas.com/en/',
    'https://5sigmas.com/en/series/',
    `https://5sigmas.com${articleRoute}`,
    'https://5sigmas.com/en/meta/about/',
  ]) {
    if (!xml.includes(`<loc>${expected}</loc>`)) failures.push(`/en/sitemap.xml: missing ${expected}`);
  }
}

await browser.close();

if (failures.length) {
  console.error('English SEO/schema QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English SEO/schema QA passed: canonical URLs, rich JSON-LD, breadcrumbs, social card and locale sitemap.');
