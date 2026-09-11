#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read=(p)=>fs.readFile(path.resolve(p),'utf8');
const [es,en,snippet,mirror,i18nRaw,mkdocsEs,mkdocsEn,manifestEn,prVisual]=await Promise.all([
  read('docs/series/context-engineering-memory-mcp/05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries.md'),
  read('locales/en/series/context-engineering-memory-mcp/05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries.md'),
  read('docs/snippets/articulos-tecnicos/context-mcp-trust-boundaries.html'),
  read('locales/en/snippets/articulos-tecnicos/context-mcp-trust-boundaries.html'),
  read('locales/en/snippets/articulos-tecnicos/context-mcp-trust-boundaries.i18n.json'),
  read('mkdocs.yml'),read('mkdocs.en.yml'),read('locales/en/manifest.yml'),read('.github/workflows/pr-visual-review.yml'),
]);
const i18n=JSON.parse(i18nRaw);const failures=[];const check=(c,m)=>{if(!c)failures.push(m);};
const route='series/context-engineering-memory-mcp/05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries.md';
const visualPath='snippets/articulos-tecnicos/context-mcp-trust-boundaries.html';

check(mkdocsEs.includes('Context engineering, memoria y MCP:')&&mkdocsEs.includes(route),'ES: chapter 3.5 nav missing');
check(mkdocsEn.includes('Context Engineering, Memory & MCP:')&&mkdocsEn.includes(route),'EN: chapter 3.5 nav missing');
check(manifestEn.includes(`  - ${route}`),'EN: chapter 3.5 route missing from manifest');
check(manifestEn.includes(`  - ${visualPath}`),'EN: MCP visual missing from required_snippets');
check(prVisual.includes('node scripts/validate_context_engineering_ch5_source.mjs'),'CI: chapter 3.5 source gate not wired');
check(prVisual.includes('node scripts/validate_context_engineering_ch5_accessibility.mjs'),'CI: chapter 3.5 browser gate not wired');

const sources=[
'https://modelcontextprotocol.io/specification/2026-07-28/architecture',
'https://modelcontextprotocol.io/specification/2026-07-28/server/tools',
'https://modelcontextprotocol.io/specification/2026-07-28/server/resources',
'https://modelcontextprotocol.io/specification/2026-07-28/server/prompts',
'https://modelcontextprotocol.io/specification/2026-07-28/server/discover',
'https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning',
'https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http',
'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization',
'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations',
'https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr',
'https://modelcontextprotocol.io/specification/2026-07-28/deprecated',
'https://blog.modelcontextprotocol.io/posts/2026-07-28/',
'https://go.sdk.modelcontextprotocol.io/protocol/',
'https://github.com/modelcontextprotocol/conformance'];
for(const url of sources){check(es.includes(url),`ES missing primary source ${url}`);check(en.includes(url),`EN missing primary source ${url}`);}

const parity=[
['host, client y server no son sinónimos','host, client, and server are not synonyms'],
['Tools, resources y prompts no son tres formas','Tools, resources, and prompts are not three names'],
['Tools describen acciones, no conceden permiso','Tools describe operations; they do not grant permission'],
['Resources son datos; el host decide si entran en contexto','Resources are data; the host decides whether they enter context'],
['Prompts son contenido ejecutable para el modelo','Prompts are model-facing content'],
['2026-07-28 no hay initialize','2026-07-28 has no initialize'],
['no autentica al server','does not authenticate the server'],
['Autenticación, autorización y consentimiento','Authentication, authorization, and consent'],
['MRTR: cuando el server necesita más input','MRTR: when a server needs more input'],
['Sampling y roots','Sampling and roots'],
['reintentar una lectura no es igual que reintentar una acción','retrying a read is not the same as retrying an action'],
['usa MCP como protocolo, no como autoridad','use MCP as a protocol, not as authority']];
for(const [a,b] of parity){check(es.includes(a),`ES missing concept ${a}`);check(en.includes(b),`EN missing concept ${b}`);}

for(const [locale,text] of [['ES',es],['EN',en]]){
  for(const token of ['2026-07-28','2025-11-25','server/discover','Mcp-Session-Id','tools/list','tools/call','resources/list','resources/read','prompts/list','prompts/get','resultType = input_required','requestState','token passthrough','protocol_version','idempotency_key','serverInfo']) check(text.includes(token),`${locale}: missing contract ${token}`);
  check(text.includes('CLIENT A <-> SERVER A')&&text.includes('CLIENT B <-> SERVER B'),`${locale}: 1:1 ownership example missing`);
  check(text.includes('tool discovery ≠ authorization; tool selection ≠ consent; schema validation ≠ policy approval.'),`${locale}: tool/auth/consent boundary missing`);
  check(text.includes('HOST ≠ SERVER')&&text.includes('capability discovery ≠ authorization')&&text.includes('protocol success ≠ business success'),`${locale}: final responsibility boundary missing`);
}
check(es.includes('eliminó ese handshake y el `Mcp-Session-Id` del core moderno'),'ES: modern stateless correction missing');
check(en.includes('removed that handshake and `Mcp-Session-Id` from the modern core'),'EN: modern stateless correction missing');
check(es.includes('`serverInfo` es **self-reported**')&&es.includes('no debe usarse para decisiones de seguridad'),'ES: serverInfo caveat missing');
check(en.includes('`serverInfo` is **self-reported**')&&en.includes('should not drive security decisions'),'EN: serverInfo caveat missing');
check(es.includes('roots, sampling y logging quedaron **deprecated**'),'ES: deprecated-feature caveat missing');
check(en.includes('roots, sampling, and logging were **deprecated**'),'EN: deprecated-feature caveat missing');
check(!/^\s*-\s+.+;\s*$/m.test(en),'EN: semicolon-list anti-pattern detected');
check(!/\?\./.test(en),'EN: malformed question punctuation');

const include='{{ include_html("snippets/articulos-tecnicos/context-mcp-trust-boundaries.html") }}';
check(es.includes(include)&&en.includes(include),'ES/EN: MCP visual include missing');
for(const token of ['GOLDEN_VISUAL_CONTRACT','relationship="model->host-policy->client-b->server-b->mcp-auth->downstream-auth->external-effect','interaction="static:no-cosmetic-controls"','mobile="horizontal-scroll-preserves-host-server-trust-and-side-effect-topology"','.mt-stage{width:100%;min-width:0;max-width:1200px;margin:0 auto}','MCP ≠ confianza implícita','POLÍTICA DEL HOST','OTRA FRONTERA · SISTEMA DOWNSTREAM','2026-07-28: versión + capabilities por request']) check(snippet.includes(token),`Visual missing contract ${token}`);
check(!snippet.includes('s5v-arch-map__pipe')&&!snippet.includes('data-s5v-stepper')&&!snippet.includes('data-s5v-tabs'),'Visual: cosmetic linear/tabs pattern returned');
for(const node of ['user','model','host-policy','client-a','client-b','server-a','local-resources','server-b','mcp-auth','downstream-auth','external-effect']) check(snippet.includes(`data-node="${node}"`),`Visual missing node ${node}`);
for(const boundary of ['host','server-a','server-b','downstream','lifecycle']) check(snippet.includes(`data-boundary="${boundary}"`),`Visual missing boundary ${boundary}`);
for(const edge of ['user-policy','model-policy','policy-client-a','policy-client-b','client-a-server-a','client-b-server-b','server-b-auth','resource-back-a','server-a-input','server-b-input','server-downstream-auth','auth-effect','modern-request','legacy-initialize','server-isolation']) check(snippet.includes(`data-edge="${edge}"`),`Visual missing relationship ${edge}`);
check(snippet.includes('1:1 con server A')&&snippet.includes('1:1 con server B'),'Visual: client/server cardinality missing');
check(snippet.includes('token propio · no passthrough'),'Visual: downstream token boundary missing');
check(snippet.includes('≤ 2025-11-25: initialize · legacy'),'Visual: legacy lifecycle caveat missing');

check(mirror.trim()==='<!-- 5sigmas-canonical-mirror -->','EN: canonical mirror marker invalid');
check(i18n.source===visualPath,'EN: MCP i18n source invalid');
const bytes=Buffer.from(snippet,'utf8');const blobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`,'utf8'),bytes])).digest('hex');
check(i18n.source_blob_sha===blobSha,`EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${blobSha})`);
for(const token of ['MCP ≠ implicit trust','HOST POLICY','1:1 with server A','SERVER B · REMOTE / HTTP','DOWNSTREAM AUTH','separate token · no passthrough','EXTERNAL EFFECT','2026-07-28: version + capabilities per request','≤ 2025-11-25: initialize · legacy','Interoperability is not authority.']) check(Object.values(i18n.replacements).some(v=>String(v).includes(token)),`EN visual translation missing ${token}`);

if(failures.length){console.error(`Context engineering chapter 3.5 source gate failed (${failures.length}):`);for(const f of failures)console.error(`- ${f}`);process.exit(1);}console.log('Context engineering chapter 3.5 source gate PASS');console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
