#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  { slug:'01-por-que-ahora', route:'/en/series/datacenters-espacio/01-por-que-ahora/', title:'Chapter 1 — Why now', concepts:['350,000','six bottlenecks','launch'], demos:3, prefix:'dc-01-', shot:'english-datacenters-01-why-now.png' },
  { slug:'02-energia-calor-conectividad', route:'/en/series/datacenters-espacio/02-energia-calor-conectividad/', title:'Chapter 2 — Energy, heat and connectivity', concepts:['4,000 m²','thermal radiation','downlink'], demos:5, prefix:'dc-02-', shot:'english-datacenters-02-physics.png' },
  { slug:'03-que-es-datacenter-espacio', route:'/en/series/datacenters-espacio/03-que-es-datacenter-espacio/', title:'Chapter 3 — What is “a data center in space”?', concepts:['Starcloud','Axiom','Three-Body'], demos:4, prefix:'dc-03-', shot:'english-datacenters-03-projects.png' },
  { slug:'04-huella-real-datacenter', route:'/en/series/datacenters-espacio/04-huella-real-datacenter/', title:'Chapter 4 — The real footprint of a data center', concepts:['WUE','PUE','cobalt','120 kW'], demos:9, prefix:'dc-04-', shot:'english-datacenters-04-footprint.png' },
];
const forbidden = ['Capítulo ', 'Preguntas frecuentes', 'Prerrequisitos', 'Siguiente capítulo', 'Fuentes base'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let total = 0;

async function assertChapter1Canonical(page, route, viewport) {
  const roots = [
    ['.ddc[data-demo="dc-01-bottlenecks"]', 'bottleneck map'],
    ['.dpe[data-demo="dc-01-why-space"]', 'orbital levers'],
    ['.dli[data-demo="dc-01-launch-cost"]', 'launch curve'],
  ];
  for (const [selector, label] of roots) {
    if (await page.locator(selector).count() !== 1) failures.push(`${route}: missing canonical ${label}`);
  }
  if (await page.locator('.dcv[data-demo^="dc-01-"]').count()) failures.push(`${route}: legacy Chapter 1 redesign remains`);

  const structural = [
    ['.ddc svg.viz-pressure-map', 1, 'bottleneck pressure map'],
    ['.ddc .node', 5, 'bottleneck nodes'],
    ['.ddc .read span', 3, 'bottleneck teaching notes'],
    ['.dpe svg.viz-three-levers', 1, 'three-lever map'],
    ['.dpe .pill', 3, 'three-lever outcomes'],
    ['.dpe .read span', 3, 'three-lever teaching notes'],
    ['.dli svg.viz-launch-curve', 1, 'launch curve'],
    ['.dli .node', 3, 'launch-cost states'],
    ['.dli .read span', 3, 'launch-cost teaching notes'],
  ];
  for (const [selector, expected, label] of structural) {
    const count = await page.locator(selector).count();
    if (count !== expected) failures.push(`${route}: ${label} expected ${expected}, found ${count}`);
  }

  const body = await page.locator('body').innerText();
  const anchors = [
    '4–10 years in key markets',
    'Power grid and water are the most severe bottlenecks',
    'Space changes three levers; it does not make everything viable',
    'Mass: every kilogram launched shapes the design',
    'Falling launch cost opens comparison, not automatic viability',
    'Future: depends on total operating cost',
    '560 billion litres per year',
    '1.2 trillion litres in 2030',
    '95–99%',
    '$0.002 per kWh',
    '100 GW of AI compute',
    'What is the FOOL paper and what does it propose for the satellite downlink bottleneck?',
    'Base sources',
  ];
  for (const x of anchors) if (!body.includes(x)) failures.push(`${route}: missing canonical Chapter 1 evidence ${JSON.stringify(x)}`);
  for (const x of ['What to carry into the rest of the series', 'That is a genuine form of data gravity', 'The correct comparison']) {
    if (body.includes(x)) failures.push(`${route}: English-only Chapter 1 framing remains ${JSON.stringify(x)}`);
  }

  const refs = page.locator('h2', { hasText:'5. References' });
  if (await refs.count() !== 1) failures.push(`${route}: missing canonical references section`);
  const rows = page.locator('table tbody tr');
  if (await rows.count() !== 10) failures.push(`${route}: expected 10 canonical reference rows, found ${await rows.count()}`);

  const hookOrder = [
    ['2. Terrestrial bottlenecks', '.ddc[data-demo="dc-01-bottlenecks"]', 'h3', 'Power grid'],
    ['3. Why space enters the discussion', '.dpe[data-demo="dc-01-why-space"]', 'p', 'What is real as a potential advantage'],
    ['4. The launch-cost inflection point', '.dli[data-demo="dc-01-launch-cost"]', 'p', 'On 4 February 2026'],
  ];
  for (const [headingText, visualSelector, afterSelector, afterText] of hookOrder) {
    const h = page.locator('h2', { hasText:headingText }).first();
    const v = page.locator(visualSelector).first();
    const after = page.locator(afterSelector, { hasText:afterText }).first();
    if (!(await h.count()) || !(await v.count()) || !(await after.count())) {
      failures.push(`${route}: cannot resolve canonical hook order for ${visualSelector}`);
      continue;
    }
    const order = await page.evaluate(([hEl, vEl, aEl]) => ({
      headingBeforeVisual: Boolean(hEl.compareDocumentPosition(vEl) & Node.DOCUMENT_POSITION_FOLLOWING),
      visualBeforeAfter: Boolean(vEl.compareDocumentPosition(aEl) & Node.DOCUMENT_POSITION_FOLLOWING),
    }), [await h.elementHandle(), await v.elementHandle(), await after.elementHandle()]);
    if (!order.headingBeforeVisual || !order.visualBeforeAfter) failures.push(`${route}: wrong article hook placement for ${visualSelector}`);
  }

  for (const selector of ['.ddc', '.dpe', '.dli']) {
    const delta = await page.locator(selector).evaluate((el) => el.scrollWidth - el.clientWidth);
    if (delta > 2) failures.push(`${route}: ${viewport} ${selector} internal overflow ${delta}px`);
  }
}

async function assertChapter2Canonical(page, route, viewport) {
  const roots = [
    ['.drs[data-demo="dc-02-radiator-scale"]', 'radiator-scale visual'],
    ['.dce[data-demo="dc-02-heat"]', 'vacuum heat visual'],
    ['.dso[data-demo="dc-02-solar"]', 'orbital-solar visual'],
    ['.dev[data-demo="dc-02-links"]', 'link-window visual'],
    ['.drm[data-demo="dc-02-radiation"]', 'radiation-maintenance visual'],
  ];
  for (const [selector, label] of roots) {
    if (await page.locator(selector).count() !== 1) failures.push(`${route}: missing canonical ${label}`);
  }
  if (await page.locator('.dcv[data-demo^="dc-02-"]').count()) failures.push(`${route}: legacy Chapter 2 redesign remains`);

  const structural = [
    ['.drs svg.viz-radiator-scale', 1, 'radiator-scale SVG'],
    ['.drs .radiator', 3, 'radiator scale stages'],
    ['.drs .node', 2, 'radiator constraint nodes'],
    ['.drs .read span', 3, 'radiator teaching notes'],
    ['.dce svg.viz-thermal-section', 1, 'thermal-section SVG'],
    ['.dce .chip', 2, 'Earth/orbit chips'],
    ['.dce .node', 1, 'thermal scaling note'],
    ['.dce .read span', 3, 'thermal teaching notes'],
    ['.dso svg.viz-sun-orbit', 1, 'orbital-solar SVG'],
    ['.dso .node', 3, 'orbital-solar evidence nodes'],
    ['.dso .read span', 3, 'orbital-solar teaching notes'],
    ['.dev svg.viz-downlink-funnel', 1, 'downlink-funnel SVG'],
    ['.dev .funnel', 2, 'downlink funnel stages'],
    ['.dev .node', 4, 'link evidence nodes'],
    ['.dev .sat', 4, 'laser-mesh nodes'],
    ['.dev .read span', 3, 'link teaching notes'],
    ['.drm svg.viz-mission-failure', 1, 'mission-failure SVG'],
    ['.drm .rackframe', 4, 'mission lifecycle rack states'],
    ['.drm .node', 2, 'mission evidence nodes'],
    ['.drm .read span', 3, 'mission teaching notes'],
  ];
  for (const [selector, expected, label] of structural) {
    const count = await page.locator(selector).count();
    if (count !== expected) failures.push(`${route}: ${label} expected ${expected}, found ${count}`);
  }

  const body = await page.locator('body').innerText();
  const anchors = [
    '2 MW can require ≈ 3,950 m² of radiator',
    'Vacuum does not provide free cooling: it removes convection',
    'Dawn–dusk orbit: 95–99% solar availability',
    'laser mesh: 100 Gbps and vacuum ~35% faster than fibre',
    '60–190 ms',
    'Hardware: 5–7 years',
    'Starcloud did demonstrate in November 2025',
    'between 120 and 600 seconds per orbit',
    'What is the real advantage of space for data centers?',
    'Base sources',
  ];
  for (const x of anchors) if (!body.includes(x)) failures.push(`${route}: missing canonical Chapter 2 evidence ${JSON.stringify(x)}`);
  for (const x of ['The four equations behind orbital feasibility', 'The orbital-energy thesis therefore depends on three numbers together', 'Downlink is a separate constraint']) {
    if (body.includes(x)) failures.push(`${route}: English-only Chapter 2 framing remains ${JSON.stringify(x)}`);
  }

  const refs = page.locator('h2', { hasText:'5. References' });
  if (await refs.count() !== 1) failures.push(`${route}: missing canonical Chapter 2 references section`);
  const rows = page.locator('table tbody tr');
  if (await rows.count() !== 10) failures.push(`${route}: expected 10 canonical Chapter 2 reference rows, found ${await rows.count()}`);
  const refText = (await page.locator('table').last().textContent()) || '';
  if (!refText.includes('720× improvement in SEFI immunity')) failures.push(`${route}: canonical Radshield reference evidence missing from collapsed reference table`);

  const orderedHooks = [
    ['h3', 'The real scale of radiators', '.drs[data-demo="dc-02-radiator-scale"]', 'h3', 'Why in-orbit validation is still limited'],
    ['h3', 'Why in-orbit validation is still limited', '.dce[data-demo="dc-02-heat"]', 'h2', '2. Solar energy in orbit'],
    ['h2', '2. Solar energy in orbit', '.dso[data-demo="dc-02-solar"]', 'p', 'Outside the atmosphere'],
    ['h2', '3. Connectivity: link windows and bandwidth', '.dev[data-demo="dc-02-links"]', 'h2', '4. Orbital degradation and maintenance'],
    ['h2', '4. Orbital degradation and maintenance', '.drm[data-demo="dc-02-radiation"]', 'p', 'All of these requirements have direct design consequences'],
  ];
  for (const [beforeSelector, beforeText, visualSelector, afterSelector, afterText] of orderedHooks) {
    const before = page.locator(beforeSelector, { hasText:beforeText }).first();
    const visual = page.locator(visualSelector).first();
    const after = page.locator(afterSelector, { hasText:afterText }).first();
    if (!(await before.count()) || !(await visual.count()) || !(await after.count())) {
      failures.push(`${route}: cannot resolve canonical Chapter 2 hook order for ${visualSelector}`);
      continue;
    }
    const order = await page.evaluate(([bEl, vEl, aEl]) => ({
      beforeVisual: Boolean(bEl.compareDocumentPosition(vEl) & Node.DOCUMENT_POSITION_FOLLOWING),
      visualBeforeAfter: Boolean(vEl.compareDocumentPosition(aEl) & Node.DOCUMENT_POSITION_FOLLOWING),
    }), [await before.elementHandle(), await visual.elementHandle(), await after.elementHandle()]);
    if (!order.beforeVisual || !order.visualBeforeAfter) failures.push(`${route}: wrong article hook placement for ${visualSelector}`);
  }

  for (const selector of ['.drs', '.dce', '.dso', '.dev', '.drm']) {
    const loc = page.locator(selector);
    if (await loc.count() !== 1) continue;
    const delta = await loc.evaluate((el) => el.scrollWidth - el.clientWidth);
    if (delta > 2) failures.push(`${route}: ${viewport} ${selector} internal overflow ${delta}px`);
  }
}

try {
  for (const c of chapters) {
    for (const v of [{ name:'desktop', width:1440, height:1000 }, { name:'mobile', width:390, height:844 }]) {
      const page = await browser.newPage({ viewport: { width:v.width, height:v.height } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      const r = await page.goto(`${base}${c.route}`, { waitUntil:'networkidle' });
      if (!r?.ok()) failures.push(`${c.route}: HTTP ${r?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText();
      if (!body.includes(c.title)) failures.push(`${c.route}: missing English title`);
      for (const x of c.concepts) if (!body.toLowerCase().includes(x.toLowerCase())) failures.push(`${c.route}: missing core concept ${x}`);
      for (const x of forbidden) if (body.includes(x)) failures.push(`${c.route}: Spanish leakage ${JSON.stringify(x)}`);

      const demos = await page.locator('[data-demo^="dc-"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-demo')));
      if (demos.length !== c.demos) failures.push(`${c.route}: expected ${c.demos} visuals, found ${demos.length}`);
      if (new Set(demos).size !== demos.length) failures.push(`${c.route}: duplicate visual ids`);
      for (const d of demos) if (!d?.startsWith(c.prefix)) failures.push(`${c.route}: unexpected visual id ${d}`);
      if (v.name === 'desktop') total += demos.length;

      if (c.slug === '01-por-que-ahora') {
        await assertChapter1Canonical(page, c.route, v.name);
      } else if (c.slug === '02-energia-calor-conectividad') {
        await assertChapter2Canonical(page, c.route, v.name);
      } else {
        const details = page.locator('[data-demo^="dc-"] details');
        if (await details.count() === 0) failures.push(`${c.route}: no interactive disclosure`);
        else {
          const d = details.first();
          const before = await d.getAttribute('open');
          await d.locator('summary').click();
          const after = await d.getAttribute('open');
          if (before === after) failures.push(`${c.route}: disclosure did not toggle`);
        }
      }

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) failures.push(`${c.route}: expected one native-English video, found ${videoCount}`);
      else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const root = '/en/series/datacenters-espacio/';
        if (sourceUrl.pathname !== `${root}${c.slug}.mp4`) failures.push(`${c.route}: video escaped native English media: ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${c.slug}.jpg`) failures.push(`${c.route}: poster escaped native English media: ${posterUrl.pathname}`);
      }
      if (await page.locator('audio').count()) failures.push(`${c.route}: unexpected inherited Spanish audio`);

      const [client, scroll] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scroll > client + 2) failures.push(`${c.route}: ${v.name} overflow ${scroll - client}px`);
      for (const e of errors) failures.push(`${c.route}: ${e}`);
      if (v.name === 'desktop') await page.screenshot({ path:path.join(outDir, c.shot), fullPage:true, animations:'disabled' });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (total !== 21) failures.push(`Data Centers in Space: expected 21 native English visuals, found ${total}`);
if (failures.length) {
  for (const f of [...new Set(failures)]) console.error(f);
  process.exit(1);
}
console.log('Complete English Data Centers QA passed: Chapters 1–4, 21 native visuals, canonical Chapters 1–2 article/visual fidelity, exact native-English video/poster pairs, interactions, desktop/mobile clean.');
