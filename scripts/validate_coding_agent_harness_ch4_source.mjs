#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/coding-agent-authority-path.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-authority-path.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-authority-path.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://openai.com/index/running-codex-safely/',
  'https://code.claude.com/docs/en/permissions',
  'https://code.claude.com/docs/en/hooks',
  'https://code.claude.com/docs/en/settings',
  'https://code.claude.com/docs/en/security',
  'https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools',
  'https://docs.github.com/en/copilot/tutorials/cloud-agent/give-access-to-resources',
  'https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/agents/cloud-agent/risks-and-mitigations',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-the-firewall',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'La pregunta correcta no es «¿qué tools tiene el agente?»',
  'Tool availability y permission son controles diferentes',
  'La policy debe vivir fuera de la inferencia del modelo',
  'Deny, ask y allow no son tres niveles equivalentes',
  'Un approval debe estar ligado a la acción que el humano vio',
  'El problema TOCTOU también existe en agents',
  'Sandbox y approvals resuelven preguntas distintas',
  'Una credencial es autoridad empaquetada',
  'Preferir proyección mínima a «inyectar todos los secretos del entorno»',
  '«Read-only» puede seguir siendo una operación sensible',
  'El firewall tampoco es una palabra mágica',
  'Hooks: automatización y enforcement no son lo mismo',
  'Un hook puede ser otra superficie privilegiada',
  'Prompt injection cambia decisiones; la policy limita consecuencias',
  'Caso trabajado: actualizar un paquete privado y abrir un PR',
  'Los approvals permanentes acumulan autoridad',
  'El sistema remoto sigue teniendo la última palabra',
  'Qué observar para poder auditar autoridad',
  'Evals de permisos: probar negativas, no sólo happy paths',
  'Trade-off real: velocidad frente a autoridad preconcedida',
  'Implicación de producción: diseñar autoridad como un grafo',
];
const enAnchors = [
  'The right question is not “which tools does the agent have?”',
  'Tool availability and permission are different controls',
  'Policy must live outside model inference',
  'Deny, ask, and allow are not three equivalent risk levels',
  'Approval should be bound to the action the human reviewed',
  'Agents also have a TOCTOU problem',
  'Sandboxing and approvals answer different questions',
  'A credential is packaged authority',
  'Prefer minimal projection over “inject every environment secret”',
  '“Read-only” can still be sensitive',
  'A firewall is not a magic word either',
  'Hooks: automation and enforcement are not the same thing',
  'A hook can itself be a privileged surface',
  'Prompt injection changes decisions; policy limits consequences',
  'Worked example: update a private package and open a PR',
  'Persistent approvals accumulate authority',
  'The remote system still gets the final say',
  'What to observe if authority must be auditable',
  'Permission evals need negative paths, not only happy paths',
  'The real trade-off: velocity versus pre-granted authority',
  'Production implication: design authority as a graph',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'Executable', 'tool_available', 'policy_authority', 'approval_subject', 'normalized_arguments',
    'credential_identity', 'arguments_digest', 'policy_version', 'approval_id',
    'credential_value_logged', 'network_destination', 'verification_head_sha',
  ]) check(text.toLowerCase().includes(token.toLowerCase()), `Missing authority-contract token ${token}`);
  for (const symbol of ['T(a)', 'P(a)', 'S(a)', 'C(a)', 'R(a)', 'A(a)']) {
    check(text.includes(symbol), `Missing executable predicate term ${symbol}`);
  }
}

check(es.includes('post-hook != preventive control'), 'ES: post-hook timing boundary missing');
check(en.includes('post-hook != preventive control'), 'EN: post-hook timing boundary missing');
check(es.includes('tool catalog = superficie de decisión del modelo'), 'ES: tool availability boundary missing');
check(en.includes('tool catalog = model decision surface'), 'EN: tool availability boundary missing');
check(es.includes('secret storage ≠ credential scope ≠ permission to call a tool'), 'ES: secret/authority separation missing');
check(en.includes('secret storage ≠ credential scope ≠ permission to call a tool'), 'EN: secret/authority separation missing');
check(es.includes('credential_value_logged: false'), 'ES: secret-safe audit example missing');
check(en.includes('credential_value_logged: false'), 'EN: secret-safe audit example missing');
check(es.includes('Time of check / time of use'), 'ES: TOCTOU term missing');
check(en.includes('Time of check / time of use'), 'EN: TOCTOU term missing');
check(es.includes('command hooks se ejecutan con los permisos completos del usuario'), 'ES: hook privilege caveat missing');
check(en.includes('command hooks run with the user’s full permissions'), 'EN: hook privilege caveat missing');
check(es.includes('procesos iniciados mediante Bash') && es.includes('MCP servers'), 'ES: GitHub firewall coverage caveat missing');
check(en.includes('processes launched through Bash') && en.includes('MCP servers'), 'EN: GitHub firewall coverage caveat missing');
check(es.includes('restricciones de Internet') || es.includes('restringe el acceso a Internet'), 'ES: exfiltration/network boundary missing');
check(en.includes('restricts Internet access'), 'EN: exfiltration/network boundary missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

for (const text of [es, en]) {
  check(!/approval (?:proves|demuestra|guarantees|garantiza) (?:that )?(?:the )?(?:action|acción).*(?:safe|segura)/i.test(text), 'Approval incorrectly framed as safety proof');
  check(!/(?:container|sandbox).*(?:means|significa|guarantees|garantiza).*(?:safe|seguro|segura)/i.test(text), 'Sandbox/container incorrectly framed as sufficient safety');
  check(!/(?:read-only|solo lectura).*(?:always|siempre).*(?:safe|seguro|segura)/i.test(text), 'Read-only incorrectly framed as universally safe');
}

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/coding-agent-authority-path.html") }}';
check(es.includes(visualInclude), 'ES: authority-path visual include missing');
check(en.includes(visualInclude), 'EN: authority-path visual include missing');
for (const token of ['Contexto', 'Propuesta', 'Policy', 'Approval', 'Sandbox', 'Credencial', 'Efecto + evidencia']) {
  check(snippet.includes(token), `Visual: authority stage missing ${token}`);
}
check(snippet.includes('una frontera no sustituye a las demás'), 'Visual: defense-in-depth caveat missing');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: authority-path visual mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/coding-agent-authority-path.html', 'EN: authority-path visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: authority-path visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Authority · policy · credentials', 'A tool call is not yet permission', 'Context', 'Proposal', 'Policy', 'Approval', 'Sandbox', 'Credential', 'Effect + evidence', 'Defense in depth']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

const route = 'series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries.md';
check(mkdocsEs.includes('Tools, permisos y trust boundaries: ' + route), 'ES: Series 2 / chapter 2.4 navigation missing');
check(mkdocsEn.includes('Tools, permissions and trust boundaries: ' + route), 'EN: Series 2 / chapter 2.4 navigation missing');
check(manifest.includes(route), 'EN: chapter 2.4 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/coding-agent-authority-path.html'), 'EN: chapter 2.4 required snippet missing');

if (failures.length) {
  console.error(`Coding agent harness chapter 2.4 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Coding agent harness chapter 2.4 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);