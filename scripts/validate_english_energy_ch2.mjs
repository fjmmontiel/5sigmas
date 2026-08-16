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

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);

    const body = await page.locator('body').innerText();
    requireText(body, [
      'Chapter 2 — AI as an electrical technology',
      'around 42 GWh',
      'approximately ten times more energy than a conventional web search',
      'forty times the energy use of that search',
      '415 TWh in 2024',
      'between 945 TWh and 1,260 TWh in 2030',
      'from 50 TWh in 2023 to 554 TWh in 2030',
      'approximately 180 to 320 million tonnes',
      'between 1.6 and 7.6 times higher',
      'between 98% and 99% of global production',
      'approximately 2.3 MWh',
      'between 1.2 and 5 million tonnes of electronic waste by 2030',
      'between 36 and 52 weeks',
      'around two million liters per day',
      'from 560 billion liters in 2024 to 1.2 trillion in 2030',
      'around 85 million liters per year',
      'around 2.01 trillion liters',
      'roughly 3.6 times',
      'more than 20% of the country\'s total electricity consumption',
      'close to 80% by 2030',
      'Why is AI described as an "electrical technology"?',
      'Will improvements in AI hardware efficiency reduce its global energy consumption?',
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
      if (await training.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: training/inference still contains invented English interaction`);
      const text = (await training.textContent()) || '';
      requireText(text, ['Two phases with radically different consumption profiles', 'Training', 'Episodic · High intensity · Concentrated', '~42 GWh', 'Inference', 'Continuous · Low per query · Distributed', '~2.9 Wh', '×10 versus a web search (0.3 Wh)', 'up to ×40 per minute of generated video', 'Billions of daily queries in continuous production', 'Source: IEA, Energy and AI, 2025.'], `${viewport.name}: training/inference`);
      forbidText(text, ['Dos fases con perfiles', 'Entrenamiento', 'Inferencia', '~2,9 Wh', 'Miles de millones de consultas', 'Fuente: IEA'], `${viewport.name}: training/inference`);
      await checkOverflow(training, viewport.name, 'training/inference');
      await capture(training, viewport.name, 'training-inference');
    }

    const rebound = page.locator('[data-demo="02-efecto-rebote"]');
    if (await rebound.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical rebound-effect visual`);
    else {
      if (await rebound.locator('.er-step').count() !== 4) failures.push(`${viewport.name}: rebound lost canonical four-step causal chain`);
      if (await rebound.locator('.er-arrow').count() !== 3) failures.push(`${viewport.name}: rebound lost canonical three arrows`);
      if (await rebound.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: rebound still contains invented English tabs`);
      const text = (await rebound.textContent()) || '';
      requireText(text, ['Why efficiency does not reduce consumption: the rebound effect', 'More efficient chips', 'Lower cost per query', 'More viable use cases', 'Higher total demand', 'Each operation consumes less energy.', 'Usage volume grows faster than efficiency improves.', 'Jevons paradox (1865)'], `${viewport.name}: rebound`);
      forbidText(text, ['Por qué la eficiencia no reduce', 'Chips más eficientes', 'Menor coste por consulta', 'Más casos de uso viables', 'Mayor demanda total', 'Este patrón tiene nombre'], `${viewport.name}: rebound`);
      await checkOverflow(rebound, viewport.name, 'rebound');
      await capture(rebound, viewport.name, 'rebound');
    }

    const bottlenecks = page.locator('[data-demo="02-cuellos-botella"]');
    if (await bottlenecks.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical bottlenecks visual`);
    else {
      if (await bottlenecks.locator('.cue-item').count() !== 5) failures.push(`${viewport.name}: bottlenecks lost one of five canonical resources`);
      if (await bottlenecks.locator('.cue-detail').count() !== 5) failures.push(`${viewport.name}: bottlenecks lost canonical detail blocks`);
      if (await bottlenecks.locator('.bottleneck-flow').count() !== 0) failures.push(`${viewport.name}: bottlenecks still contains old English supply-chain redesign`);
      const text = (await bottlenecks.textContent()) || '';
      requireText(text, ['Five bottlenecks for AI expansion', 'Electricity', 'Critical today', 'Chips', 'Water', 'Growing', 'Talent', 'Regulation', 'Variable', 'AI Act'], `${viewport.name}: bottlenecks`);
      forbidText(text, ['Cinco cuellos de botella', 'Energía', 'Crítico hoy', 'Agua', 'Creciente', 'Talento', 'Regulación'], `${viewport.name}: bottlenecks`);
      await checkOverflow(bottlenecks, viewport.name, 'bottlenecks');
      await capture(bottlenecks, viewport.name, 'bottlenecks');
    }

    const demand = page.locator('[data-demo="02-proyeccion-demanda"]');
    if (await demand.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical demand projection`);
    else {
      if (await demand.locator('.pd-global-pill').count() !== 3) failures.push(`${viewport.name}: demand projection lost three canonical IEA scenario pills`);
      if (await demand.locator('.pd-scale-card').count() !== 3) failures.push(`${viewport.name}: demand projection lost three canonical physical-scale cards`);
      if (await demand.locator('.demand-eq').count() !== 0) failures.push(`${viewport.name}: demand projection still contains old English equation redesign`);
      const text = (await demand.textContent()) || '';
      requireText(text, ['From global data to the local bottleneck', '2024 · 415 TWh', '2030 base · 945 TWh', '2030 high · 1,260 TWh', 'Typical center', '100 MW continuous', '~100,000 homes', 'Large campus', '500 MW continuous', '~500,000 homes', 'Gigacampus', '~2 GW', '~2 million homes', 'slightly above Japan\'s current electricity consumption'], `${viewport.name}: demand projection`);
      forbidText(text, ['Del dato global al cuello de botella local', '2030 alto', '1.260 TWh', 'Centro típico', '100 MW continuos', '100.000 hogares', 'Campus grande', '500.000 hogares', 'millones de hogares'], `${viewport.name}: demand projection`);
      await checkOverflow(demand, viewport.name, 'demand projection');
      await capture(demand, viewport.name, 'demand-projection');
    }

    const footprint = page.locator('[data-demo="02-huella-ambiental"]');
    if (await footprint.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical environmental-footprint visual`);
    else {
      if (await footprint.locator('.ha-card').count() !== 3) failures.push(`${viewport.name}: footprint lost three canonical quantitative cards`);
      if (await footprint.locator('.ha-ppa').count() !== 1) failures.push(`${viewport.name}: footprint lost canonical PPA explanation`);
      if (await footprint.locator('.footprint-grid').count() !== 0) failures.push(`${viewport.name}: footprint still contains old generic system-accounting redesign`);
      const text = (await footprint.textContent()) || '';
      requireText(text, ['Real vs declared footprint: AI electricity, CO₂ and waste', 'AI-specific electricity', '50 → 554 TWh', '×11 from 2023 to 2030', 'CO₂ emissions attributable to AI', '180 → 320 Mt', '1.6 and 7.6 times', 'AI electronic waste', '1.2–5 M t', '~2.3 MWh', 'Why renewable commitments are not equivalent to renewable consumption', 'Three Mile Island'], `${viewport.name}: environmental footprint`);
      forbidText(text, ['Huella real vs declarada', 'Electricidad IA específica', 'Emisiones CO₂ atribuibles', 'Residuos electrónicos de IA', '1,2 – 5 M t', '~2,3 MWh', 'Por qué los compromisos renovables'], `${viewport.name}: environmental footprint`);
      await checkOverflow(footprint, viewport.name, 'environmental footprint');
      await capture(footprint, viewport.name, 'environmental-footprint');
    }

    const water = page.locator('[data-demo="02-agua-golf-datacenters"]');
    if (await water.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical water comparison`);
    else {
      if (await water.locator('.wg-panel').count() !== 2) failures.push(`${viewport.name}: water comparison lost two canonical comparison boundaries`);
      if (await water.locator('.wg-row').count() !== 5) failures.push(`${viewport.name}: water comparison lost one of five canonical quantitative rows`);
      if (await water.locator('.wg-foot').count() !== 1) failures.push(`${viewport.name}: water comparison lost methodology caveat`);
      if (await water.locator('.water-grid').count() !== 0) failures.push(`${viewport.name}: water comparison still contains old generic checklist redesign`);
      const text = (await water.textContent()) || '';
      requireText(text, ['Water: the comparison depends on the boundary', 'Facility vs facility', 'Medium-sized golf course · US', '85 M L/year', 'Typical hyperscale · 100 MW', '730 M L/year', 'about 8.6', 'Sector vs sector', '560,000 M L/year', '1.2 trillion L/year', '2.01 trillion L/year', 'about 3.6 times', 'How to read it without cheating', 'There is no robust basis here for claiming a worldwide water total for golf courses.'], `${viewport.name}: water comparison`);
      forbidText(text, ['Agua: la comparación depende', 'Instalación vs instalación', 'Campo de golf mediano', 'L/año', 'A esta escala gana claramente', '1,2 billones', '2,01 billones', '3,6 veces', 'Cómo leerlo sin trampear'], `${viewport.name}: water comparison`);
      await checkOverflow(water, viewport.name, 'water comparison');
      await capture(water, viewport.name, 'water-comparison');
    }

    const geography = page.locator('[data-demo="02-geografia-ia"]');
    if (await geography.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical AI geography visual`);
    else {
      if (await geography.locator('.ga-lane').count() !== 2) failures.push(`${viewport.name}: geography lost training/inference split`);
      if (await geography.locator('.ga-axis').count() !== 2) failures.push(`${viewport.name}: geography lost canonical priority-to-location axes`);
      if (await geography.locator('.geo-wrap').count() !== 0) failures.push(`${viewport.name}: geography still contains old one-line English placeholder`);
      const text = (await geography.textContent()) || '';
      requireText(text, ['The same AI, two geographies', 'Training follows electricity. Serving follows latency.', 'Training', 'It seeks cheap electricity and massive capacity.', '$/MWh · available power', 'can be far from the user', 'Inference', 'It seeks proximity and stable response times.', 'milliseconds · connectivity', 'close to demand hubs', 'Concentration becomes a grid problem.', 'Ireland', '>20%'], `${viewport.name}: geography`);
      forbidText(text, ['La misma IA, dos geografías', 'Entrenar sigue la energía', 'Busca electricidad barata', 'potencia disponible', 'Inferencia', 'Busca proximidad', 'La concentración se vuelve un problema de red'], `${viewport.name}: geography`);
      await checkOverflow(geography, viewport.name, 'geography');
      await capture(geography, viewport.name, 'geography');
    }

    const positions = await page.evaluate(() => {
      const text = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        trainingBefore: text.indexOf('A model with millions of daily users consumes energy continuously, not episodically.'),
        trainingVisual: text.indexOf('Two phases with radically different consumption profiles'),
        trainingAfter: text.indexOf('Why efficiency does not stop demand'),
        reboundBefore: text.indexOf('despite real improvements in efficiency per operation.'),
        reboundVisual: text.indexOf('Why efficiency does not reduce consumption: the rebound effect'),
        reboundAfter: text.indexOf('The real bottlenecks'),
        bottlenecksBefore: text.indexOf('Five bottlenecks determine how quickly it can actually grow.'),
        bottlenecksVisual: text.indexOf('Five bottlenecks for AI expansion'),
        bottlenecksAfter: text.indexOf('The first and most direct bottleneck: data centers need grid connections'),
        demandBefore: text.indexOf('associated CO₂ emissions rising from approximately 180 to 320 million tonnes'),
        demandVisual: text.indexOf('From global data to the local bottleneck'),
        demandAfter: text.indexOf('When using a comparison with households'),
        footprintBefore: text.indexOf('between 1.6 and 7.6 times higher than their carbon-neutrality claims suggest'),
        footprintVisual: text.indexOf('Real vs declared footprint: AI electricity, CO₂ and waste'),
        footprintAfter: text.indexOf('AI accelerators — primarily NVIDIA GPUs'),
        waterBefore: text.indexOf('roughly 3.6 times the IEA estimate for global data centers in 2024'),
        waterVisual: text.indexOf('Water: the comparison depends on the boundary'),
        waterAfter: text.indexOf('The number of people capable of designing, training and maintaining AI systems at scale'),
        geographyBefore: text.indexOf('This concentration has consequences for the local grid:'),
        geographyVisual: text.indexOf('The same AI, two geographies'),
        geographyAfter: text.indexOf('The next chapter examines the other side of the equation'),
      };
    });
    for (const [name, before, visual, after] of [
      ['training/inference', positions.trainingBefore, positions.trainingVisual, positions.trainingAfter],
      ['rebound', positions.reboundBefore, positions.reboundVisual, positions.reboundAfter],
      ['bottlenecks', positions.bottlenecksBefore, positions.bottlenecksVisual, positions.bottlenecksAfter],
      ['demand projection', positions.demandBefore, positions.demandVisual, positions.demandAfter],
      ['environmental footprint', positions.footprintBefore, positions.footprintVisual, positions.footprintAfter],
      ['water comparison', positions.waterBefore, positions.waterVisual, positions.waterAfter],
      ['geography', positions.geographyBefore, positions.geographyVisual, positions.geographyAfter],
    ]) {
      if (!(before >= 0 && visual > before && after > visual)) failures.push(`${viewport.name}: ${name} moved away from canonical article hook`);
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
