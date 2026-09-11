#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const esPath = path.resolve('docs/series/agentes-voz-tiempo-real/02-turn-taking.md');
const enPath = path.resolve('locales/en/series/agentes-voz-tiempo-real/02-turn-taking.md');
const visualPath = path.resolve('docs/snippets/articulos-tecnicos/voice-turn-taking-signals.html');
const mirrorPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-turn-taking-signals.html');
const i18nPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-turn-taking-signals.i18n.json');

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

const route = 'series/agentes-voz-tiempo-real/02-turn-taking.md';
const include = '{{ include_html("snippets/articulos-tecnicos/voice-turn-taking-signals.html") }}';
check(es.includes(include), 'ES: missing turn-taking signal visual include');
check(en.includes(include), 'EN: missing turn-taking signal visual include');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN visual mirror: canonical marker missing');
check(i18n.source === 'snippets/articulos-tecnicos/voice-turn-taking-signals.html', 'EN visual i18n: wrong source path');
check(i18n.source_blob_sha === blobSha(visual), `EN visual i18n: source_blob_sha drift; expected ${blobSha(visual)}, got ${i18n.source_blob_sha}`);

// PROGRAM AMENDMENT: visual pedagogy is relationship-first. This artifact
// must encode time, authority layers, state duration and an actual outcome
// branch. A row of labeled boxes or cosmetic tab swapping is a hard failure.
const artifactContract = [
  'GOLDEN_VISUAL_CONTRACT',
  'learning_objective:',
  'mechanism:',
  'visual_variables:',
  'why_visual:',
  'x-position=time',
  'row=signal/authority layer',
  'vertical marker=observable/decision boundary',
  'branch row=alternative outcome',
];
for (const token of artifactContract) check(visual.includes(token), `Visual contract: missing ${token}`);
check(!visual.includes('s5v-arch-map__pipe'), 'Visual pedagogy: legacy linear box pipe reintroduced');
check(!visual.includes('data-s5v-stepper'), 'Visual pedagogy: cosmetic stepper/tabs reintroduced');
check(!visual.includes('s5v__steps--tabs'), 'Visual pedagogy: tab-swapping primitive reintroduced');
check((visual.match(/data-turn-scenario=/g) || []).length === 2, 'Visual pedagogy: expected exactly two temporal scenarios');
check(visual.includes('data-turn-scenario="pause"') && visual.includes('data-turn-scenario="overlap"'), 'Visual pedagogy: pause/overlap scenarios missing');

const relationshipAnchors = [
  'data-turn-segment="user-speech-a"',
  'data-turn-segment="user-speech-b"',
  'data-turn-segment="vad-silence"',
  'data-turn-segment="turn-open"',
  'data-turn-marker="vad-stop"',
  'data-turn-marker="turn-commit"',
  'data-turn-segment="agent-playout"',
  'data-turn-segment="overlap-speech"',
  'data-turn-marker="interrupt-candidate"',
  'data-turn-branch="intent"',
  'data-turn-outcome="continue"',
  'data-turn-outcome="cancel"',
  'data-turn-marker="barge-in-cancel"',
];
for (const anchor of relationshipAnchors) check(visual.includes(anchor), `Visual pedagogy: missing relationship anchor ${anchor}`);
check(visual.includes('overflow-x:auto') && visual.includes('tabindex="0"'), 'Responsive visual: timeline must preserve horizontal time geometry with keyboard/touch scrolling');
check(visual.includes('@media (prefers-reduced-motion:reduce)'), 'Visual: reduced-motion contract missing');
check(visual.includes('Detección ≠ decisión ≠ efecto.'), 'Visual: detection/decision/effect invariant missing');

check(mkdocsEs.includes(`- Turn-taking: ${route}`), 'ES nav: chapter 2 route missing');
check(mkdocsEn.includes(`- Turn-taking: ${route}`), 'EN nav: chapter 2 route missing');
check(manifest.includes(`  - ${route}`), 'EN manifest: chapter 2 published route missing');
check(manifest.includes('  - snippets/articulos-tecnicos/voice-turn-taking-signals.html'), 'EN manifest: turn-taking visual required_snippets entry missing');

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

// Current Pipecat separation: VAD analyzer emits low-level signals, while
// start strategies decide whether those signals open a user turn. Krisp VIVA
// is an integration backed by Krisp's model/SDK, not a Pipecat-owned model.
check(es.includes('KrispVivaIPUserTurnStartStrategy') && es.includes('SDK/modelo de Krisp') && es.includes('no un modelo propio de Pipecat'), 'ES: Pipecat/Krisp interruption-prediction ownership boundary missing');
check(en.includes('KrispVivaIPUserTurnStartStrategy') && en.includes("Krisp's SDK/model") && en.includes('not a Pipecat-owned model'), 'EN: Pipecat/Krisp interruption-prediction ownership boundary missing');
check(es.includes('VAD/min-words/Krisp VIVA IP/estrategias externas'), 'ES: runtime decision table omits current Pipecat interruption strategies');
check(en.includes('VAD/min-words/Krisp VIVA IP/external start strategies'), 'EN: runtime decision table omits current Pipecat interruption strategies');

// LiveKit core/session false-interruption recovery is distinct from the
// LiveKit Cloud adaptive interruption model. Both locales preserve that
// product/framework boundary.
check(es.includes('false_interruption_timeout') && es.includes('resume_false_interruption') && es.includes('recuperación de sesión es distinta del modelo adaptive gestionado'), 'ES: LiveKit false-interruption recovery boundary missing');
check(en.includes('false_interruption_timeout') && en.includes('resume_false_interruption') && en.includes('session-level recovery is separate from the managed adaptive model'), 'EN: LiveKit false-interruption recovery boundary missing');

check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!es.includes('LiveKit Agents es mejor'), 'ES: universal framework winner claim present');
check(!en.includes('LiveKit Agents is better'), 'EN: universal framework winner claim present');

if (failures.length) {
  console.error(`Turn-taking chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Turn-taking chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha(visual)}`);
