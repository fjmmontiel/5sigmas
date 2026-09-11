#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const esPath = path.resolve('docs/series/agentes-voz-tiempo-real/03-presupuesto-latencia.md');
const enPath = path.resolve('locales/en/series/agentes-voz-tiempo-real/03-presupuesto-latencia.md');
const visualPath = path.resolve('docs/snippets/articulos-tecnicos/voice-latency-critical-path.html');
const mirrorPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-latency-critical-path.html');
const i18nPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-latency-critical-path.i18n.json');

const [es, en, visual, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(esPath, 'utf8'),
  fs.readFile(enPath, 'utf8'),
  fs.readFile(visualPath, 'utf8'),
  fs.readFile(mirrorPath, 'utf8'),
  fs.readFile(i18nPath, 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const blobSha = (text) => {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};

const route = 'series/agentes-voz-tiempo-real/03-presupuesto-latencia.md';
const include = '{{ include_html("snippets/articulos-tecnicos/voice-latency-critical-path.html") }}';

check(es.includes(include), 'ES: missing latency critical-path visual include');
check(en.includes(include), 'EN: missing latency critical-path visual include');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN visual mirror: canonical marker missing');
check(i18n.source === 'snippets/articulos-tecnicos/voice-latency-critical-path.html', 'EN visual i18n: wrong source path');
check(i18n.source_blob_sha === blobSha(visual), `EN visual i18n: source_blob_sha drift; expected ${blobSha(visual)}, got ${i18n.source_blob_sha}`);

check(visual.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: GOLDEN_VISUAL_CONTRACT missing');
for (const contractKey of ['learning_objective:', 'mechanism:', 'visual_variables:', 'why_visual:']) {
  check(visual.includes(contractKey), `Visual: contract field ${contractKey} missing`);
}
check(visual.includes('x-position=time'), 'Visual: time-position encoding not declared');
check(visual.includes('overlap=concurrency'), 'Visual: concurrency encoding not declared');
check(visual.includes('vertical marker=observable boundary'), 'Visual: observable-boundary encoding not declared');
check(visual.includes('segment length=activity duration'), 'Visual: stage-duration encoding not declared');
check(visual.includes('shaded zone=work completed before speech_stop'), 'Visual: pre-speech-stop work encoding not declared');
check(visual.includes('connected critical ribbon=blocking path to first_playout'), 'Visual: critical-path encoding not declared');

for (const forbidden of ['s5v-arch-map__pipe', 'data-s5v-stepper', 's5v__steps--tabs']) {
  check(!visual.includes(forbidden), `Visual: legacy/cosmetic primitive ${forbidden} must not return`);
}
for (const segment of ['user-speech', 'stt-pre', 'stt-residual', 'eou-wait', 'llm-stream', 'tts-stream', 'media-to-playout', 'playout']) {
  check(visual.includes(`data-latency-segment="${segment}"`), `Visual: missing segment ${segment}`);
}
for (const marker of ['speech-stop', 'turn-commit', 'first-token', 'first-audio', 'first-playout']) {
  check(visual.includes(`data-latency-marker="${marker}"`), `Visual: missing timing marker ${marker}`);
}
check(visual.includes('data-latency-zone="pre-speech-stop"'), 'Visual: pre-speech-stop zone missing');
check(visual.includes('data-latency-window="user-wait"'), 'Visual: user-wait window missing');
check(visual.includes('data-latency-critical-path="true"'), 'Visual: critical-path ribbon missing');
check(visual.includes('min-width:900px') && visual.includes('min-width:860px'), 'Visual: desktop/mobile timeline geometry contract missing');
check(visual.includes('overflow-x:auto') && visual.includes('tabindex="0"'), 'Visual: mobile horizontal reachability contract missing');
check(visual.includes('@media (prefers-reduced-motion:reduce)'), 'Visual: reduced-motion static contract missing');
check(visual.includes('no un benchmark ni una escala de milisegundos'), 'Visual: illustrative/not-to-scale caveat missing');
check(visual.includes('sumar sus duraciones completas atribuiría a la espera trabajo que ocurrió en paralelo o fuera de la ventana'), 'Visual: double-counting mechanism missing');
check(visual.includes('<code>speech_stop</code>: acústica, borde de captura o VAD servidor'), 'Visual: speech-stop measurement-boundary caveat missing');
check(visual.includes('/herramientas/latencia-agente-voz/'), 'Visual: canonical latency explorer link missing');
check(i18n.replacements?.['/herramientas/latencia-agente-voz/'] === '/en/tools/voice-latency-budget/', 'EN visual i18n: localized latency explorer route missing');

check(mkdocsEs.includes(`- Presupuesto de latencia: ${route}`), 'ES nav: chapter 3 route missing');
check(mkdocsEn.includes(`- Latency budget: ${route}`), 'EN nav: chapter 3 route missing');
check(manifest.includes(`  - ${route}`), 'EN manifest: chapter 3 published route missing');
check(manifest.includes('  - snippets/articulos-tecnicos/voice-latency-critical-path.html'), 'EN manifest: chapter 3 visual required_snippets entry missing');

const requiredPrimaryUrls = [
  'https://docs.livekit.io/deploy/observability/data/',
  'https://docs.livekit.io/reference/python/livekit/agents/metrics/index.html',
  'https://docs.pipecat.ai/pipecat/fundamentals/metrics',
  'https://www.w3.org/TR/mediacapture-streams/',
  'https://www.w3.org/TR/webrtc-stats/',
  'https://www.w3.org/TR/webaudio-1.1/',
  'https://www.rfc-editor.org/rfc/rfc3551.html',
  'https://www.rfc-editor.org/rfc/rfc7005.html',
  'https://doi.org/10.1073/pnas.0903616106',
];
for (const url of requiredPrimaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Una métrica de latencia necesita dos fronteras explícitas',
  'El reloj también forma parte de la definición',
  'El camino crítico importa más que la suma de tiempos completos',
  'Primer audio generado no es primer audio escuchado',
  'El presupuesto debe ser una distribución, no una media',
  'La percepción humana da contexto, no un SLA',
  'LiveKit, Pipecat o vanilla: la observabilidad cambia, la definición no',
  'Un procedimiento reproducible para encontrar el cuello de botella',
];
const enAnchors = [
  'A latency metric needs two explicit boundaries',
  'The clock is part of the definition',
  'The critical path matters more than the sum of full stage times',
  'First generated audio is not first heard audio',
  'A latency budget is a distribution, not a mean',
  'Human perception provides context, not an SLA',
  'LiveKit, Pipecat, or vanilla: observability changes, the definition does not',
  'A reproducible procedure for finding the bottleneck',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing required concept: ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing required concept: ${anchor}`);

for (const text of [es, en]) {
  check(text.includes('L_user = L_turn + L_response'), 'Latency boundary equation missing');
  check(text.includes('avg_jitter_buffer_delay = jitterBufferDelay / jitterBufferEmittedCount'), 'WebRTC jitter-buffer formula missing');
  check(text.includes('RTT / 2'), 'RTT/2 caveat missing');
  check(text.includes('e2e_latency'), 'LiveKit per-turn e2e metric missing');
  check(text.includes('UserBotLatencyObserver'), 'Pipecat user-bot latency metric missing');
  check(text.includes('speech_stop → first_playout'), 'Controlled user-boundary benchmark contract missing');
}
check(es.includes('20 ms o un frame, lo que sea mayor') && es.includes('no es «la latencia de WebRTC»'), 'ES: RFC 3551 packetization claim/caveat missing');
check(en.includes('20 ms or one frame, whichever is longer') && en.includes('not "WebRTC latency"'), 'EN: RFC 3551 packetization claim/caveat missing');
check(es.includes('latencia objetivo de la configuración') && es.includes('latencia real puede variar'), 'ES: W3C capture-latency scope caveat missing');
check(en.includes('target latency of the configuration') && en.includes('actual latency can vary'), 'EN: W3C capture-latency scope caveat missing');
check(es.includes('10 idiomas') && es.includes('250 ms') && es.includes('No establece que un agente de voz deba responder en 250 ms'), 'ES: human timing evidence is missing or converted into an SLA');
check(en.includes('10 languages') && en.includes('250 ms') && en.includes('does not establish a 250 ms latency target'), 'EN: human timing evidence is missing or converted into an SLA');

check(es.includes('Mismo hardware, ruta de red, codec, provider/model, política de turno, audio y carga.'), 'ES: controlled-comparison conditions missing');
check(en.includes('same hardware, network path, codec, provider/model, turn policy, audio, and load.'), 'EN: controlled-comparison conditions missing');
check(es.includes('no publiques un ranking numérico'), 'ES: uncontrolled framework benchmark prohibition missing');
check(en.includes('do not publish a numeric ranking'), 'EN: uncontrolled framework benchmark prohibition missing');
check(es.includes('LiveKit, Pipecat o vanilla') && es.includes('Python vanilla/thin'), 'ES: runtime decision track incomplete');
check(en.includes('LiveKit, Pipecat, or vanilla') && en.includes('Vanilla/thin Python'), 'EN: runtime decision track incomplete');
check(!es.includes('LiveKit es el más rápido') && !en.includes('LiveKit is the fastest'), 'Universal framework latency winner claim present');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

if (failures.length) {
  console.error(`Voice latency chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice latency chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha(visual)}`);
