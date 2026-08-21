#!/usr/bin/env node
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });
const cases = [
  { route:'/herramientas/atencion-transformer/', locale:'es', repeated:'gato' },
  { route:'/en/tools/transformer-attention/', locale:'en', repeated:'cat' }
];
const viewports = [{width:390,height:844,name:'mobile'},{width:1440,height:1100,name:'desktop'}];
const setRange = async (locator, value) => locator.evaluate((node, next) => { node.value = String(next); node.dispatchEvent(new Event('input', { bubbles:true })); }, value);

for (const spec of cases) for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const response = await page.goto(`${base}${spec.route}`, { waitUntil:'networkidle' });
  if (!response?.ok()) { failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`); await page.close(); continue; }
  if (await page.locator('[data-s5-transformer-attention]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: visualizer root missing`);
  await page.waitForFunction(() => document.querySelectorAll('[data-attention-matrix] tbody tr').length === 5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: horizontal page overflow ${overflow}px`);
  const unlabeled = await page.locator('[data-s5-tool-form] input, [data-s5-tool-form] select').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
  if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);
  if (await page.locator('[data-field="queryIndex"]').inputValue() !== '4') failures.push(`${spec.route} ${viewport.name}: default query should be final token`);
  if (await page.locator('[data-field="head"]').inputValue() !== 'repeat') failures.push(`${spec.route} ${viewport.name}: default head should be repeat`);
  const topText = (await page.locator('[data-output="topToken"]').textContent() || '').toLowerCase();
  if (!topText.includes(spec.repeated)) failures.push(`${spec.route} ${viewport.name}: repeat head did not surface matching token`);
  const matrixState = await page.locator('[data-attention-matrix]').evaluate((host) => ({ rows:host.querySelectorAll('tbody tr').length, columns:host.querySelectorAll('thead th').length-1, selected:host.querySelectorAll('tbody tr[data-selected="true"]').length, nan:host.innerHTML.includes('NaN')||host.innerHTML.includes('Infinity') }));
  if (matrixState.rows!==5 || matrixState.columns!==5 || matrixState.selected!==1 || matrixState.nan) failures.push(`${spec.route} ${viewport.name}: invalid matrix state ${JSON.stringify(matrixState)}`);
  await page.locator('[data-field="queryIndex"]').selectOption('2');
  if (await page.locator('[data-attention-matrix] tbody tr[data-selected="true"] td[data-masked="true"]').count() !== 2) failures.push(`${spec.route} ${viewport.name}: query 3 should mask two future keys`);
  await page.locator('[data-field="causal"]').uncheck();
  if (await page.locator('[data-attention-matrix] tbody tr[data-selected="true"] td[data-masked="true"]').count() !== 0) failures.push(`${spec.route} ${viewport.name}: disabling causal mask should expose future keys`);
  await page.locator('[data-action="reset"]').click();
  const entropyBefore = (await page.locator('[data-output="entropy"]').textContent() || '').trim();
  await setRange(page.locator('[data-field="temperature"]'), 3);
  if ((await page.locator('[data-output="entropy"]').textContent() || '').trim() === entropyBefore) failures.push(`${spec.route} ${viewport.name}: temperature did not change entropy`);
  await page.locator('[data-action="reset"]').click();
  await setRange(page.locator('[data-logit-index="0"]'), 4);
  const firstToken = (await page.locator('[data-field="queryIndex"] option').first().textContent() || '').split('·').pop().trim();
  if (!(await page.locator('[data-output="topToken"]').textContent() || '').includes(firstToken)) failures.push(`${spec.route} ${viewport.name}: editing a logit did not change dominant key`);
  const outputBefore = (await page.locator('[data-output="outputScalar"]').textContent() || '').trim();
  await page.locator('[data-value-index="0"]').fill('10'); await page.locator('[data-value-index="0"]').dispatchEvent('input');
  if ((await page.locator('[data-output="outputScalar"]').textContent() || '').trim() === outputBefore) failures.push(`${spec.route} ${viewport.name}: editing V did not change output`);
  await page.locator('[data-head-choice="previous"]').click();
  if (await page.locator('[data-field="head"]').inputValue() !== 'previous') failures.push(`${spec.route} ${viewport.name}: head comparison did not switch head`);
  await page.locator('[data-action="share"]').click();
  if (!['text=','h=','q=','s=','v='].every((part)=>page.url().includes(part))) failures.push(`${spec.route} ${viewport.name}: share action missing state`);
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  let hasWebApplication=false; for (const raw of jsonLd) { try { if (JSON.parse(raw)['@type']==='WebApplication') hasWebApplication=true; } catch { failures.push(`${spec.route} ${viewport.name}: invalid JSON-LD`); } }
  if (!hasWebApplication) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);
  const hrefs = await page.locator('.s5-tool-method__notes a').evaluateAll((nodes)=>nodes.map((node)=>node.href));
  if (!hrefs.some((href)=>href.includes('arxiv.org/abs/1706.03762'))) failures.push(`${spec.route} ${viewport.name}: paper provenance missing`);
  if (!hrefs.some((href)=>href.includes('docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html'))) failures.push(`${spec.route} ${viewport.name}: PyTorch provenance missing`);
  if (!hrefs.some((href)=>href.includes('arxiv.org/abs/1902.10186'))) failures.push(`${spec.route} ${viewport.name}: Jain/Wallace interpretability provenance missing`);
  if (!hrefs.some((href)=>href.includes('arxiv.org/abs/1908.04626'))) failures.push(`${spec.route} ${viewport.name}: Wiegreffe/Pinter interpretability provenance missing`);

  await page.locator('[data-action="reset"]').click();
  await page.locator('[data-field="text"]').fill('safe <img/src=x/onerror=window.__s5Xss=1> safe');
  await page.locator('[data-field="text"]').dispatchEvent('change');
  await page.waitForFunction(() => document.querySelectorAll('[data-attention-matrix] tbody tr').length === 3);
  const injectionState = await page.evaluate(() => ({
    injectedNodes: document.querySelectorAll('[data-attention-matrix] img, [data-attention-row] img, [data-head-comparison] img').length,
    executed: window.__s5Xss === 1,
    visibleToken: document.querySelector('[data-field="queryIndex"] option:nth-child(2)')?.textContent || ''
  }));
  if (injectionState.injectedNodes || injectionState.executed || !injectionState.visibleToken.includes('<img/src=x/onerror=window.__s5Xss=1>')) {
    failures.push(`${spec.route} ${viewport.name}: token labels are not rendered as inert text ${JSON.stringify(injectionState)}`);
  }

  await page.locator('[data-field="text"]').fill(`safe ${'x'.repeat(110)} safe`);
  await page.locator('[data-field="text"]').dispatchEvent('change');
  await page.waitForFunction(() => document.querySelectorAll('[data-attention-matrix] tbody tr').length === 3);
  const longTokenOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (longTokenOverflow > 1) failures.push(`${spec.route} ${viewport.name}: long token caused horizontal page overflow ${longTokenOverflow}px`);

  await page.locator('[data-action="reset"]').click();
  await page.screenshot({ path:`${artifactDir}/transformer-attention-${spec.locale}-${viewport.name}.png`, fullPage:true });
  await page.close();
}
await browser.close();
if (failures.length) { console.error('Transformer attention browser QA failed:'); for (const failure of failures) console.error(` - ${failure}`); process.exit(1); }
console.log('Transformer attention browser QA passed: ES/EN, 390px/1440px, masking, temperature, editable scores/values, head switching, matrix integrity, inert/long token rendering, provenance, JSON-LD and shareable state verified.');
