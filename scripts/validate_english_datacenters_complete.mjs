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

const contracts = {
  '01-por-que-ahora': {
    roots:[['.ddc[data-demo="dc-01-bottlenecks"]','bottleneck map'],['.dpe[data-demo="dc-01-why-space"]','orbital levers'],['.dli[data-demo="dc-01-launch-cost"]','launch curve']],
    counts:[['.ddc svg.viz-pressure-map',1],['.ddc .node',5],['.ddc .read span',3],['.dpe svg.viz-three-levers',1],['.dpe .pill',3],['.dpe .read span',3],['.dli svg.viz-launch-curve',1],['.dli .node',3],['.dli .read span',3]],
    evidence:['4–10 years in key markets','Power grid and water are the most severe bottlenecks','Space changes three levers; it does not make everything viable','Mass: every kilogram launched shapes the design','Falling launch cost opens comparison, not automatic viability','Future: depends on total operating cost','560 billion litres per year','1.2 trillion litres in 2030','95–99%','$0.002 per kWh','100 GW of AI compute','What is the FOOL paper and what does it propose for the satellite downlink bottleneck?','Base sources'],
    reject:['What to carry into the rest of the series','That is a genuine form of data gravity','The correct comparison'],
    refs:['5. References',10],
    hooks:[['h2','2. Terrestrial bottlenecks','.ddc[data-demo="dc-01-bottlenecks"]','h3','Power grid'],['h2','3. Why space enters the discussion','.dpe[data-demo="dc-01-why-space"]','p','What is real as a potential advantage'],['h2','4. The launch-cost inflection point','.dli[data-demo="dc-01-launch-cost"]','p','On 4 February 2026']],
    overflow:['.ddc','.dpe','.dli'],
  },
  '02-energia-calor-conectividad': {
    roots:[['.drs[data-demo="dc-02-radiator-scale"]','radiator scale'],['.dce[data-demo="dc-02-heat"]','vacuum heat'],['.dso[data-demo="dc-02-solar"]','orbital solar'],['.dev[data-demo="dc-02-links"]','link window'],['.drm[data-demo="dc-02-radiation"]','radiation and maintenance']],
    counts:[['.drs svg.viz-radiator-scale',1],['.drs .radiator',3],['.drs .node',2],['.drs .read span',3],['.dce svg.viz-thermal-section',1],['.dce .chip',2],['.dce .node',1],['.dce .read span',3],['.dso svg.viz-sun-orbit',1],['.dso .node',3],['.dso .read span',3],['.dev svg.viz-downlink-funnel',1],['.dev .funnel',2],['.dev .node',4],['.dev .sat',4],['.dev .read span',3],['.drm svg.viz-mission-failure',1],['.drm .rackframe',4],['.drm .node',2],['.drm .read span',3]],
    evidence:['2 MW can require ≈ 3,950 m² of radiator','Vacuum does not provide free cooling: it removes convection','Dawn–dusk orbit: 95–99% solar availability','laser mesh: 100 Gbps and vacuum ~35% faster than fibre','60–190 ms','Hardware: 5–7 years','Starcloud did demonstrate in November 2025','between 120 and 600 seconds per orbit','What is the real advantage of space for data centers?','Base sources','720× improvement in SEFI immunity'],
    reject:['The four equations behind orbital feasibility','The orbital-energy thesis therefore depends on three numbers together','Downlink is a separate constraint'],
    refs:['5. References',10],
    hooks:[['h3','The real scale of radiators','.drs[data-demo="dc-02-radiator-scale"]','h3','Why in-orbit validation is still limited'],['h3','Why in-orbit validation is still limited','.dce[data-demo="dc-02-heat"]','h2','2. Solar energy in orbit'],['h2','2. Solar energy in orbit','.dso[data-demo="dc-02-solar"]','p','Outside the atmosphere'],['h2','3. Connectivity: link windows and bandwidth','.dev[data-demo="dc-02-links"]','h2','4. Orbital degradation and maintenance'],['h2','4. Orbital degradation and maintenance','.drm[data-demo="dc-02-radiation"]','p','All of these requirements have direct design consequences']],
    overflow:['.drs','.dce','.dso','.dev','.drm'],
  },
  '03-que-es-datacenter-espacio': {
    roots:[['.dco[data-demo="dc-03-maturity"]','maturity'],['.dpn[data-demo="dc-03-data-gravity"]','data gravity'],['.dpo[data-demo="dc-03-projects"]','project evidence'],['.dat[data-demo="dc-03-megaproject"]','tether topology']],
    counts:[['.dco svg.viz-viability-stair',1],['.dco .node',3],['.dco .read span',3],['.dpn svg.viz-data-compression',1],['.dpn .processor',1],['.dpn .node',3],['.dpn .funnel',2],['.dpn .read span',3],['.dpo svg.viz-evidence-board',1],['.dpo .evidence',4],['.dpo .read span',3],['.dat svg.viz-tether-topology',1],['.dat .wing',2],['.dat .processor',1],['.dat .radiator',1],['.dat .node',2],['.dat .read span',3]],
    evidence:['Today: filter data born in orbit','Medium term: extreme archive and specialized nodes','Distant: broad general-purpose orbital AI','100–500 W, no training','orders of magnitude less data','< 10 minutes','122 TB and 2.5 Gbps optical link','12 satellites, 5 PF, 100 Gbps laser','an orbital data center is not a box: it is an extended structure','744 TOPS','30 TB of storage','up to 720 times','up to one million satellites','100 GW of AI compute','4 km × 4 km','What is the “Digital Flag State” debate and why does it matter for data in space?','Base sources'],
    reject:['This chapter maps the spectrum hidden behind the phrase','General-purpose orbital cloud is different','The correct analogy is therefore','Megaprojects: hardware reality vs roadmap','Next chapter'],
    spanish:['madurez de casos','Procesar donde nace','mapa de evidencia','topologia tether'],
    refs:['7. References',17],
    faqs:['Which projects already have real computing hardware operating in orbit in 2026?','What is the difference between onboard processing and general-purpose computing in orbit?','For which use cases does orbital computing make economic sense today?','What is the “Digital Flag State” debate and why does it matter for data in space?','When could orbital data centers compete economically with terrestrial ones for general-purpose workloads?'],
    hooks:[['h1','Chapter 3 — What is “a data center in space”?','.dco[data-demo="dc-03-maturity"]','h2','1. What it means to process data in orbit'],['h3','Processing observation data','.dpn[data-demo="dc-03-data-gravity"]','p','A concrete example'],['h2','2. Projects that already have hardware in orbit','.dpo[data-demo="dc-03-projects"]','p','Of these, the most significant case'],['h2','5. Megaprojects: visions measured in decades','.dat[data-demo="dc-03-megaproject"]','p','SpaceX / Orbital Data Center System']],
    overflow:['.dco','.dpn','.dpo','.dat'],
  },
  '04-huella-real-datacenter': {
    roots:[['.dac[data-demo="dc-04-water-scale"]','water scale'],['.dwr[data-demo="dc-04-wue"]','WUE trade-off'],['.dai[data-demo="dc-04-indirect-water"]','indirect water'],['.dsc[data-demo="dc-04-sector-power"]','sector power'],['.dpt[data-demo="dc-04-pue"]','PUE overhead'],['.ded[data-demo="dc-04-rack-density"]','rack density'],['.dmc[data-demo="dc-04-minerals"]','mineral chain'],['.dcc[data-demo="dc-04-cobalt"]','cobalt chain'],['.dhr[data-demo="dc-04-gpu-recovery"]','GPU lifecycle']],
    counts:[['.dac svg.viz-dual-water-scale',1],['.dac .node',2],['.dac .read span',3],['.dwr svg.viz-wue-tradeoff',1],['.dwr .node',1],['.dwr .read span',3],['.dai svg.viz-water-iceberg',1],['.dai .node',2],['.dai .read span',3],['.dsc svg.viz-sector-growth',1],['.dsc .read span',3],['.dpt svg.viz-pue-overhead',1],['.dpt .stack',3],['.dpt .read span',3],['.ded svg.viz-density-building',1],['.ded .rack',2],['.ded .node',2],['.ded .read span',3],['.dmc svg.viz-rack-hotspot',1],['.dmc .node',4],['.dmc .read span',3],['.dcc svg.viz-cobalt-chain',1],['.dcc .node',3],['.dcc .read span',3],['.dhr svg.viz-gpu-lifecycle',1],['.dhr .node',4],['.dhr .read span',3]],
    evidence:['US: data centers 449M gal/day versus golf courses 2,000M','Evaporative: 1.5–2.5 L/IT kWh','A 100 MW data center is around 2 million litres per day in total','Global: 415 TWh in 2024 toward 945 TWh in 2030','PUE 2.0: half is non-IT','Traditional rack: 5–15 kW','Cobalt: concentrated mining and refining','74% of production in DRC, 67% of refining in China','Typical cycle: 3–5 years before refresh','91 percent concentrated in China','250,000 people linked to artisanal mining','30,000 racks','2,500 metric tonnes','What happens to GPUs and data-center hardware when they are retired?','Base sources'],
    reject:['PUE is not total efficiency','AI changes rack density','What space solves—and what it inherits','A lifecycle framework for any compute proposal','Series complete'],
    spanish:['doble escala hidrica','La refrigeración cambia','iceberg hidrico','crecimiento agregado','energia auxiliar PUE','edificio termico','cadena mineral','cadena de cobalto','ciclo de GPU'],
    refs:['7. References',11],
    faqs:['Do data centers really consume a lot of water compared with other industries?','What is WUE and how much does it vary by cooling technology?','How much can water consumption change for the same compute workload depending on cooling?','Which critical minerals are found in an AI GPU and where do they come from?','What happens to GPUs and data-center hardware when they are retired?'],
    hooks:[['h2','1. The comparison that calibrates the conversation','.dac[data-demo="dc-04-water-scale"]','p','This comparison is not meant'],['p','Microsoft\'s Iowa design','.dwr[data-demo="dc-04-wue"]','p','AI has added a new dimension'],['p','If a facility delivers 1 MWh','.dai[data-demo="dc-04-indirect-water"]','p','The sector trend is toward'],['h2','3. Energy: the AI premium and what it implies','.dsc[data-demo="dc-04-sector-power"]','p','The metric that measures'],['p','The metric that measures the energy efficiency','.dpt[data-demo="dc-04-pue"]','p','What AI has changed'],['p','Nvidia\'s GB200 NVL72 rack','.ded[data-demo="dc-04-rack-density"]','p','This density increase'],['p','91 percent concentrated in China','.dmc[data-demo="dc-04-minerals"]','p','Cobalt is the most documented'],['p','Seventy-two percent of residents','.dcc[data-demo="dc-04-cobalt"]','p','The technology industry has launched initiatives'],['p','Microsoft reported in 2024','.dhr[data-demo="dc-04-gpu-recovery"]','p','At the scale of tens or hundreds of thousands']],
    overflow:['.dac','.dwr','.dai','.dsc','.dpt','.ded','.dmc','.dcc','.dhr'],
  },
};

const globalForbidden = ['Capítulo ', 'Preguntas frecuentes', 'Prerrequisitos', 'Siguiente capítulo', 'Fuentes base'];
const failures = [];
const browser = await chromium.launch({ headless:true });
let total = 0;

async function count(page, route, selector, expected) {
  const n = await page.locator(selector).count();
  if (n !== expected) failures.push(`${route}: ${selector} expected ${expected}, found ${n}`);
}

async function hooks(page, route, items) {
  for (const [bs, bt, vs, as, at] of items || []) {
    const before = page.locator(bs, { hasText:bt }).first();
    const visual = page.locator(vs).first();
    const after = page.locator(as, { hasText:at }).first();
    if (!(await before.count()) || !(await visual.count()) || !(await after.count())) {
      failures.push(`${route}: cannot resolve canonical hook for ${vs}`);
      continue;
    }
    const [b,v,a] = await Promise.all([before.elementHandle(),visual.elementHandle(),after.elementHandle()]);
    const order = await page.evaluate(([be,ve,ae]) => ({
      bv:Boolean(be.compareDocumentPosition(ve) & Node.DOCUMENT_POSITION_FOLLOWING),
      va:Boolean(ve.compareDocumentPosition(ae) & Node.DOCUMENT_POSITION_FOLLOWING),
    }), [b,v,a]);
    if (!order.bv || !order.va) failures.push(`${route}: wrong article hook placement for ${vs}`);
  }
}

async function validateContract(page, c, viewport) {
  const k = contracts[c.slug];
  const body = await page.locator('body').innerText();
  for (const [selector,label] of k.roots) if (await page.locator(selector).count() !== 1) failures.push(`${c.route}: missing canonical ${label}`);
  if (await page.locator(`.dcv[data-demo^="${c.prefix}"]`).count()) failures.push(`${c.route}: legacy English redesign remains`);
  for (const [selector,n] of k.counts) await count(page,c.route,selector,n);
  for (const x of k.evidence) if (!body.includes(x)) failures.push(`${c.route}: missing canonical evidence ${JSON.stringify(x)}`);
  for (const x of k.reject || []) if (body.includes(x)) failures.push(`${c.route}: English-only framing remains ${JSON.stringify(x)}`);
  for (const x of k.spanish || []) if (body.includes(x)) failures.push(`${c.route}: Spanish visual leakage ${JSON.stringify(x)}`);
  if (k.refs) {
    if (await page.locator('h2', { hasText:k.refs[0] }).count() !== 1) failures.push(`${c.route}: missing canonical references section`);
    const n = await page.locator('table').last().locator('tbody tr').count();
    if (n !== k.refs[1]) failures.push(`${c.route}: expected ${k.refs[1]} canonical reference rows, found ${n}`);
  }
  for (const q of k.faqs || []) if (!body.includes(q)) failures.push(`${c.route}: missing canonical FAQ ${JSON.stringify(q)}`);
  await hooks(page,c.route,k.hooks);
  for (const selector of k.overflow) {
    const loc = page.locator(selector);
    if (await loc.count() !== 1) continue;
    const delta = await loc.evaluate(el => el.scrollWidth - el.clientWidth);
    if (delta > 2) failures.push(`${c.route}: ${viewport} ${selector} internal overflow ${delta}px`);
  }
}

try {
  for (const c of chapters) {
    for (const v of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
      const page = await browser.newPage({ viewport:{width:v.width,height:v.height} });
      const errors = [];
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
      const r = await page.goto(`${base}${c.route}`, { waitUntil:'networkidle' });
      if (!r?.ok()) failures.push(`${c.route}: HTTP ${r?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText();
      if (!body.includes(c.title)) failures.push(`${c.route}: missing English title`);
      for (const x of c.concepts) if (!body.toLowerCase().includes(x.toLowerCase())) failures.push(`${c.route}: missing core concept ${x}`);
      for (const x of globalForbidden) if (body.includes(x)) failures.push(`${c.route}: Spanish leakage ${JSON.stringify(x)}`);

      const demos = await page.locator('[data-demo^="dc-"]').evaluateAll(ns => ns.map(n => n.getAttribute('data-demo')));
      if (demos.length !== c.demos) failures.push(`${c.route}: expected ${c.demos} visuals, found ${demos.length}`);
      if (new Set(demos).size !== demos.length) failures.push(`${c.route}: duplicate visual ids`);
      for (const d of demos) if (!d?.startsWith(c.prefix)) failures.push(`${c.route}: unexpected visual id ${d}`);
      if (v.name === 'desktop') total += demos.length;

      await validateContract(page,c,v.name);

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

      const [client,scroll] = await page.evaluate(() => [document.documentElement.clientWidth,document.documentElement.scrollWidth]);
      if (scroll > client + 2) failures.push(`${c.route}: ${v.name} overflow ${scroll-client}px`);
      for (const e of errors) failures.push(`${c.route}: ${e}`);
      if (v.name === 'desktop') await page.screenshot({ path:path.join(outDir,c.shot), fullPage:true, animations:'disabled' });
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
console.log('Complete English Data Centers QA passed: Chapters 1–4, 21 native visuals, canonical article/visual fidelity, native-English media, desktop/mobile clean.');
