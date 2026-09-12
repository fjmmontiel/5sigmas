#!/usr/bin/env node
// Regression gate for the canonical article, not only the related series chapter.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/voice-article-review');
await fs.mkdir(out, { recursive: true });
const digest = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hooks = ['map', 'cascade', 'prosody-loss', 'half', 'speech-plan', 'duplex', 'surface', 'latency', 'decision', 'voice-prompt'];
const roots = ['.s5v-arch-map', '.s5v-cascade', '.s5v-prosody-loss', '.s5v-half', '.s5v-speech-plan', '.s5v-duplex', '.s5v-surface', '.s5v-latency', '.s5v-decision', '.s5v-voice-prompt'];
const rawTex = /\\(?:mid|frac|mathrm|theta|operatorname|sum|prod)\b/;
const report = { reviewed_head: process.env.S5_REVIEW_HEAD || null, checkout_sha: process.env.GITHUB_SHA || null, source_hashes: {}, pages: [], failures: [] };
const fail = (where, message) => report.failures.push(`${where}: ${message}`);
const sources = {};
for (const lang of ['es', 'en']) {
  const name = lang === 'es' ? 'docs/articulos-tecnicos/voice-agent-architectures.md' : 'locales/en/articulos-tecnicos/voice-agent-architectures.md';
  const text = await fs.readFile(name, 'utf8');
  sources[lang] = text;
  report.source_hashes[name] = digest(text);
  const definitions = [...text.matchAll(/^\[\^([^\]]+)\]:/gm)].map((m) => m[1]);
  const references = [...text.matchAll(/\[\^([^\]]+)\](?!:)/g)].map((m) => m[1]);
  if (new Set(definitions).size !== definitions.length) fail(name, 'duplicate footnote definitions');
  if (definitions.length < 25) fail(name, 'primary-source coverage unexpectedly removed');
  for (const ref of references) if (!definitions.includes(ref)) fail(name, `undefined reference ${ref}`);
  if (rawTex.test(text)) fail(name, 'raw TeX has no active renderer on this site');
  if ((text.match(/class="s5-voice-equation"/g) || []).length !== 4) fail(name, 'expected four native display equations');
  if (/guides\/live(?:-delegation)?\)/.test(text)) fail(name, 'unverified retired documentation dependency');
  let previous = -1;
  for (const hook of hooks) {
    const token = `{{ include_html("snippets/articulos-tecnicos/voice-arch-${hook}.html") }}`;
    const index = text.indexOf(token);
    if (index <= previous || text.split(token).length !== 2) fail(name, `missing, repeated or reordered ${hook}`);
    previous = index;
  }
}
if (JSON.stringify([...sources.es.matchAll(/^\[\^([^\]]+)\]:/gm)].map((m) => m[1])) !== JSON.stringify([...sources.en.matchAll(/^\[\^([^\]]+)\]:/gm)].map((m) => m[1]))) fail('sources', 'ES/EN reference keys differ');

const browser = await chromium.launch({ headless: true });
try {
  for (const lang of ['es', 'en']) for (const width of [1440, 390]) {
    const name = `${lang}-${width}`;
    const route = `${lang === 'en' ? '/en' : ''}/articulos-tecnicos/voice-agent-architectures/`;
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => fail(name, `runtime ${error.message}`));
    page.on('response', (response) => {
      if (response.url().startsWith(base) && response.status() >= 400) fail(name, `resource ${response.status()} ${response.url()}`);
    });
    const response = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
    if (!response?.ok()) fail(name, `page HTTP ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    const prose = await page.locator('body').innerText();
    if (rawTex.test(prose)) fail(name, 'unrendered TeX in actual page');
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      nativeMath: [...document.querySelectorAll('math')].filter((m) => m.namespaceURI === 'http://www.w3.org/1998/Math/MathML').length,
      mathErrors: document.querySelectorAll('math merror').length,
      missingFootnotes: [...document.querySelectorAll('a.footnote-ref')].filter((a) => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map((a) => a.hash),
    }));
    if (metrics.scroll > metrics.viewport + 2) fail(name, `page overflow ${metrics.scroll - metrics.viewport}`);
    if (metrics.nativeMath !== (sources[lang].match(/<math\b/g) || []).length || metrics.mathErrors) fail(name, 'native MathML missing or invalid');
    if (metrics.missingFootnotes.length) fail(name, `missing footnote targets ${metrics.missingFootnotes}`);
    const equations = page.locator('.s5-voice-equation');
    if (await equations.count() !== 4) fail(name, 'display equation wrappers missing after build');
    const equationGeometry = [];
    for (let i = 0; i < await equations.count(); i++) {
      const eq = equations.nth(i);
      await eq.scrollIntoViewIfNeeded();
      await eq.focus();
      const geometry = await eq.evaluate((node) => ({ width: node.clientWidth, scroll: node.scrollWidth, height: node.getBoundingClientRect().height, focused: document.activeElement === node, label: node.getAttribute('aria-label'), display: getComputedStyle(node.querySelector('math')).display }));
      equationGeometry.push(geometry);
      if (geometry.width < 100 || geometry.height < 30 || !geometry.focused || !geometry.label || !geometry.display.includes('math')) fail(name, `equation ${i} invalid geometry/semantics`);
      await eq.screenshot({ path: path.join(out, `${name}-equation-${i + 1}.png`), animations: 'disabled' });
    }
    let previousY = -1;
    let interactions = 0;
    for (let i = 0; i < roots.length; i++) {
      const root = page.locator(roots[i]);
      if (await root.count() !== 1) { fail(name, `expected one ${roots[i]}`); continue; }
      await root.scrollIntoViewIfNeeded();
      const shape = await root.evaluate((node) => ({ y: node.getBoundingClientRect().top + window.scrollY, width: node.clientWidth, height: node.getBoundingClientRect().height, overflow: node.scrollWidth - node.clientWidth }));
      if (shape.y <= previousY || shape.width < 240 || shape.height < 70 || shape.overflow > 2) fail(name, `${roots[i]} invalid order/geometry ${JSON.stringify(shape)}`);
      previousY = shape.y;
      await root.screenshot({ path: path.join(out, `${name}-${hooks[i]}-initial.png`), animations: 'disabled' });
      const buttons = root.locator('button[data-s5v-step]');
      for (let j = 0; j < await buttons.count(); j++) {
        const button = buttons.nth(j);
        const target = await button.getAttribute('data-s5v-step');
        if (width === 390) await button.tap();
        else { await button.focus(); await button.press('Enter'); }
        await page.waitForTimeout(80);
        if (await root.getAttribute('data-step') !== target) fail(name, `${roots[i]} ${width === 390 ? 'touch' : 'keyboard'} failed step ${target}`);
        const aria = await button.getAttribute('aria-pressed');
        if (aria !== null && aria !== 'true') fail(name, `${roots[i]} incorrect aria-pressed`);
        interactions++;
        await root.screenshot({ path: path.join(out, `${name}-${hooks[i]}-step-${target}.png`), animations: 'disabled' });
      }
    }
    const pace = page.locator('.s5v-speech-plan input[data-s5v-var="pace"]');
    if (await pace.count() === 1) {
      await pace.evaluate((node) => { node.value = '100'; node.dispatchEvent(new Event('input', { bubbles: true })); });
      if ((await pace.locator('xpath=..').locator('output').innerText()).trim() !== '1.00×') fail(name, 'SpeechPlan pace update failed');
    } else fail(name, 'SpeechPlan control missing');
    await page.screenshot({ path: path.join(out, `${name}-page.png`), fullPage: true, animations: 'disabled' });
    report.pages.push({ name, route, ...metrics, equations: equationGeometry, interactions, reduced_motion: true });
    await context.close();
  }
} finally {
  await browser.close();
  report.status = report.failures.length ? 'FAIL' : 'PASS';
  await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
}
if (report.failures.length) { console.error(report.failures.join('\n')); process.exit(1); }
console.log('Voice architecture article: native math, references, ten visuals, keyboard/touch and ES/EN desktop/mobile PASS.');
