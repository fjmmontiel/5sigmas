#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const failures = [];

function requireText(text, tokens, prefix) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${prefix}: missing ${JSON.stringify(token)}`);
}
function forbidText(text, tokens, prefix) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${prefix}: unexpected ${JSON.stringify(token)}`);
}
async function checkOverflow(root, viewport, name) {
  const [clientWidth, scrollWidth] = await root.evaluate((node) => [node.clientWidth, node.scrollWidth]);
  if (scrollWidth > clientWidth + 2) failures.push(`${viewport}: ${name} internal overflow ${scrollWidth - clientWidth}px`);
}
async function capture(root, viewport, name) {
  await root.screenshot({ path: path.join(outDir, `english-energy-ch2-${name}-${viewport}.png`), animations: 'disabled' });
}
async function checkPlacement(root, viewport, name, beforeText, afterText) {
  const ok = await root.evaluate((node, { beforeText, afterText }) => {
    const content = node.closest('.md-content__inner') || document.querySelector('.md-content__inner') || document.body;
    const candidates = [...content.querySelectorAll('p,h2,h3,h4,blockquote')];
    const before = candidates.find((el) => (el.textContent || '').includes(beforeText));
    const after = candidates.find((el) => (el.textContent || '').includes(afterText));
    if (!before || !after) return false;
    const beforeOk = before.contains(node) || Boolean(before.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    const afterOk = node.contains(after) || Boolean(node.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
    return beforeOk && afterOk;
  }, { beforeText, afterText });
  if (!ok) failures.push(`${viewport}: ${name} moved away from canonical article hook`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const body = await page.locator('body').innerText();
    requireText(body, [
      'Chapter 2 — AI as an electrical technology', 'around 42 GWh',
      'approximately ten times more energy than a conventional web search', 'forty times the energy use of that search',
      '415 TWh in 2024', 'between 945 TWh and 1,260 TWh in 2030', 'from 50 TWh in 2023 to 554 TWh in 2030',
      'approximately 180 to 320 million tonnes', 'between 1.6 and 7.6 times higher', 'between 98% and 99% of global production',
      'approximately 2.3 MWh', 'between 1.2 and 5 million tonnes of electronic waste by 2030', 'between 36 and 52 weeks',
      'around two million liters per day', 'from 560 billion liters in 2024 to 1.2 trillion in 2030',
      'around 85 million liters per year', 'around 2.01 trillion liters', 'roughly 3.6 times',
      'more than 20% of the country\'s total electricity consumption', 'close to 80% by 2030',
      'Why is AI described as an "electrical technology"?', 'Will improvements in AI hardware efficiency reduce its global energy consumption?',
      'IEA (2025)', 'Greenpeace (2025)', 'Epoch AI (2023)',
    ], `${viewport.name}: article`);
    forbidText(body, [
      'Capítulo 2', 'Qué implica "compute"', 'Por qué la eficiencia no frena', 'Los cuellos de botella reales',
      'Preguntas frecuentes', 'Fuentes base', 'Continue the path', 'A better measurement stack',
      'The engineering question is whether efficiency improves faster than aggregate demand expands.',
    ], `${viewport.name}: article`);

    const training = page.locator('[data-demo="02-entrenamiento-inferencia"]');
    if (await training.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical training/inference visual`);
    else {
      if (await training.locator('.ei2-phase').count() !== 2) failures.push(`${viewport.name}: training/inference lost one of two canonical phases`);
      if (await training.locator('.ei2-stat').count() !== 2) failures.push(`${viewport.name}: training/inference lost one of two canonical quantitative blocks`);
      if (await training.locator('.ei2-item').count() !== 6) failures.push(`${viewport.name}: training/inference lost canonical six supporting facts`);
      if (await training.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: training/inference contains invented interaction`);
      const text = (await training.textContent()) || '';
      requireText(text, ['Two phases with radically different consumption profiles', 'Training', '~42 GWh', 'Inference', '~2.9 Wh', '×10 versus a web search (0.3 Wh)', 'up to ×40 per minute of generated video'], `${viewport.name}: training/inference`);
      forbidText(text, ['Dos fases con perfiles', 'Entrenamiento', 'Inferencia', '~2,9 Wh'], `${viewport.name}: training/inference`);
      await checkPlacement(training, viewport.name, 'training/inference', 'A model with millions of daily users consumes energy continuously, not episodically.', 'Why efficiency does not stop demand');
      await checkOverflow(training, viewport.name, 'training/inference'); await capture(training, viewport.name, 'training-inference');
    }

    const rebound = page.locator('[data-demo="02-efecto-rebote"]');
    if (await rebound.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical rebound-effect visual`);
    else {
      if (await rebound.locator('.er-step').count() !== 4) failures.push(`${viewport.name}: rebound lost canonical four-step causal chain`);
      if (await rebound.locator('.er-arrow').count() !== 3) failures.push(`${viewport.name}: rebound lost canonical three arrows`);
      if (await rebound.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: rebound contains invented tabs`);
      const text = (await rebound.textContent()) || '';
      requireText(text, ['Why efficiency does not reduce consumption: the rebound effect', 'More efficient chips', 'Lower cost per query', 'More viable use cases', 'Higher total demand', 'Jevons paradox (1865)'], `${viewport.name}: rebound`);
      forbidText(text, ['Por qué la eficiencia no reduce', 'Chips más eficientes', 'Menor coste por consulta', 'Más casos de uso viables', 'Mayor demanda total'], `${viewport.name}: rebound`);
      await checkPlacement(rebound, viewport.name, 'rebound', 'despite real improvements in efficiency per operation.', 'The real bottlenecks');
      await checkOverflow(rebound, viewport.name, 'rebound'); await capture(rebound, viewport.name, 'rebound');
    }

    const bottlenecks = page.locator('[data-demo="02-cuellos-botella"]');
    if (await bottlenecks.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical bottlenecks visual`);
    else {
      if (await bottlenecks.locator('.cue-item').count() !== 5) failures.push(`${viewport.name}: bottlenecks lost one of five canonical resources`);
      if (await bottlenecks.locator('.cue-detail').count() !== 5) failures.push(`${viewport.name}: bottlenecks lost canonical detail blocks`);
      if (await bottlenecks.locator('.bottleneck-flow').count() !== 0) failures.push(`${viewport.name}: old English bottleneck redesign remains`);
      const text = (await bottlenecks.textContent()) || '';
      requireText(text, ['Five bottlenecks to AI expansion', 'Energy', 'Critical today', 'Chips', 'Water', 'Growing', 'Talent', 'Regulation', 'Variable', 'AI Act'], `${viewport.name}: bottlenecks`);
      forbidText(text, ['Cinco cuellos de botella', 'Energía', 'Crítico hoy', 'Agua', 'Creciente', 'Talento', 'Regulación'], `${viewport.name}: bottlenecks`);
      await checkOverflow(bottlenecks, viewport.name, 'bottlenecks'); await capture(bottlenecks, viewport.name, 'bottlenecks');
    }

    const demand = page.locator('[data-demo="02-proyeccion-demanda"]');
    if (await demand.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical demand projection`);
    else {
      if (await demand.locator('.pd-global-pill').count() !== 3) failures.push(`${viewport.name}: demand projection lost three canonical IEA scenario pills`);
      if (await demand.locator('.pd-scale-card').count() !== 3) failures.push(`${viewport.name}: demand projection lost three canonical physical-scale cards`);
      if (await demand.locator('.demand-eq').count() !== 0) failures.push(`${viewport.name}: old English demand equation remains`);
      const text = (await demand.textContent()) || '';
      requireText(text, ['From global data to the local bottleneck', '2024 · 415 TWh', '2030 base · 945 TWh', '2030 high · 1,260 TWh', '100 MW continuous', '~100,000 homes', '500 MW continuous', '~500,000 homes', '~2 GW', '~2 million homes'], `${viewport.name}: demand projection`);
      forbidText(text, ['Del dato global al cuello de botella local', '2030 alto', '1.260 TWh', '100 MW continuos', '100.000 hogares'], `${viewport.name}: demand projection`);
      await checkPlacement(demand, viewport.name, 'demand projection', 'associated CO₂ emissions rising from approximately 180 to 320 million tonnes', 'When using a comparison with households');
      await checkOverflow(demand, viewport.name, 'demand projection'); await capture(demand, viewport.name, 'demand-projection');
    }

    const footprint = page.locator('[data-demo="02-huella-ambiental"]');
    if (await footprint.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical environmental-footprint visual`);
    else {
      if (await footprint.locator('.ha-card').count() !== 3) failures.push(`${viewport.name}: footprint lost three canonical quantitative cards`);
      if (await footprint.locator('.ha-ppa').count() !== 1) failures.push(`${viewport.name}: footprint lost canonical PPA explanation`);
      if (await footprint.locator('.footprint-grid').count() !== 0) failures.push(`${viewport.name}: old English footprint redesign remains`);
      const text = (await footprint.textContent()) || '';
      requireText(text, ['Real vs declared footprint: AI electricity, CO₂ and waste', '50 → 554 TWh', '180 → 320 Mt', '1.6 and 7.6 times', '1.2–5 M t', '~2.3 MWh', 'Why renewable commitments are not equivalent to renewable consumption'], `${viewport.name}: environmental footprint`);
      forbidText(text, ['Huella real vs declarada', 'Electricidad IA específica', 'Emisiones CO₂ atribuibles', 'Residuos electrónicos de IA'], `${viewport.name}: environmental footprint`);
      await checkPlacement(footprint, viewport.name, 'environmental footprint', 'between 1.6 and 7.6 times higher than their carbon-neutrality claims suggest', 'AI accelerators — primarily NVIDIA GPUs');
      await checkOverflow(footprint, viewport.name, 'environmental-footprint'); await capture(footprint, viewport.name, 'environmental-footprint');
    }

    const water = page.locator('[data-demo="02-agua-golf-datacenters"]');
    if (await water.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical water comparison`);
    else {
      if (await water.locator('.wg-panel').count() !== 2) failures.push(`${viewport.name}: water comparison lost two canonical comparison boundaries`);
      if (await water.locator('.wg-row').count() !== 5) failures.push(`${viewport.name}: water comparison lost one of five canonical quantitative rows`);
      if (await water.locator('.wg-foot').count() !== 1) failures.push(`${viewport.name}: water comparison lost methodology caveat`);
      if (await water.locator('.water-grid').count() !== 0) failures.push(`${viewport.name}: old English water checklist remains`);
      const text = (await water.textContent()) || '';
      requireText(text, ['Water: the comparison depends on the boundary', 'Facility vs facility', '85 M L/year', '730 M L/year', 'about 8.6', 'Sector vs sector', '560,000 M L/year', '1.2 trillion L/year', '2.01 trillion L/year', 'about 3.6 times', 'How to read it without cheating'], `${viewport.name}: water comparison`);
      forbidText(text, ['Agua: la comparación depende', 'Instalación vs instalación', 'Campo de golf mediano', '1,2 billones', '2,01 billones'], `${viewport.name}: water comparison`);
      await checkPlacement(water, viewport.name, 'water comparison', 'roughly 3.6 times the IEA estimate for global data centers in 2024', 'The number of people capable of designing, training and maintaining AI systems at scale');
      await checkOverflow(water, viewport.name, 'water comparison'); await capture(water, viewport.name, 'water-comparison');
    }

    const geography = page.locator('[data-demo="02-geografia-ia"]');
    if (await geography.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical AI geography visual`);
    else {
      if (await geography.locator('.ga-lane').count() !== 2) failures.push(`${viewport.name}: geography lost training/inference split`);
      if (await geography.locator('.ga-axis').count() !== 2) failures.push(`${viewport.name}: geography lost canonical priority-to-location axes`);
      if (await geography.locator('.geo-wrap').count() !== 0) failures.push(`${viewport.name}: old one-line English geography placeholder remains`);
      const text = (await geography.textContent()) || '';
      requireText(text, ['The same AI, two geographies', 'Training follows electricity. Serving follows latency.', 'Training', 'It seeks cheap electricity and massive capacity.', '$/MWh · available power', 'Inference', 'It seeks proximity and stable response times.', 'milliseconds · connectivity', 'Concentration becomes a grid problem.', 'Ireland', '>20%'], `${viewport.name}: geography`);
      forbidText(text, ['La misma IA, dos geografías', 'Entrenar sigue la energía', 'Busca electricidad barata', 'potencia disponible', 'Inferencia', 'Busca proximidad'], `${viewport.name}: geography`);
      await checkPlacement(geography, viewport.name, 'geography', 'This concentration has consequences for the local grid:', 'The next chapter examines the other side of the equation');
      await checkOverflow(geography, viewport.name, 'geography'); await capture(geography, viewport.name, 'geography');
    }

    const videos = page.locator('video[data-s5-inline-video-player]');
    if (await videos.count() !== 1) failures.push(`${viewport.name}: expected one native-English Chapter 2 video, found ${await videos.count()}`);
    else {
      const video = videos.first();
      const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
      const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
      if (sourceUrl.pathname !== '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica.mp4') failures.push(`${viewport.name}: wrong native-English Chapter 2 video ${sourceUrl.pathname}`);
      if (posterUrl.pathname !== '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica.jpg') failures.push(`${viewport.name}: wrong native-English Chapter 2 poster ${posterUrl.pathname}`);
    }

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);
    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.screenshot({ path: path.join(outDir, `english-energy-ch2-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy Chapter 2 QA failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
    console.error(`::error title=English Energy Chapter 2 QA::${failure.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
  }
  process.exit(1);
}
console.log('English Energy Chapter 2 QA passed: canonical article evidence and all seven visuals are faithful, correctly placed and overflow-clean on desktop/mobile.');
