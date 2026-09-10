#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/coding-agent-isolation-stack.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-isolation-stack.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-isolation-stack.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://git-scm.com/docs/git-worktree',
  'https://git-scm.com/docs/gitglossary',
  'https://git-scm.com/docs/git-status',
  'https://openai.com/index/introducing-the-codex-app/',
  'https://openai.com/index/running-codex-safely/',
  'https://www.anthropic.com/engineering/claude-code-sandboxing',
  'https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment',
  'https://google-gemini.github.io/gemini-cli/docs/cli/sandbox.html',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Cinco objetos que conviene nombrar por separado',
  'Branch, worktree, sandbox y contenedor no son sinónimos',
  'Qué hace realmente `git worktree`',
  'Una rama tampoco es un workspace',
  'Contexto del modelo y estado del workspace pueden divergir',
  'El sandbox es una frontera de capacidades, no una carpeta especial',
  'Un contenedor tampoco convierte automáticamente el entorno en seguro',
  'Paralelizar agentes introduce tres clases de colisión',
  'Caso concreto: dos agentes, un mismo repositorio',
  'Qué hacen hoy algunos harnesses: no mezcles fronteras de producto',
  'Dirty state: el agente debe saber de quién es cada cambio',
  'Recuperar una sesión exige reconciliar realidad, no sólo conversación',
  'Qué aislamiento elegir',
  'Contrato mínimo para un harness de producción',
  'Implicación para producción',
];
const enAnchors = [
  'Five objects worth naming separately',
  'Branches, worktrees, sandboxes, and containers are not synonyms',
  'What `git worktree` actually does',
  'A branch is not a workspace either',
  'Model context and workspace state can diverge',
  'A sandbox is a capability boundary, not a special folder',
  'A container does not automatically make the environment safe',
  'Parallel agents introduce three kinds of collision',
  'Concrete case: two agents, one repository',
  'What current harnesses do: keep product boundaries separate',
  'Dirty state: the agent must know who owns each change',
  'Resuming a session requires reconciling reality, not just conversation',
  'Choosing the isolation you need',
  'Minimum contract for a production harness',
  'Production implication',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'base_sha', 'integration_target', 'HEAD', 'index', 'worktree', 'branch', 'sandbox',
    'untracked', 'ignored', 'submodule', 'filesystem', 'network', 'process', 'credential',
    'service_namespace', 'verification_head_sha', 'cleanup_state', 'rebase', 'merge',
  ]) check(text.toLowerCase().includes(token.toLowerCase()), `Missing repository-isolation token ${token}`);
}

check(es.includes('`git diff` no es un inventario completo del workspace'), 'ES: git diff inventory caveat missing');
check(en.includes('`git diff` is not a complete inventory of the workspace'), 'EN: git diff inventory caveat missing');
check(es.includes('Un worktree aísla estado de trabajo; no limita por sí mismo'), 'ES: worktree security boundary missing');
check(en.includes('A worktree isolates work state; by itself it does not limit'), 'EN: worktree security boundary missing');
check(es.includes('workspace dice qué estado estás modificando; sandbox dice qué efectos de ejecución están permitidos'), 'ES: workspace-vs-sandbox boundary missing');
check(en.includes('the workspace says which state you are changing, while the sandbox says which execution effects are allowed'), 'EN: workspace-vs-sandbox boundary missing');
check(es.includes('“corre en un sandbox” no es evidencia suficiente'), 'ES: effective-policy caveat missing');
check(en.includes('“runs in a sandbox” is not sufficient evidence'), 'EN: effective-policy caveat missing');
check(es.includes('“working tree clean” es una propiedad Git concreta, no una prueba de entorno reproducible'), 'ES: clean-worktree caveat missing');
check(en.includes('“working tree clean” is a specific Git property, not proof of a reproducible environment'), 'EN: clean-worktree caveat missing');
check(es.includes('un “merge limpio” tampoco demuestra compatibilidad semántica'), 'ES: clean-merge caveat missing');
check(en.includes('a clean merge is not proof of semantic compatibility either'), 'EN: clean-merge caveat missing');

for (const text of [es, en]) {
  check(text.includes('preexisting_changes') && text.includes('agent_changes') && text.includes('external_changes_during_run'), 'Dirty-state ownership model incomplete');
  check(text.includes('test_t1') && text.includes('test_t2') && text.includes('/tmp/t1') && text.includes('/tmp/t2'), 'Parallel-agent worked example incomplete');
  check(text.includes('verification_head_sha') && text.includes('cleanup_state'), 'Production recovery identity incomplete');
}

check(es.includes('Worktree y sandbox son mecanismos distintos incluso dentro del mismo producto'), 'ES: Codex product-boundary caveat missing');
check(en.includes('Worktree and sandbox are distinct mechanisms even inside the same product'), 'EN: Codex product-boundary caveat missing');
check(es.includes('execution environment') && es.includes('branch capability') && es.includes('merge policy'), 'ES: GitHub capability boundary missing');
check(en.includes('execution environment') && en.includes('branch capability') && en.includes('merge policy'), 'EN: GitHub capability boundary missing');
check(es.includes('varias políticas'), 'ES: Gemini effective-mode caveat missing');
check(en.includes('several policies'), 'EN: Gemini effective-mode caveat missing');

check(!/worktree (?:es|is) (?:un |a )?(?:security )?sandbox/i.test(`${es}\n${en}`), 'Worktree incorrectly equated with sandbox');
check(!/(?:container|contenedor) (?:guarantees|garantiza) (?:security|seguridad)/i.test(`${es}\n${en}`), 'Container incorrectly asserted to guarantee security');
check(!/(?:branch|rama) (?:contains|contiene) (?:all|todo) (?:workspace|estado)/i.test(`${es}\n${en}`), 'Branch incorrectly equated with complete workspace state');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/coding-agent-isolation-stack.html") }}';
check(es.includes(visualInclude), 'ES: isolation visual include missing');
check(en.includes(visualInclude), 'EN: isolation visual include missing');
check(snippet.includes('Repo + base SHA') && snippet.includes('Vista de contexto') && snippet.includes('Workspace / worktree') && snippet.includes('Sandbox') && snippet.includes('Integración'), 'Visual: isolation layers incomplete');
check(snippet.includes('no es una security boundary') && snippet.includes('no resuelve conflictos semánticos'), 'Visual: worktree/sandbox limits missing');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: isolation visual canonical mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/coding-agent-isolation-stack.html', 'EN: isolation visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: isolation visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Isolation ≠ one primitive', 'Context view', 'what the model observes', 'HEAD · index · dirty state', 'filesystem · network · processes · identity', 'Integration', 'not a security boundary', 'does not resolve semantic conflicts']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

check(mkdocsEs.includes('Coding agents y agent harnesses:') && mkdocsEs.includes('Contexto, workspace y aislamiento: series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento.md'), 'ES: Series 2 / chapter 2.2 navigation missing');
check(mkdocsEn.includes('Coding Agents & Agent Harnesses:') && mkdocsEn.includes('Repository context, workspaces and isolation: series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento.md'), 'EN: Series 2 / chapter 2.2 navigation missing');
check(manifest.includes('series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento.md'), 'EN: chapter 2.2 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/coding-agent-isolation-stack.html'), 'EN: chapter 2.2 required snippet missing');

if (failures.length) {
  console.error(`Coding agent harness chapter 2.2 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Coding agent harness chapter 2.2 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);
