#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/amenazas-prompt-injection/', locale: 'es' },
  { route: '/en/tools/prompt-injection-threat/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const browser = await chromium.launch({ headless: true });
try {
  for (const spec of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) {
        failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
        await page.close();
        continue;
      }

      if (await page.locator('[data-s5-prompt-injection]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);
      const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);

      const unlabeled = await page.locator('[data-field]').evaluateAll((nodes) => nodes.filter((node) => {
        if (node.closest('label')) return false;
        return !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
      }).length);
      if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} controls lack programmatic labels`);

      if (await page.locator('.s5-tool-results').getAttribute('aria-live') !== null) failures.push(`${spec.route} ${viewport.name}: full results region must not be a noisy live region`);
      const liveRegion = page.locator('.s5-threat-live[role="status"][aria-live="polite"][aria-atomic="true"]');
      if (await liveRegion.count() !== 1) failures.push(`${spec.route} ${viewport.name}: concise result live region missing`);

      if (spec.locale === 'es') {
        const bodyText = ` ${(await page.locator('[data-s5-prompt-injection]').innerText()).toLowerCase().replace(/\s+/g, ' ')} `;
        for (const anglicism of [' score ', ' payload ', ' payloads ', ' egress ', ' tools ']) {
          if (bodyText.includes(anglicism)) failures.push(`${spec.route} ${viewport.name}: avoid Spanish UI anglicism ${anglicism.trim()}`);
        }
        if (!bodyText.includes('no estima la probabilidad')) failures.push(`${spec.route} ${viewport.name}: probability limitation missing`);
      }

      const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      let hasWebApplication = false;
      for (const raw of jsonLdBlocks) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed['@type'] === 'WebApplication') hasWebApplication = true;
        } catch {
          failures.push(`${spec.route} ${viewport.name}: invalid JSON-LD`);
        }
      }
      if (!hasWebApplication) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

      const sourceLinks = await page.locator('.s5-note-feature__meta a').evaluateAll((links) => links.map((link) => link.href));
      for (const expected of ['genai.owasp.org/llmrisk/llm01-prompt-injection', 'cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html', 'openai.com/safety/prompt-injections']) {
        if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
      }

      const preset = page.locator('[data-field="preset"]');
      await preset.selectOption('privileged-agent');
      if ((await page.locator('[data-output="reachablePaths"]').textContent() || '').trim() !== '5') failures.push(`${spec.route} ${viewport.name}: privileged preset should expose five modeled paths`);
      if ((await page.locator('[data-output="highImpactPaths"]').textContent() || '').trim() !== '4') failures.push(`${spec.route} ${viewport.name}: privileged preset should expose four high-impact paths`);
      if (!(await liveRegion.textContent() || '').includes('5')) failures.push(`${spec.route} ${viewport.name}: live summary did not update with reachable path count`);

      await page.locator('[data-field="quarantineReader"]').check();
      if ((await page.locator('[data-output="reachablePaths"]').textContent() || '').trim() !== '0') failures.push(`${spec.route} ${viewport.name}: indirect quarantine should block modeled privileged influence`);
      const containedPosture = (await page.locator('[data-output="posture"]').textContent() || '').trim();
      if (spec.locale === 'es' && containedPosture !== 'Contenida') failures.push(`${spec.route} ${viewport.name}: contained Spanish posture should agree grammatically with “postura”`);
      if (spec.locale === 'en' && containedPosture !== 'Contained') failures.push(`${spec.route} ${viewport.name}: contained English posture label is incorrect`);

      await page.locator('[data-field="vector"]').selectOption('direct');
      if ((await page.locator('[data-output="reachablePaths"]').textContent() || '').trim() === '0') failures.push(`${spec.route} ${viewport.name}: isolated reader must not claim to block direct-user steering`);

      await page.locator('[data-field="vector"]').selectOption('indirect');
      await page.locator('[data-field="quarantineReader"]').uncheck();
      await page.locator('[data-field="outputSecretFilter"]').check();
      if (await page.locator('[data-path="sensitive-disclosure"]').getAttribute('data-state') !== 'blocked') failures.push(`${spec.route} ${viewport.name}: known-secret rendered-output path should be blocked by modeled filter`);
      if (await page.locator('[data-path="data-exfiltration"]').getAttribute('data-state') !== 'reachable') failures.push(`${spec.route} ${viewport.name}: output filter must not falsely block external-egress exfiltration`);

      await page.locator('[data-field="externalEgress"]').uncheck();
      await page.locator('[data-field="egressRestriction"]').uncheck();
      if (await page.locator('[data-control="egressRestriction"]').getAttribute('data-enabled') !== 'false') failures.push(`${spec.route} ${viewport.name}: disabling egress must not silently enable the egress-policy control`);
      if (await page.locator('[data-path="data-exfiltration"]').getAttribute('data-state') !== 'blocked') failures.push(`${spec.route} ${viewport.name}: no-egress architecture should block modeled exfiltration without rewriting control state`);

      await page.locator('[data-field="persistentMemory"]').uncheck();
      await page.locator('[data-field="memoryWriteValidation"]').uncheck();
      if (await page.locator('[data-control="memoryWriteValidation"]').getAttribute('data-enabled') !== 'false') failures.push(`${spec.route} ${viewport.name}: disabling memory must not silently enable the memory-validation control`);
      if (await page.locator('[data-path="persistent-poisoning"]').getAttribute('data-state') !== 'blocked') failures.push(`${spec.route} ${viewport.name}: no-memory architecture should block persistence without rewriting control state`);

      await page.locator('[data-action="share"]').click();
      for (const token of ['preset=', 'vector=', 'quarantineReader=', 'humanApproval=', 'egressRestriction=0', 'memoryWriteValidation=0']) {
        if (!page.url().includes(token)) failures.push(`${spec.route} ${viewport.name}: share URL missing ${token}`);
      }

      response = await page.goto(`${base}${spec.route}?preset=privileged-agent&vector=indirect&quarantineReader=1&humanApproval=0&egressRestriction=0`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
      if (!(await page.locator('[data-field="quarantineReader"]').isChecked())) failures.push(`${spec.route} ${viewport.name}: deep-link quarantine state not restored`);
      if ((await page.locator('[data-output="reachablePaths"]').textContent() || '').trim() !== '0') failures.push(`${spec.route} ${viewport.name}: deep-link reachability state not restored`);

      await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
      const blockedLabel = (await page.locator('[data-output="blockedPaths"]').textContent() || '').trim().toLowerCase();
      if (spec.locale === 'es' && !blockedLabel.includes('rutas bloqueadas')) failures.push(`${spec.route} ${viewport.name}: blocked-path KPI lacks a descriptive Spanish label`);
      if (spec.locale === 'en' && !blockedLabel.includes('blocked paths')) failures.push(`${spec.route} ${viewport.name}: blocked-path KPI lacks a descriptive English label`);

      const kpis = await page.locator('.s5-threat-kpis > div').evaluateAll((nodes) => nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }));
      if (viewport.width >= 1200 && kpis.length === 4) {
        if (Math.max(...kpis.map((b) => b.y)) - Math.min(...kpis.map((b) => b.y)) > 1) failures.push(`${spec.route} desktop: four KPI cells should share one row`);
        if (Math.max(...kpis.map((b) => b.width)) - Math.min(...kpis.map((b) => b.width)) > 1) failures.push(`${spec.route} desktop: KPI cells should have equal width`);

        const scenarioWidths = await page.locator('.s5-tool-controls__section:first-child .s5-tool-field').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
        if (scenarioWidths.some((width) => width < 280)) failures.push(`${spec.route} desktop: scenario selects are too narrow for their selected labels`);

        const influenceLines = await page.locator('[data-output="influence"]').evaluate((node) => {
          const style = getComputedStyle(node);
          const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
          return node.getBoundingClientRect().height / lineHeight;
        });
        if (influenceLines > 1.25) failures.push(`${spec.route} desktop: privileged-influence KPI wraps across multiple lines`);
      }

      await page.screenshot({ path: `${artifactDir}/prompt-injection-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Prompt-injection browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Prompt-injection browser QA passed: ES/EN, 390px/1440px, reachability semantics, concise live-region accessibility, independent controls, desktop readability, deep links, provenance, JSON-LD, labels and horizontal fit verified.');
