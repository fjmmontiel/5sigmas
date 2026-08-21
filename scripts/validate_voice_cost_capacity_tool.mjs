#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/coste-capacidad-agente-voz/', locale: 'es' },
  { route: '/en/tools/voice-cost-capacity/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

function numericText(text) {
  const cleaned = (text || '').trim().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Number(cleaned);
}

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    if (await page.locator('[data-s5-voice-cost-capacity]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: planner root missing`);
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);
    if (await page.locator('.md-sidebar--primary:visible').count()) failures.push(`${spec.route} ${viewport.name}: documentation navigation is visible`);
    if (await page.locator('.md-footer:visible').count()) failures.push(`${spec.route} ${viewport.name}: documentation footer is visible`);

    const unlabeled = await page.locator('[data-s5-tool-form] input, [data-s5-tool-form] select').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} controls lack labels`);

    const wrappedKpis = await page.locator('.s5-voice-cost-kpis .s5-tool-kpi > strong').evaluateAll((nodes) => nodes.filter((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length > 1;
    }).length);
    if (wrappedKpis) failures.push(`${spec.route} ${viewport.name}: ${wrappedKpis} primary cost KPIs wrap across lines`);

    const currencyTexts = await page.locator('.s5-voice-cost-kpis .s5-tool-kpi > strong').allTextContents();
    if (spec.locale === 'es' && currencyTexts.some((text) => !text.trim().endsWith(' USD'))) {
      failures.push(`${spec.route} ${viewport.name}: Spanish cost KPIs must use an explicit non-breaking-looking USD unit`);
    }
    if (spec.locale === 'en' && currencyTexts.some((text) => !text.trim().startsWith('$'))) {
      failures.push(`${spec.route} ${viewport.name}: English cost KPIs must use leading dollar notation`);
    }

    const referenceHierarchy = await page.locator('.s5-voice-cost-reference > div').first().evaluate((node) => {
      const small = node.querySelector('small')?.getBoundingClientRect();
      const label = node.querySelector('[data-field="presetLabel"]')?.getBoundingClientRect();
      return small && label ? { smallBottom: small.bottom, labelTop: label.top } : null;
    });
    if (!referenceHierarchy || referenceHierarchy.labelTop < referenceHierarchy.smallBottom - 1) {
      failures.push(`${spec.route} ${viewport.name}: reference snapshot label does not stack below its eyebrow`);
    }

    const sttDefault = numericText(await page.locator('[data-output="sttStreams"]').textContent());
    const ttsDefault = numericText(await page.locator('[data-output="ttsStreams"]').textContent());
    const workersDefault = numericText(await page.locator('[data-output="workers"]').textContent());
    if (Math.abs(sttDefault - 35) > 0.01) failures.push(`${spec.route} ${viewport.name}: default STT sessions should be 35, got ${sttDefault}`);
    if (Math.abs(ttsDefault - 1.8) > 0.01) failures.push(`${spec.route} ${viewport.name}: default TTS generation concurrency should render 1.8, got ${ttsDefault}`);
    if (workersDefault !== 1) failures.push(`${spec.route} ${viewport.name}: default worker count should be 1, got ${workersDefault}`);

    await page.locator('[data-field="sttConcurrencyLimit"]').fill('30');
    await page.locator('[data-field="sttConcurrencyLimit"]').dispatchEvent('input');
    if (await page.locator('[data-output="sttQuota"]').getAttribute('data-state') !== 'over') failures.push(`${spec.route} ${viewport.name}: STT quota overflow state missing`);

    await page.locator('[data-field="ttsGenerationDutyPercent"]').fill('20');
    await page.locator('[data-field="ttsGenerationDutyPercent"]').dispatchEvent('input');
    const ttsChanged = numericText(await page.locator('[data-output="ttsStreams"]').textContent());
    if (Math.abs(ttsChanged - 7) > 0.01) failures.push(`${spec.route} ${viewport.name}: 20% TTS duty at peak 35 should be 7, got ${ttsChanged}`);

    await page.locator('[data-field="userSpeechPercent"]').fill('100');
    await page.locator('[data-field="userSpeechPercent"]').dispatchEvent('input');
    const userMinutes = (await page.locator('[data-output="userMinutes"]').textContent() || '').toLowerCase();
    const connectedMinutes = (await page.locator('[data-output="connectedMinutes"]').textContent() || '').toLowerCase();
    if (userMinutes !== connectedMinutes) failures.push(`${spec.route} ${viewport.name}: 100% STT audio should equal connected minutes`);

    await page.locator('[data-action="share"]').click();
    for (const token of ['c=', 'p=', 'ss=', 'td=', 'sl=', 'tts=', 'it=', 'op=']) {
      if (!page.url().includes(token)) failures.push(`${spec.route} ${viewport.name}: share URL missing ${token}`);
    }

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    let hasWebApplication = false;
    for (const raw of jsonLd) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed['@type'] === 'WebApplication') hasWebApplication = true;
      } catch {
        failures.push(`${spec.route} ${viewport.name}: invalid JSON-LD`);
      }
    }
    if (!hasWebApplication) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

    const sourceLinks = await page.locator('.s5-tool-method__notes a').evaluateAll((links) => links.map((link) => link.href));
    for (const expected of [
      'twilio.com/en-us/voice/pricing/es',
      'twilio.com/docs/voice/media-streams',
      'developers.openai.com/api/docs/models/gpt-live-transcribe',
      'developers.openai.com/api/docs/models/gpt-5.6-luna',
      'elevenlabs.io/pricing/api',
      'elevenlabs.io/docs/overview/models'
    ]) {
      if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
    }

    const capacityCards = page.locator('.s5-voice-capacity-grid > div');
    if (await capacityCards.count() !== 4) failures.push(`${spec.route} ${viewport.name}: expected four capacity cards`);
    const boxes = await capacityCards.evaluateAll((nodes) => nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }));
    if (viewport.width >= 1200 && boxes.length === 4) {
      if (Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)) > 1) failures.push(`${spec.route} desktop: capacity cards must share one row`);
      if (Math.max(...boxes.map((b) => b.width)) - Math.min(...boxes.map((b) => b.width)) > 1) failures.push(`${spec.route} desktop: capacity cards must have equal width`);
    }
    if (viewport.width <= 430 && boxes.length === 4) {
      if (boxes.some((b) => Math.abs(b.width - boxes[0].width) > 1)) failures.push(`${spec.route} mobile: capacity cards must have equal width`);
      if (!(boxes[0].y < boxes[1].y && boxes[1].y < boxes[2].y && boxes[2].y < boxes[3].y)) failures.push(`${spec.route} mobile: capacity cards must stack vertically`);
    }

    response = await page.goto(`${base}${spec.route}?c=10000&d=4&u=100&a=38&h=220&p=80&wu=70&sw=50&ss=0.5&td=12.5&sl=35&tl=9&tp=0.0178&mp=0.0044&sp=0.017&tts=0.05&ch=1000&it=1400&ot=220&ip=0.2&op=1.2&fc=0`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
    if (await page.locator('[data-field="sttSessionsPerCall"]').inputValue() !== '0.5') failures.push(`${spec.route} ${viewport.name}: deep-link STT sessions not restored`);
    if (await page.locator('[data-field="ttsGenerationDutyPercent"]').inputValue() !== '12.5') failures.push(`${spec.route} ${viewport.name}: deep-link TTS duty not restored`);
    const sttDeep = numericText(await page.locator('[data-output="sttStreams"]').textContent());
    const ttsDeep = numericText(await page.locator('[data-output="ttsStreams"]').textContent());
    if (Math.abs(sttDeep - 40) > 0.01) failures.push(`${spec.route} ${viewport.name}: deep-link STT concurrency should be 40`);
    if (Math.abs(ttsDeep - 10) > 0.01) failures.push(`${spec.route} ${viewport.name}: deep-link TTS concurrency should be 10`);
    if (await page.locator('[data-output="sttQuota"]').getAttribute('data-state') !== 'over') failures.push(`${spec.route} ${viewport.name}: deep-link STT quota should be over`);
    if (await page.locator('[data-output="ttsQuota"]').getAttribute('data-state') !== 'over') failures.push(`${spec.route} ${viewport.name}: deep-link TTS quota should be over`);

    await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${artifactDir}/voice-cost-capacity-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('Voice cost/capacity browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Voice cost/capacity browser QA passed: ES/EN, 390px/1440px, billing math surface, provider-concurrency semantics, quotas, deep links, provenance, JSON-LD, labels, localized currency, KPI/reference hierarchy, responsive capacity geometry and horizontal fit verified.');
