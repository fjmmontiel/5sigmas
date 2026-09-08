#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const esArticlePath = path.resolve('docs/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz.md');
const enArticlePath = path.resolve('locales/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz.md');
const visuals = [
  {
    id: 'map',
    source: 'docs/snippets/articulos-tecnicos/voice-arch-map.html',
    mirror: 'locales/en/snippets/articulos-tecnicos/voice-arch-map.html',
    translation: 'locales/en/snippets/articulos-tecnicos/voice-arch-map.i18n.json',
    include: '{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}',
  },
  {
    id: 'duplex',
    source: 'docs/snippets/articulos-tecnicos/voice-arch-duplex.html',
    mirror: 'locales/en/snippets/articulos-tecnicos/voice-arch-duplex.html',
    translation: 'locales/en/snippets/articulos-tecnicos/voice-arch-duplex.i18n.json',
    include: '{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}',
  },
  {
    id: 'decision',
    source: 'docs/snippets/articulos-tecnicos/voice-arch-decision.html',
    mirror: 'locales/en/snippets/articulos-tecnicos/voice-arch-decision.html',
    translation: 'locales/en/snippets/articulos-tecnicos/voice-arch-decision.i18n.json',
    include: '{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}',
  },
];

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}
function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

const [esArticle, enArticle, mkdocsEs, mkdocsEn] = await Promise.all([
  fs.readFile(esArticlePath, 'utf8'),
  fs.readFile(enArticlePath, 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
]);
const sourceById = new Map();

for (const visual of visuals) {
  const [source, mirror, translationRaw] = await Promise.all([
    fs.readFile(path.resolve(visual.source), 'utf8'),
    fs.readFile(path.resolve(visual.mirror), 'utf8'),
    fs.readFile(path.resolve(visual.translation), 'utf8'),
  ]);
  sourceById.set(visual.id, source);
  const translation = JSON.parse(translationRaw);
  const canonicalSource = visual.source.replace(/^docs\//, '');
  check(esArticle.includes(visual.include), `Spanish article: missing ${visual.id} visual include`);
  check(enArticle.includes(visual.include), `English article: missing ${visual.id} visual include`);
  check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', `${visual.id}: English snippet must use canonical mirror marker`);
  check(translation.source === canonicalSource, `${visual.id}: wrong canonical source ${JSON.stringify(translation.source)}`);
  check(translation.source_blob_sha === gitBlobSha(source), `${visual.id}: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
}

check(esArticle.includes('Speech-to-speech no implica full-duplex.'), 'Spanish article: missing explicit S2S/full-duplex distinction');
check(enArticle.includes('Speech-to-speech does not imply full-duplex.'), 'English article: missing explicit S2S/full-duplex distinction');
check(esArticle.includes('Half-cascade* no es un estándar formal'), 'Spanish article: half-cascade terminology is no longer explicitly scoped');
check(enArticle.includes('Half-cascade* is not a formal standard'), 'English article: half-cascade terminology is no longer explicitly scoped');
check(esArticle.includes('LiveKit, [Pipeline types]'), 'Spanish article: missing primary LiveKit pipeline reference');
check(enArticle.includes('LiveKit, [Pipeline types]'), 'English article: missing primary LiveKit pipeline reference');
check(esArticle.includes('LiveKit, [Sequential pipeline architecture for voice agents]'), 'Spanish article: missing primary streaming-pipeline reference');
check(enArticle.includes('LiveKit, [Sequential pipeline architecture for voice agents]'), 'English article: missing primary streaming-pipeline reference');
check(esArticle.includes('camino crítico'), 'Spanish article: latency section no longer teaches critical-path reasoning');
check(enArticle.includes('critical path'), 'English article: latency section no longer teaches critical-path reasoning');
check(!esArticle.includes('T_first_audio ≈'), 'Spanish article: legacy naive additive first-audio formula remains');
check(!enArticle.includes('T_first_audio ≈'), 'English article: legacy naive additive first-audio formula remains');
check(esArticle.includes('`gpt-realtime-2.1`'), 'Spanish article: current OpenAI realtime example is missing');
check(enArticle.includes('`gpt-realtime-2.1`'), 'English article: current OpenAI realtime example is missing');
check(esArticle.includes('[^openai-realtime-deprecation]:'), 'Spanish article: missing OpenAI realtime deprecation reference');
check(enArticle.includes('[^openai-realtime-deprecation]:'), 'English article: missing OpenAI realtime deprecation reference');
check(!esArticle.includes('`gpt-realtime`, por ejemplo'), 'Spanish article: deprecated gpt-realtime remains as a current example');
check(!enArticle.includes('`gpt-realtime`, for example'), 'English article: deprecated gpt-realtime remains as a current example');

check(esArticle.includes('## Segunda decisión: cuánto runtime quieres poseer'), 'Spanish article: missing runtime ownership decision section');
check(enArticle.includes('## A second decision: how much runtime do you want to own?'), 'English article: missing runtime ownership decision section');
check(esArticle.includes('| Criterio | LiveKit Agents | Pipecat | Python vanilla/thin |'), 'Spanish article: missing compact LiveKit/Pipecat/vanilla runtime matrix');
check(enArticle.includes('| Criterion | LiveKit Agents | Pipecat | Thin / vanilla Python |'), 'English article: missing compact LiveKit/Pipecat/vanilla runtime matrix');
check(esArticle.includes('vanilla significa que no delegas la orquestación en un agent framework de este tipo; no significa que implementes WebRTC o SIP desde cero'), 'Spanish article: thin/vanilla is conflated with owning the WebRTC/SIP media stack');
check(enArticle.includes('vanilla means you are not delegating orchestration to this kind of agent framework; it does not mean implementing WebRTC or SIP from scratch'), 'English article: thin/vanilla is conflated with owning the WebRTC/SIP media stack');
check(esArticle.includes('Twilio Media Streams, por ejemplo, entrega audio crudo de la llamada a tu servidor'), 'Spanish article: missing carrier-managed PSTN Media Streams case');
check(enArticle.includes('Twilio Media Streams, for example, sends raw call audio to your server'), 'English article: missing carrier-managed PSTN Media Streams case');
check(esArticle.includes('**Recovery no equivale a continuidad de estado.**'), 'Spanish article: missing recovery-vs-state-continuity distinction');
check(enArticle.includes('**Recovery is not the same as state continuity.**'), 'English article: missing recovery-vs-state-continuity distinction');
check(esArticle.includes('**La seguridad también se reparte por capas.**'), 'Spanish article: missing layered security ownership');
check(enArticle.includes('**Security is layered as well.**'), 'English article: missing layered security ownership');
check(esArticle.includes('**Testing/evals es otra superficie de ownership.**'), 'Spanish article: missing testing/eval ownership comparison');
check(enArticle.includes('**Testing and evals are another ownership surface.**'), 'English article: missing testing/eval ownership comparison');
check(esArticle.includes('developer velocity vs control'), 'Spanish article: missing developer-velocity/control trade-off');
check(enArticle.includes('developer velocity vs control'), 'English article: missing developer-velocity/control trade-off');
check(esArticle.includes('**1. Voice assistant en browser o móvil.**'), 'Spanish article: missing browser/mobile decision case');
check(enArticle.includes('**1. Browser or mobile voice assistant.**'), 'English article: missing browser/mobile decision case');
check(esArticle.includes('**2. Agente PSTN.**'), 'Spanish article: missing PSTN decision case');
check(enArticle.includes('**2. PSTN agent.**'), 'English article: missing PSTN decision case');
check(esArticle.includes('**3. Pipeline experimental o custom de bajo nivel.**'), 'Spanish article: missing low-level custom decision case');
check(enArticle.includes('**3. Experimental or low-level custom pipeline.**'), 'English article: missing low-level custom decision case');
check(esArticle.includes('Pipecat puede ejecutar su pipeline sobre `LiveKitTransport`'), 'Spanish article: missing explicit Pipecat/LiveKit hybrid');
check(enArticle.includes('Pipecat can run its pipeline on `LiveKitTransport`'), 'English article: missing explicit Pipecat/LiveKit hybrid');
check(esArticle.includes('Sin un benchmark controlado con el mismo hardware, red, provider, modelo, audio path y carga'), 'Spanish article: missing controlled-overhead benchmark caveat');
check(enArticle.includes('Without a controlled benchmark on the same hardware, network, provider, model, audio path, and load'), 'English article: missing controlled-overhead benchmark caveat');
for (const ref of [
  '[^livekit-agents]:',
  '[^livekit-self-hosting]:',
  '[^livekit-tokens]:',
  '[^livekit-testing]:',
  '[^pipecat-pipeline]:',
  '[^pipecat-transports]:',
  '[^pipecat-turns]:',
  '[^pipecat-tools]:',
  '[^pipecat-metrics]:',
  '[^pipecat-livekit]:',
  '[^pipecat-session-lifecycle]:',
  '[^pipecat-websocket-reconnect]:',
  '[^pipecat-service-events]:',
  '[^pipecat-websocket-auth]:',
  '[^openai-realtime-transport]:',
  '[^openai-webrtc-scale]:',
  '[^twilio-media-streams]:',
  '[^twilio-media-messages]:',
]) {
  check(esArticle.includes(ref), `Spanish article: missing runtime primary reference ${ref}`);
  check(enArticle.includes(ref), `English article: missing runtime primary reference ${ref}`);
}

check(mkdocsEs.includes('- Agentes de voz en tiempo real:\n          - Arquitecturas de voz: series/agentes-voz-tiempo-real/01-arquitecturas-de-voz.md'), 'Spanish nav: realtime voice series chapter 1 is missing from canonical reader navigation');
check(mkdocsEn.includes('- Realtime Voice Agents:\n          - Voice architectures: series/agentes-voz-tiempo-real/01-arquitecturas-de-voz.md'), 'English nav: realtime voice series chapter 1 is missing from canonical reader navigation');

const forbiddenVisualFragments = [
  'Speech-to-speech → ritmo y full-duplex',
  'S2S ↔',
  '<span class="s5v__kicker">Speech-to-speech</span><h3>Escuchar mientras habla.',
];
for (const fragment of forbiddenVisualFragments) {
  for (const [id, source] of sourceById) {
    check(!source.includes(fragment), `${id}: legacy architecture conflation remains in canonical visual source: ${fragment}`);
  }
}

check(sourceById.get('map')?.includes('Audio-native + TTS'), 'map: missing explicit audio-native + TTS architecture label');
check(sourceById.get('map')?.includes('<span class="is-model">S2S</span><i>→</i><span class="is-audio">Audio</span>'), 'map: S2S panel no longer encodes an audio → model → audio modality path');
check(sourceById.get('duplex')?.includes('<span class="s5v__kicker">Full-duplex</span>'), 'duplex: kicker must identify the interaction axis as Full-duplex');
check(sourceById.get('decision')?.includes('Speech-to-speech → continuidad acústica'), 'decision: S2S criterion must describe acoustic continuity rather than full-duplex');

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    locale: 'es',
    route: '/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/',
    anchors: [
      'Arquitecturas de voz: dónde colocas la frontera de texto',
      'Full-duplex es otro eje',
      'Speech-to-speech no implica full-duplex.',
      '¿Dónde colocas la frontera de texto?',
      '¿Qué propiedad quieres proteger?',
      'Escuchar mientras habla.',
      'Segunda decisión: cuánto runtime quieres poseer',
      'Matriz de decisión del runtime',
      'vanilla significa que no delegas la orquestación en un agent framework',
      'Twilio Media Streams, por ejemplo, entrega audio crudo de la llamada a tu servidor',
      'Recovery no equivale a continuidad de estado.',
      'La seguridad también se reparte por capas.',
      'Testing/evals es otra superficie de ownership.',
      'Voice assistant en browser o móvil.',
      'Agente PSTN.',
      'Pipeline experimental o custom de bajo nivel.',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/',
    anchors: [
      'Voice architectures: where the text boundary lives',
      'Full-duplex is a separate axis',
      'Speech-to-speech does not imply full-duplex.',
      'Where do you place the text boundary?',
      'Which property do you want to protect?',
      'Listen while speaking.',
      'A second decision: how much runtime do you want to own?',
      'Runtime decision matrix',
      'vanilla means you are not delegating orchestration to this kind of agent framework',
      'Twilio Media Streams, for example, sends raw call audio to your server',
      'Recovery is not the same as state continuity.',
      'Security is layered as well.',
      'Testing and evals are another ownership surface.',
      'Browser or mobile voice assistant.',
      'PSTN agent.',
      'Experimental or low-level custom pipeline.',
    ],
    forbidden: [
      '¿Dónde colocas la frontera de texto?',
      '¿Qué propiedad quieres proteger?',
      'Escuchar mientras habla.',
      'Usuario',
      'Agente',
      '“ajá”',
    ],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      for (const anchor of testCase.anchors) check(body.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
      for (const token of testCase.forbidden) check(!body.includes(token), `${testCase.route}: ${viewport.name} locale leakage ${JSON.stringify(token)}`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);

      const map = page.locator('.s5v-arch-map');
      const duplex = page.locator('.s5v-duplex');
      const decision = page.locator('.s5v-decision');
      check((await map.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one architecture map`);
      check((await duplex.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one duplex visual`);
      check((await decision.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one decision visual`);

      for (const [name, visual] of [['map', map], ['duplex', duplex], ['decision', decision]]) {
        if (!(await visual.count())) continue;
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 280 && box.height >= 120), `${testCase.route}: ${viewport.name} invalid ${name} geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} ${name} internal overflow ${overflow}px`);
      }

      for (const stepper of [map, decision]) {
        if (!(await stepper.count())) continue;
        for (const step of [1, 2, 3]) {
          const button = stepper.locator(`button[data-s5v-step="${step}"]`);
          check((await button.count()) === 1, `${testCase.route}: ${viewport.name} missing step ${step}`);
          if (await button.count()) {
            await button.click();
            check((await stepper.getAttribute('data-step')) === String(step), `${testCase.route}: ${viewport.name} stepper did not advance to ${step}`);
          }
        }
      }

      check((await duplex.locator('.s5v-duplex__timeline').count()) === 1, `${testCase.route}: ${viewport.name} missing duplex timeline`);
      check((await page.locator('.s5-reader-shell').count()) === 1, `${testCase.route}: ${viewport.name} missing canonical reader navigation`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      for (const [name, visual] of [['map', map], ['duplex', duplex], ['decision', decision]]) {
        if (!(await visual.count())) continue;
        await visual.screenshot({
          path: path.join(outDir, `voice-architecture-ch1-${testCase.locale}-${viewport.name}-${name}.png`),
          animations: 'disabled',
        });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(outDir, `voice-architecture-ch1-${testCase.locale}-${viewport.name}-page.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Voice architecture chapter 1 QA failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice architecture chapter 1 QA passed: ES/EN semantics, canonical mirrors, architecture-vs-duplex distinction, current-model freshness, runtime-ownership and media-endpoint ownership decisions including recovery/security/testing ownership, desktop/mobile geometry, interaction states, reader navigation, language integrity and runtime behavior are valid.');