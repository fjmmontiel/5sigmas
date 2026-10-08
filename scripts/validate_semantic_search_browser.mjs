#!/usr/bin/env node
// Real Playwright UI/locale test, mocked model binaries at network boundaries.
// It does NOT certify actual WebGPU or an EmbeddingGemma model download.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const locales = [
  { path: '/buscar/', lang: 'es', phrase: '¿Cómo funciona batching en inferencia?', url: 'https://5sigmas.com/temas/test-batching/' },
  { path: '/en/buscar/', lang: 'en', phrase: 'How does batching improve inference?', url: 'https://5sigmas.com/en/temas/test-batching/' },
];

const fakeMediaPipe = [
  'export const FilesetResolver = { async forRetrievalTasks() { return {}; } };',
  'export const UniversalEmbedder = {',
  '  async createFromOptions() {',
  '    return { async embedText() {',
  '      const vec = new Array(768).fill(0); vec[0] = 3; vec[1] = 4;',
  '      return { embeddings: [{ floatEmbedding: vec }] };',
  '    } };',
  '  }',
  '};',
].join('\n');
const fakeTransformers = [
  'export async function pipeline() {',
  '  return async (messages) => [{',
  "    generated_text: [...messages, {role:'assistant', content:'Source-backed answer [1].'}]",
  '  }];',
  '}',
].join('\n');

const browser = await chromium.launch({ headless: true });
try {
  for (const config of locales) {
    for (const semanticWorks of [true, false]) {
      const context = await browser.newContext({
        viewport: { width: semanticWorks ? 1440 : 390, height: 850 },
        reducedMotion: 'reduce',
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'gpu', {
          configurable: true,
          value: { requestAdapter: async () => ({ features: new Set() }) },
        });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', async (route) => {
        const u = new URL(route.request().url());
        if (u.pathname === '/semantic-search/index/manifest.json') {
          return route.fulfill({ status: 404, body: 'Not published' });
        }
        if (u.pathname === (config.lang === 'en' ? '/en/agent/knowledge.json' : '/agent/knowledge.json')) {
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
            schema_version: 2, locale: config.lang,
            items: [{
              id: 'test-batching', kind: 'page',
              url: config.url,
              title: config.lang === 'en' ? 'Continuous batching inference' : 'Inferencia con continuous batching',
              description: 'Continuous batching improves GPU inference throughput by grouping active requests',
              headings: [{level:'h2',id:'continuous-batching',text:'Continuous batching'}],
              markdown_url: config.lang === 'en' ? 'https://5sigmas.com/en/test-article.md' : 'https://5sigmas.com/test-article.md',
            }],
          }) });
        }
        if (u.pathname.endsWith('test-article.md')) {
          return route.fulfill({ contentType: 'text/markdown', body: '# Batching\n\n## Continuous batching\n\nContinuous batching increases throughput by scheduling active requests together, while latency can vary.' });
        }
        if (u.pathname === (config.lang === 'en' ? '/en/videos/catalog.json' : '/videos/catalog.json') ||
            u.pathname === (config.lang === 'en' ? '/en/videos/key-moments.json' : '/videos/key-moments.json')) {
          return route.fulfill({ status: 404, body: '{}' });
        }
        if (u.pathname.endsWith('retrieval_bundle.mjs')) {
          return route.fulfill(semanticWorks
            ? { status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'text/javascript', body: fakeMediaPipe }
            : { status: 404, headers: { 'access-control-allow-origin': '*' }, contentType: 'text/plain', body: 'Unavailable' });
        }
        if (u.pathname.endsWith('+esm') && u.pathname.includes('@huggingface/transformers')) {
          return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' },
            contentType: 'text/javascript', body: fakeTransformers });
        }
        if (!['127.0.0.1', 'localhost'].includes(u.hostname)) {
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      const res = await page.goto(new URL(config.path, base).href, { waitUntil: 'domcontentloaded' });
      assert.equal(res.status(), 200, config.path + ' returned unexpected HTTP');
      await page.locator('[data-role=mode]').waitFor();
      await page.waitForFunction(() => {
        const form = document.querySelector('#s5-semantic-search');
        return form && !form.querySelector('[data-action=search]').disabled;
      }, null, { timeout: 12000 });
      const width = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      assert.ok(width.doc <= width.client + 3, config.path + ' horizontal overflow: ' + JSON.stringify(width));
      await page.locator('#s5-search-question').fill(config.phrase);
      await page.locator('[data-action=search]').click();
      await page.waitForFunction(() => document.querySelectorAll('.s5-search-card').length > 0,
        null, { timeout: 20000 });
      const cards = page.locator('.s5-search-card');
      assert.ok(await cards.count() >= 1);
      const urls = await cards.locator('a').evaluateAll(nodes => nodes.map(n => n.href));
      assert.ok(urls.includes(config.url + '#continuous-batching'), 'Missing exact section URL: '+JSON.stringify(urls));
      assert.ok(urls.every(url => config.lang === 'en' ? new URL(url).pathname.startsWith('/en/') : !new URL(url).pathname.startsWith('/en/')),
        'Cross-locale result leaked: ' + JSON.stringify(urls));
      const modeText = await page.locator('[data-role=mode]').textContent();
      if (!semanticWorks) assert.match(modeText, /unavailable|no disponible/i);
      else assert.match(modeText, /Metadata index|Índice de metadatos/);
      assert.equal(await page.locator('[data-action=generate]').isDisabled(), false);
      await page.locator('[data-action=generate]').click();
      await page.waitForFunction(() =>
        document.querySelector('[data-role=answer-text]')?.textContent?.includes('Source-backed answer'),
        null, { timeout: 20000 });
      assert.match(await page.locator('[data-role=answer-text]').textContent(), /\[1\]/);
      assert.deepEqual(errors, [], config.path + ' page runtime failures');
      console.log('PASS ' + config.path + ' ' + (semanticWorks ? 'EMBEDDER_MOCK' : 'KEYWORD_FALLBACK')
        + ' citations=1 webgpu_mock=PASS viewport=' + width.client);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
