#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/coding-agents-agent-harnesses/01-que-es-agent-harness.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/coding-agent-harness-loop.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-harness-loop.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-harness-loop.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://openai.com/index/unlocking-the-codex-harness/',
  'https://www.anthropic.com/engineering/managed-agents',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment',
  'https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github',
  'https://www.anthropic.com/engineering/claude-code-sandboxing',
  'https://www.anthropic.com/engineering/harness-design-long-running-apps',
  'https://geminicli.com/docs/reference/tools/',
  'https://geminicli.com/docs/cli/model/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'El modelo no posee el repositorio',
  'El mecanismo: un bucle con estado y efectos reales',
  'Cinco fronteras que el harness añade al modelo',
  'Contexto: qué realidad llega al siguiente turno',
  'Acción: cómo una intención se convierte en un efecto',
  'Política: qué está permitido hacer',
  'Feedback: qué aprende el loop de sus propios efectos',
  'Control: cuándo continuar, parar o devolver el problema',
  'Un ejemplo concreto: renombrar una API y actualizar sus consumidores',
  'El mismo modelo puede vivir en harnesses distintos',
  'Qué NO deberías atribuir al harness',
  'Assistant o agente: decide por delegación, no por la etiqueta',
  'Qué cambia al diseñar un sistema de producción',
];
const enAnchors = [
  'The model does not own the repository',
  'The mechanism: a stateful loop with real effects',
  'Five boundaries the harness adds around the model',
  'Context: which version of reality reaches the next turn',
  'Action: how intent becomes an effect',
  'Policy: what the agent is allowed to do',
  'Feedback: what the loop learns from its own effects',
  'Control: when to continue, stop, or hand the problem back',
  'A concrete example: rename an API and update its consumers',
  'The same model can live inside different harnesses',
  'What you should NOT attribute to the harness',
  'Assistant or agent: decide by delegation, not by branding',
  'What changes when you design a production system',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'agent harness', 'workspace', 'sandbox', 'tool', 'policy', 'approval', 'state',
    'stdout', 'stderr', 'git', 'diff', 'test', 'stop', 'handback', 'MCP',
  ]) check(text.toLowerCase().includes(token.toLowerCase()), `Missing required harness token ${token}`);
}

check(es.includes('proponer una acción') && es.includes('realizar una acción'), 'ES: proposal-vs-effect boundary missing');
check(en.includes('proposing an action') && en.includes('performing an action'), 'EN: proposal-vs-effect boundary missing');
check(es.includes('continuidad causal'), 'ES: stateful-loop causal continuity missing');
check(en.includes('causal continuity'), 'EN: stateful-loop causal continuity missing');

check(es.includes('coding assistant') && es.includes('no un estándar arquitectónico'), 'ES: assistant category caveat missing');
check(en.includes('Coding assistant') && en.includes('not an architectural standard'), 'EN: assistant category caveat missing');
check(es.includes('No hay una frontera binaria universal'), 'ES: assistant-vs-agent non-binary caveat missing');
check(en.includes('There is no universal binary boundary'), 'EN: assistant-vs-agent non-binary caveat missing');

check(es.includes('el modelo es una dependencia del harness, no el harness completo'), 'ES: model/harness separation missing');
check(en.includes('the model is a dependency of the harness, not the entire harness'), 'EN: model/harness separation missing');
check(es.includes('Más scaffolding no es automáticamente mejor') || es.includes('más scaffolding no es automáticamente mejor'), 'ES: harness-complexity trade-off missing');
check(en.includes('more scaffolding is not automatically better'), 'EN: harness-complexity trade-off missing');

check(es.includes('filesystem') && es.includes('network isolation'), 'ES: execution security boundaries missing');
check(en.includes('filesystem isolation') && en.includes('network isolation'), 'EN: execution security boundaries missing');
check(es.includes('Un approval tampoco convierte una acción en segura'), 'ES: approval safety caveat missing');
check(en.includes('An approval does not make an action safe by itself'), 'EN: approval safety caveat missing');

check(es.includes('tener herramientas de test no significa que el resultado sea correcto'), 'ES: verifier limitation missing');
check(en.includes('having test tools does not mean the result is correct'), 'EN: verifier limitation missing');
check(es.includes('La unidad de evaluación útil es la trayectoria sobre un repositorio'), 'ES: trajectory evaluation unit missing');
check(en.includes('The useful evaluation unit is the repository trajectory'), 'EN: trajectory evaluation unit missing');

for (const text of [es, en]) {
  check(text.includes('create_user()') && text.includes('create_account()'), 'Worked repository example missing');
  check(text.includes('formatter') && text.includes('type checker') && text.includes('diff'), 'Verification feedback chain incomplete');
}

check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!/harness (guarantees|garantiza) (correctness|corrección|security|seguridad)/i.test(`${es}\n${en}`), 'Unsupported harness guarantee detected');
check(!/^\s*(?:assistant\s*=\s*no tools|agent\s*=\s*tools)[.!]?\s*$/im.test(`${es}\n${en}`), 'Rigid assistant-vs-agent taxonomy asserted as a standalone rule');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/coding-agent-harness-loop.html") }}';
check(es.includes(visualInclude), 'ES: harness loop visual include missing');
check(en.includes(visualInclude), 'EN: harness loop visual include missing');
check(snippet.includes('Modelo ≠ harness') && snippet.includes('Contrato de tarea') && snippet.includes('Harness + entorno') && snippet.includes('Verificador / stop'), 'Visual: responsibility boundary incomplete');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: harness visual canonical mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/coding-agent-harness-loop.html', 'EN: harness visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: harness visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Model ≠ harness', 'Task contract', 'proposes the next action', 'Harness + environment', 'Verifier / stop', 'causal']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

check(mkdocsEs.includes('Coding agents y agent harnesses:') && mkdocsEs.includes('Qué es un agent harness: series/coding-agents-agent-harnesses/01-que-es-agent-harness.md'), 'ES: Series 2 / chapter 2.1 navigation missing');
check(mkdocsEn.includes('Coding Agents & Agent Harnesses:') && mkdocsEn.includes('What is an agent harness?: series/coding-agents-agent-harnesses/01-que-es-agent-harness.md'), 'EN: Series 2 / chapter 2.1 navigation missing');
check(manifest.includes('series/coding-agents-agent-harnesses/01-que-es-agent-harness.md'), 'EN: chapter 2.1 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/coding-agent-harness-loop.html'), 'EN: chapter 2.1 required snippet missing');

if (failures.length) {
  console.error(`Coding agent harness chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Coding agent harness chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);
