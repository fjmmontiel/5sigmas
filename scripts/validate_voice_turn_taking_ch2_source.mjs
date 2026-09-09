#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const esPath = path.resolve('docs/series/agentes-voz-tiempo-real/02-turn-taking.md');
const enPath = path.resolve('locales/en/series/agentes-voz-tiempo-real/02-turn-taking.md');
const visualPath = path.resolve('docs/snippets/articulos-tecnicos/voice-turn-taking-signals.html');
const mirrorPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-turn-taking-signals.html');
const i18nPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-turn-taking-signals.i18n.json');

const [es, en, visual, mirror, i18nRaw] = await Promise.all([
  fs.readFile(esPath, 'utf8'),
  fs.readFile(enPath, 'utf8'),
  fs.readFile(visualPath, 'utf8'),
  fs.readFile(mirrorPath, 'utf8'),
  fs.readFile(i18nPath, 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const blobSha = (text) => {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};

const include = '{{ include_html("snippets/articulos-tecnicos/voice-turn-taking-signals.html") }}';
check(es.includes(include), 'ES: missing turn-taking signal visual include');
check(en.includes(include), 'EN: missing turn-taking signal visual include');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN visual mirror: canonical marker missing');
check(i18n.source === 'snippets/articulos-tecnicos/voice-turn-taking-signals.html', 'EN visual i18n: wrong source path');
check(i18n.source_blob_sha === blobSha(visual), `EN visual i18n: source_blob_sha drift; expected ${blobSha(visual)}, got ${i18n.source_blob_sha}`);

const requiredPrimaryUrls = [
  'https://github.com/snakers4/silero-vad',
  'https://docs.pipecat.ai/pipecat/learn/speech-input',
  'https://docs.pipecat.ai/api-reference/server/utilities/turn-management/user-turn-strategies',
  'https://docs.pipecat.ai/api-reference/server/frames/system-frames',
  'https://docs.livekit.io/agents/logic/turns/',
  'https://docs.livekit.io/agents/logic/turns/turn-detector/',
  'https://docs.livekit.io/agents/logic/turns/tuning/',
  'https://docs.livekit.io/agents/logic/turns/adaptive-interruption-handling/',
  'https://platform.openai.com/docs/api-reference/realtime',
];
for (const url of requiredPrimaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'detectar habla, decidir que un turno terminó',
  'VAD y *end-of-turn* deben ser señales separadas',
  'Un timeout es una política, no una prueba semántica',
  'speech start es evidencia para considerar una interrupción',
  'Interrumpir correctamente es una operación de estado',
  'LiveKit, Pipecat o vanilla: quién posee la decisión',
  'adaptive es una superficie gestionada separada',
  'haya una única autoridad por transición',
  'turn-taking no es un threshold de silencio',
];
const enAnchors = [
  'detecting speech, deciding that a turn is complete',
  'VAD and end-of-turn detection should be separate signals',
  'A timeout is a policy, not semantic proof',
  'speech start is evidence for considering an interruption',
  'A correct interruption is a state transition',
  'LiveKit, Pipecat, or vanilla: who owns the decision?',
  'adaptive handling is a separate managed surface',
  'each transition has one authority',
  'turn-taking is not a silence threshold',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing required concept: ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing required concept: ${anchor}`);

check(es.includes('server_vad') && es.includes('semantic_vad'), 'ES: provider VAD modes not distinguished');
check(en.includes('server_vad') && en.includes('semantic_vad'), 'EN: provider VAD modes not distinguished');
check(es.includes('Endpoint prematuro') && es.includes('Interrupción falsa') && es.includes('Interrupción perdida'), 'ES: failure taxonomy incomplete');
check(en.includes('Premature endpoint') && en.includes('False interruption') && en.includes('Missed interruption'), 'EN: failure taxonomy incomplete');
check(es.includes('mismo corpus de audio') && es.includes('condiciones de red'), 'ES: controlled comparison rule missing');
check(en.includes('same audio corpus') && en.includes('network conditions'), 'EN: controlled comparison rule missing');
check(!es.includes('LiveKit Agents es mejor'), 'ES: universal framework winner claim present');
check(!en.includes('LiveKit Agents is better'), 'EN: universal framework winner claim present');

if (failures.length) {
  console.error(`Turn-taking chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Turn-taking chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha(visual)}`);
