#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read=(p)=>fs.readFile(path.resolve(p),'utf8');
const [es,en,snippet,mirror,i18nRaw,mkdocsEs,mkdocsEn,manifestEn,prVisual]=await Promise.all([
  read('docs/series/context-engineering-memory-mcp/06-skills-plugins-subagents-hooks-context-isolation-evaluation.md'),
  read('locales/en/series/context-engineering-memory-mcp/06-skills-plugins-subagents-hooks-context-isolation-evaluation.md'),
  read('docs/snippets/articulos-tecnicos/context-extension-isolation-lifecycle.html'),
  read('locales/en/snippets/articulos-tecnicos/context-extension-isolation-lifecycle.html'),
  read('locales/en/snippets/articulos-tecnicos/context-extension-isolation-lifecycle.i18n.json'),
  read('mkdocs.yml'),read('mkdocs.en.yml'),read('locales/en/manifest.yml'),read('.github/workflows/pr-visual-review.yml'),
]);
const i18n=JSON.parse(i18nRaw);const failures=[];const check=(c,m)=>{if(!c)failures.push(m);};
const route='series/context-engineering-memory-mcp/06-skills-plugins-subagents-hooks-context-isolation-evaluation.md';
const visualPath='snippets/articulos-tecnicos/context-extension-isolation-lifecycle.html';

check(mkdocsEs.includes('Context engineering, memoria y MCP:')&&mkdocsEs.includes(route),'ES: chapter 3.6 nav missing');
check(mkdocsEn.includes('Context Engineering, Memory & MCP:')&&mkdocsEn.includes(route),'EN: chapter 3.6 nav missing');
check(manifestEn.includes(`  - ${route}`),'EN: chapter 3.6 route missing from manifest');
check(manifestEn.includes(`  - ${visualPath}`),'EN: chapter 3.6 visual missing from required_snippets');
check(prVisual.includes('node scripts/validate_context_engineering_ch6_source.mjs'),'CI: chapter 3.6 source gate not wired');
check(prVisual.includes('node scripts/validate_context_engineering_ch6_accessibility.mjs'),'CI: chapter 3.6 browser gate not wired');

const sources=[
'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview',
'https://code.claude.com/docs/en/plugins-reference',
'https://code.claude.com/docs/en/subagents',
'https://code.claude.com/docs/en/hooks-guide',
'https://code.claude.com/docs/en/hooks',
'https://code.claude.com/docs/en/permissions',
'https://www.anthropic.com/engineering/how-we-contain-claude',
'https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex',
'https://openai.github.io/openai-agents-python/agents/',
'https://openai.github.io/openai-agents-python/handoffs/',
'https://openai.github.io/openai-agents-python/context/',
'https://openai.github.io/openai-agents-python/guardrails/',
'https://openai.github.io/openai-agents-python/mcp/',
'https://openai.github.io/openai-agents-python/tracing/'];
for(const url of sources){check(es.includes(url),`ES missing primary source ${url}`);check(en.includes(url),`EN missing primary source ${url}`);}

const parity=[
['Cuatro primitives, cuatro preguntas distintas','Four primitives, four different questions'],
['Una skill es una unidad de expertise reutilizable','A skill is reusable expertise'],
['Plugin es normalmente una frontera de empaquetado','A plugin is usually a packaging boundary'],
['Un subagente es delegación','A subagent is delegation'],
['Handoff y agent-as-tool tampoco significan lo mismo','Handoff and agent-as-tool are not the same composition pattern'],
['El delegation envelope debería ser un contrato','The delegation envelope should be a contract'],
['«Aislamiento de contexto» son al menos seis fronteras','“Context isolation” is at least six different boundaries'],
['Hooks son control de lifecycle','Hooks are lifecycle control'],
['Context filtering no es authorization','Context filtering is not authorization'],
['Evaluar subagentes: delegation quality y aislamiento por separado','Evaluating subagents: delegation quality and isolation are separate axes'],
['Observabilidad: una traza debe mostrar los saltos de contexto y autoridad','Observability must show both context jumps and authority jumps'],
['Caso concreto: revisión de un pull request','Concrete case: reviewing a pull request']];
for(const [a,b] of parity){check(es.includes(a),`ES missing concept ${a}`);check(en.includes(b),`EN missing concept ${b}`);}

for(const [locale,text] of [['ES',es],['EN',en]]){
  for(const token of ['C_discovery','C_active','activation_recall','activation_precision','result','candidate_sha / data_version','evidence_ids','workspace/sandbox id','skill loaded ≠ action authorized','plugin installed ≠ component trusted','subagent created ≠ context isolated','separate context ≠ separate application state','hook deterministic ≠ hook safe','capability visible ≠ capability authorized','task success ≠ isolation success']) check(text.includes(token),`${locale}: missing contract ${token}`);
  check(text.includes('D = (')&&text.includes('allowed_context')&&text.includes('allowed_capabilities')&&text.includes('provenance_requirements'),`${locale}: delegation envelope incomplete`);
  for(const dimension of ['Workspace/filesystem','Tools']) check(text.toLowerCase().includes(dimension.toLowerCase()),`${locale}: isolation dimension missing ${dimension}`);
}
check(es.includes('Si `tools` se omite')&&es.includes('tools disponibles para subagentes'),'ES: current Claude Code subagent inheritance boundary missing');
check(en.includes('If `tools` is omitted')&&en.includes('tools available to subagents'),'EN: current Claude Code subagent inheritance boundary missing');
check(es.includes('`isolation: worktree`')&&en.includes('`isolation: worktree`'),'ES/EN: explicit worktree isolation missing');
check(es.includes('hook asíncrono')&&es.includes('no puede bloquear')&&en.includes('async hook')&&en.includes('cannot block'),'ES/EN: async hook prevention boundary missing');
check(es.includes('defer')===false,'ES: untranslated defer scaffolding');
check(!/^\s*-\s+.+;\s*$/m.test(en),'EN: semicolon-list anti-pattern detected');
check(!/\?\./.test(en),'EN: malformed question punctuation');

const include='{{ include_html("snippets/articulos-tecnicos/context-extension-isolation-lifecycle.html") }}';
check(es.includes(include)&&en.includes(include),'ES/EN: chapter 3.6 visual include missing');
for(const token of ['GOLDEN_VISUAL_CONTRACT','relationship="plugin-package->{skill,subagent-def,hook-config};skill->discovery->activation->parent-context','interaction="static:no-cosmetic-controls"','mobile="horizontal-scroll-preserves-package-context-authority-and-evaluation-topology"','.ei-stage{width:100%;min-width:0;max-width:1200px;margin:0 auto}','Paquete ≠ contexto ≠ autoridad','POLÍTICA DEL HOST','FRONTERA DELEGADA · CONTEXTO HIJO','AUTORIDAD EXTERNA','EVALUACIÓN · FRONTERAS INDEPENDIENTES']) check(snippet.includes(token),`Visual missing contract ${token}`);
check(!snippet.includes('s5v-arch-map__pipe')&&!snippet.includes('data-s5v-stepper')&&!snippet.includes('data-s5v-tabs'),'Visual: cosmetic linear/tabs pattern returned');
for(const node of ['skill','subagent-def','hook-config','integration-def','parent-context','host-policy','discovery','activation','delegation-envelope','child-context','filtered-tools','worktree','pre-hook','integration-auth','external-effect','verify','eval-activation','eval-isolation','eval-hooks','eval-effects']) check(snippet.includes(`data-node="${node}"`),`Visual missing node ${node}`);
for(const boundary of ['package','host','child','authority','eval']) check(snippet.includes(`data-boundary="${boundary}"`),`Visual missing boundary ${boundary}`);
for(const edge of ['skill-discovery','discovery-activation','activation-parent','policy-delegate','envelope-child','child-tools','child-worktree','child-return','policy-hook','hook-auth','auth-effect','effect-verify','subagent-package','hook-package','integration-package','eval-activation-edge','eval-isolation-edge','eval-hooks-edge','eval-effects-edge']) check(snippet.includes(`data-edge="${edge}"`),`Visual missing relationship ${edge}`);

check(mirror.trim()==='<!-- 5sigmas-canonical-mirror -->','EN: canonical mirror marker invalid');
check(i18n.source===visualPath,'EN: chapter 3.6 i18n source invalid');
const bytes=Buffer.from(snippet,'utf8');const blobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`,'utf8'),bytes])).digest('hex');
check(i18n.source_blob_sha===blobSha,`EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${blobSha})`);
for(const token of ['Package ≠ context ≠ authority','PLUGIN · DISTRIBUTION','PARENT CONTEXT Cₜ','HOST POLICY','DELEGATED BOUNDARY · CHILD CONTEXT','EXTERNAL AUTHORITY','PREVENTIVE HOOK','AUTHORIZATION','EXTERNAL EFFECT','EVALUATION · INDEPENDENT BOUNDARIES','The useful split is not']) check(Object.values(i18n.replacements).some(v=>String(v).includes(token)),`EN visual translation missing ${token}`);

if(failures.length){console.error(`Context engineering chapter 3.6 source gate failed (${failures.length}):`);for(const f of failures)console.error(`- ${f}`);process.exit(1);}console.log('Context engineering chapter 3.6 source gate PASS');console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
