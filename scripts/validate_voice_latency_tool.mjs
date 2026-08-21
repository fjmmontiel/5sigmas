#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/latencia-agente-voz/', locale: 'es' },
  { route: '/en/tools/voice-latency-budget/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const msValue = async (locator) => Number((await locator.textContent() || '').replace(/[^0-9.-]/g, ''));

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    if (await page.locator('[data-s5-voice-latency]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: explorer root missing`);
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);
    if (await page.locator('.md-sidebar--primary:visible').count()) failures.push(`${spec.route} ${viewport.name}: documentation navigation is visible on the tool surface`);
    if (await page.locator('.md-footer:visible').count()) failures.push(`${spec.route} ${viewport.name}: documentation footer/navigation is visible on the tool surface`);

    const unlabeled = await page.locator('[data-s5-tool-form] input, [data-s5-tool-form] select').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} controls lack labels`);

    if (viewport.width <= 900) {
      const kpiGridBox = await page.locator('.s5-voice-latency-kpis').boundingBox();
      const lastKpiBox = await page.locator('.s5-voice-latency-kpis .s5-tool-kpi').last().boundingBox();
      if (!kpiGridBox || !lastKpiBox || Math.abs(kpiGridBox.width - lastKpiBox.width) > 1) {
        failures.push(`${spec.route} ${viewport.name}: third KPI must span the full responsive row`);
      }
    }

    const defaultResponse = await msValue(page.locator('[data-output="responseMs"]'));
    const defaultModelBudget = await msValue(page.locator('[data-output="modelBudget"]'));
    const defaultBarge = await msValue(page.locator('[data-output="bargeMs"]'));
    if (defaultResponse !== 1020) failures.push(`${spec.route} ${viewport.name}: default cascade should total 1020 ms, got ${defaultResponse}`);
    if (defaultModelBudget !== 230) failures.push(`${spec.route} ${viewport.name}: default model budget should be 230 ms, got ${defaultModelBudget}`);
    if (defaultBarge !== 230) failures.push(`${spec.route} ${viewport.name}: default barge-in should total 230 ms, got ${defaultBarge}`);

    await page.locator('[data-field="architecture"]').selectOption('halfCascade');
    if (await msValue(page.locator('[data-output="responseMs"]')) !== 840) failures.push(`${spec.route} ${viewport.name}: half-cascade preset should total 840 ms`);
    if (await page.locator('[data-field="sttMs"]').inputValue() !== '0') failures.push(`${spec.route} ${viewport.name}: half-cascade should set external STT residual to 0`);

    await page.locator('[data-field="architecture"]').selectOption('speechToSpeech');
    if (await msValue(page.locator('[data-output="responseMs"]')) !== 700) failures.push(`${spec.route} ${viewport.name}: speech-to-speech preset should total 700 ms`);
    if (await page.locator('[data-field="ttsMs"]').inputValue() !== '0') failures.push(`${spec.route} ${viewport.name}: speech-to-speech should set external TTS to 0`);

    await page.locator('[data-field="targetMs"]').fill('200');
    await page.locator('[data-field="modelMs"]').fill('0');
    await page.locator('[data-field="modelMs"]').dispatchEvent('input');
    if (await msValue(page.locator('[data-output="modelBudget"]')) !== 0) failures.push(`${spec.route} ${viewport.name}: impossible target should leave 0 ms model budget`);
    const modelRead = (await page.locator('[data-output="modelBudgetRead"]').textContent() || '').trim();
    if (!/antes de asignar|before assigning/i.test(modelRead)) failures.push(`${spec.route} ${viewport.name}: impossible-target explanation missing`);

    const stages = page.locator('[data-stage]');
    if (await stages.count() !== 7) failures.push(`${spec.route} ${viewport.name}: expected 7 response stages`);
    const shares = await stages.evaluateAll((nodes) => nodes.map((node) => node.style.getPropertyValue('--share')));
    if (shares.some((value) => !value.endsWith('%'))) failures.push(`${spec.route} ${viewport.name}: timeline shares not rendered`);

    await page.locator('[data-action="share"]').click();
    for (const token of ['a=', 'in=', 'ep=', 'm=', 'target=', 'bd=', 'bt=']) {
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
    for (const expected of ['platform.openai.com/docs/api-reference/realtime', 'developers.deepgram.com/docs/endpointing', 'elevenlabs.io/docs/developer-guides/reducing-latency', 'twilio.com/docs/voice/media-streams/websocket-messages', 'PMC2705608']) {
      if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
    }

    response = await page.goto(`${base}${spec.route}?a=halfCascade&in=50&ep=200&stt=0&m=250&tts=100&out=60&buf=30&target=750&bd=70&can=20&clr=50&bt=220`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
    if (await page.locator('[data-field="architecture"]').inputValue() !== 'halfCascade') failures.push(`${spec.route} ${viewport.name}: deep-link architecture not restored`);
    if (await page.locator('[data-field="endpointMs"]').inputValue() !== '200') failures.push(`${spec.route} ${viewport.name}: deep-link endpoint not restored`);
    if (await msValue(page.locator('[data-output="responseMs"]')) !== 690) failures.push(`${spec.route} ${viewport.name}: deep-link total should be 690 ms`);

    await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${artifactDir}/voice-latency-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('Voice latency browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Voice latency browser QA passed: ES/EN, 390px/1440px, architecture presets, critical-path math, impossible targets, barge-in, deep links, provenance, JSON-LD, labels, hidden docs chrome, responsive KPI geometry and horizontal fit verified.');
