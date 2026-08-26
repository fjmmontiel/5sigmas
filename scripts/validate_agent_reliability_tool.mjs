#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/fiabilidad-evaluacion-agentes/', locale: 'es' },
  { route: '/en/tools/agent-reliability-eval/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

function percent(text) {
  const normalized = String(text || '').trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  return Number(normalized);
}

async function installWebMcpHarness(page) {
  await page.addInitScript(() => {
    window.__s5WebMcpTools = [];
    const registry = window.__s5WebMcpTools;
    const modelContext = {
      async registerTool(definition, options = {}) {
        registry.push(definition);
        const signal = options?.signal;
        if (signal?.addEventListener) {
          signal.addEventListener('abort', () => {
            const index = registry.indexOf(definition);
            if (index >= 0) registry.splice(index, 1);
          }, { once: true });
        }
      }
    };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      enumerable: true,
      value: modelContext
    });
  });
}

async function verifyWebMcp(page, spec, viewport) {
  if (viewport.name !== 'desktop') return;
  try {
    await page.waitForFunction(() => document.documentElement.dataset.webmcp === 'ready', null, { timeout: 5000 });
    await page.waitForFunction(() => document.documentElement.dataset.webmcpKnowledge === 'ready', null, { timeout: 5000 });
  } catch {
    failures.push(`${spec.route}: WebMCP runtimes did not reach ready state`);
    return;
  }

  const required = [
    '5sigmas_discover_tools',
    '5sigmas_search_library',
    '5sigmas_page_context',
    '5sigmas_search_knowledge',
    '5sigmas_get_knowledge_item',
    '5sigmas_get_topic_bundle',
    '5sigmas_search_visuals',
    '5sigmas_get_evidence',
    '5sigmas_knowledge_stats',
    '5sigmas_run_agent_reliability_eval'
  ];
  const names = await page.evaluate(() => window.__s5WebMcpTools.map((tool) => tool.name));
  for (const name of required) {
    if (!names.includes(name)) failures.push(`${spec.route}: WebMCP tool missing ${name}`);
  }

  const probe = await page.evaluate(async () => {
    const tools = window.__s5WebMcpTools;
    const invoke = async (name, args) => {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`missing ${name}`);
      return await tool.execute(args || {});
    };
    const stats = await invoke('5sigmas_knowledge_stats', {});
    const search = await invoke('5sigmas_search_knowledge', { query: 'agent reliability', limit: 8 });
    const visuals = await invoke('5sigmas_search_visuals', { query: 'agent', limit: 8 });
    const bundle = await invoke('5sigmas_get_topic_bundle', { query: 'prompt injection', limit_per_kind: 3 });
    const dynamic = await invoke('5sigmas_run_agent_reliability_eval', { tasks: 100, firstPassSuccesses: 80, retryingTasks: 15, retryRecoveredTasks: 10 });
    let item = null;
    const firstId = search?.structuredContent?.results?.[0]?.id;
    if (firstId) item = await invoke('5sigmas_get_knowledge_item', { id: firstId, include_content: true });
    return { stats, search, visuals, bundle, dynamic, item };
  });

  const stats = probe.stats?.structuredContent;
  if (!stats || stats.total_items < 25) failures.push(`${spec.route}: knowledge graph unexpectedly small (${stats?.total_items ?? 'missing'})`);
  const visualCount = ['image', 'svg', 'animation', 'video'].reduce((sum, kind) => sum + Number(stats?.counts?.[kind] || 0), 0);
  if (visualCount < 1) failures.push(`${spec.route}: knowledge graph exposes no visual/video items`);
  if (Number(stats?.counts?.evidence || 0) < 1) failures.push(`${spec.route}: knowledge graph exposes no evidence items`);
  if (!probe.search?.structuredContent?.results?.length) failures.push(`${spec.route}: knowledge search returned no agent-reliability material`);
  if (!probe.visuals?.structuredContent || !Array.isArray(probe.visuals.structuredContent.results)) failures.push(`${spec.route}: visual search returned an invalid payload`);
  const bundleGroups = Object.values(probe.bundle?.structuredContent?.bundle || {});
  if (!bundleGroups.some((entries) => Array.isArray(entries) && entries.length)) failures.push(`${spec.route}: topic bundle returned no connected knowledge`);
  if (!probe.dynamic?.structuredContent?.outputs || !Object.keys(probe.dynamic.structuredContent.outputs).length) failures.push(`${spec.route}: dynamic evaluator WebMCP execution returned no outputs`);
  if (!probe.item?.structuredContent?.item?.id) failures.push(`${spec.route}: get_knowledge_item failed for a search result`);
  if (!probe.item?.structuredContent?.markdown_content) failures.push(`${spec.route}: get_knowledge_item did not expose clean Markdown content`);
}

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await installWebMcpHarness(page);
    let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    await verifyWebMcp(page, spec, viewport);

    if (await page.locator('[data-s5-agent-reliability]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: root missing`);
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);
    if (await page.locator('.md-sidebar--primary:visible').count()) failures.push(`${spec.route} ${viewport.name}: documentation navigation visible`);
    if (await page.locator('.md-footer:visible').count()) failures.push(`${spec.route} ${viewport.name}: documentation footer visible`);

    const unlabeled = await page.locator('[data-field]').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} controls lack programmatic labels`);

    if (spec.locale === 'es') {
      const bodyText = (await page.locator('[data-s5-agent-reliability]').innerText()).toLowerCase();
      for (const anglicism of [' retries ', ' retry ', ' tools ', ' tool ', ' gates ', ' outcome ']) {
        if (` ${bodyText.replace(/\s+/g, ' ')} `.includes(anglicism)) failures.push(`${spec.route} ${viewport.name}: avoid Spanish UI anglicism ${anglicism.trim()}`);
      }
      if (!bodyText.includes('los criterios comparan estimaciones puntuales')) failures.push(`${spec.route} ${viewport.name}: point-estimate gate limitation missing`);
    }

    const finalSuccess = percent(await page.locator('[data-output="finalSuccess"]').textContent());
    const firstPass = percent(await page.locator('[data-output="firstPass"]').textContent());
    const toolAccuracy = percent(await page.locator('[data-output="toolAccuracy"]').textContent());
    const retryRecovery = percent(await page.locator('[data-output="retryRecovery"]').textContent());
    if (Math.abs(finalSuccess - 86) > 0.11) failures.push(`${spec.route} ${viewport.name}: default final success should be 86%, got ${finalSuccess}`);
    if (Math.abs(firstPass - 74) > 0.11) failures.push(`${spec.route} ${viewport.name}: default first-pass success should be 74%, got ${firstPass}`);
    if (Math.abs(toolAccuracy - 93.7) > 0.11) failures.push(`${spec.route} ${viewport.name}: default tool accuracy should be 93.7%, got ${toolAccuracy}`);
    if (Math.abs(retryRecovery - 57.1) > 0.11) failures.push(`${spec.route} ${viewport.name}: default retry recovery should be 57.1%, got ${retryRecovery}`);

    const gateSummary = (await page.locator('[data-output="gateSummary"]').textContent() || '').trim();
    const expectedSummary = spec.locale === 'es' ? '4/6 criterios' : '4/6 gates';
    if (gateSummary !== expectedSummary) failures.push(`${spec.route} ${viewport.name}: expected ${expectedSummary}, got ${gateSummary}`);
    if (await page.locator('[data-gate="toolDecision"]').getAttribute('data-state') !== 'fail') failures.push(`${spec.route} ${viewport.name}: tool-decision gate should fail at default`);
    if (await page.locator('[data-gate="policyViolations"]').getAttribute('data-state') !== 'fail') failures.push(`${spec.route} ${viewport.name}: policy gate should fail at default`);

    await page.locator('[data-field="correctToolDecisions"]').fill('510');
    await page.locator('[data-field="correctToolDecisions"]').dispatchEvent('input');
    await page.locator('[data-field="policyViolationTasks"]').fill('1');
    await page.locator('[data-field="policyViolationTasks"]').dispatchEvent('input');
    const allPassSummary = spec.locale === 'es' ? '6/6 criterios' : '6/6 gates';
    if ((await page.locator('[data-output="gateSummary"]').textContent() || '').trim() !== allPassSummary) failures.push(`${spec.route} ${viewport.name}: corrected scenario should pass all criteria`);
    if (await page.locator('[data-output="gateSummary"]').getAttribute('data-state') !== 'pass') failures.push(`${spec.route} ${viewport.name}: all-pass summary state missing`);

    await page.locator('[data-action="share"]').click();
    for (const token of ['n=', 'fp=', 'rr=', 'td=', 'tc=', 'to=', 'pv=', 'gs=', 'gus=']) {
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

    const sourceLinks = await page.locator('.s5-note-feature__meta a').evaluateAll((links) => links.map((link) => link.href));
    for (const expected of ['platform.openai.com/docs/guides/trace-grading', 'arxiv.org/abs/2406.12045', 'arxiv.org/abs/2308.03688']) {
      if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
    }

    const kpiBoxes = await page.locator('.s5-agent-kpis .s5-tool-kpi').evaluateAll((nodes) => nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }));
    if (viewport.width >= 1200 && kpiBoxes.length === 4) {
      if (Math.max(...kpiBoxes.map((b) => b.y)) - Math.min(...kpiBoxes.map((b) => b.y)) > 1) failures.push(`${spec.route} desktop: four KPI cards should share one row`);
      if (Math.max(...kpiBoxes.map((b) => b.width)) - Math.min(...kpiBoxes.map((b) => b.width)) > 1) failures.push(`${spec.route} desktop: KPI cards should have equal width`);
    }

    response = await page.goto(`${base}${spec.route}?n=100&fp=70&rt=25&rr=15&ra=35&td=200&tc=190&tw=5&st=700&us=70&to=2&pv=0&m=50000&gs=80&gf=65&gt=90&gto=3&gpv=1&gus=12`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
    if (await page.locator('[data-field="tasks"]').inputValue() !== '100') failures.push(`${spec.route} ${viewport.name}: deep-link task count not restored`);
    if (Math.abs(percent(await page.locator('[data-output="finalSuccess"]').textContent()) - 85) > 0.11) failures.push(`${spec.route} ${viewport.name}: deep-link final success should be 85%`);

    await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${artifactDir}/agent-reliability-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('Agent reliability / WebMCP browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Agent reliability + full knowledge WebMCP browser QA passed: ES/EN, knowledge graph retrieval, visuals/evidence/topic bundles, dynamic evaluator execution, responsive UI, provenance and deep links verified.');
