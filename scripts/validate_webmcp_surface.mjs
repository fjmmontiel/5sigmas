#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`WebMCP validation failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

const esCatalog = JSON.parse(read('docs/agent-tools.json'));
const enCatalog = JSON.parse(read('locales/en/agent-tools.json'));
const runtime = read('docs/assets/javascripts/agent-webmcp.js');
const loader = read('docs/javascripts/external-links.js');
const localeManifest = read('tools/locale-en.yml');

assert(esCatalog.schema_version === 1, 'catalog schema_version must be 1');
assert(Array.isArray(esCatalog.tools), 'catalog tools must be an array');
assert(esCatalog.tools.length === 18, `expected 18 tools, found ${esCatalog.tools.length}`);
assert(JSON.stringify(esCatalog) === JSON.stringify(enCatalog), 'ES and EN catalog copies must be identical');

const ids = new Set();
const esPaths = new Set();
const enPaths = new Set();
for (const tool of esCatalog.tools) {
  assert(tool.id && !ids.has(tool.id), `duplicate or missing tool id: ${tool.id}`);
  ids.add(tool.id);
  assert(tool.name && tool.summary && tool.category, `tool ${tool.id} lacks metadata`);
  assert(Array.isArray(tool.audiences) && tool.audiences.length > 0, `tool ${tool.id} lacks audiences`);
  assert(tool.paths?.es?.startsWith('/herramientas/'), `tool ${tool.id} lacks Spanish path`);
  assert(tool.paths?.en?.startsWith('/en/tools/'), `tool ${tool.id} lacks English path`);
  assert(!esPaths.has(tool.paths.es), `duplicate Spanish path: ${tool.paths.es}`);
  assert(!enPaths.has(tool.paths.en), `duplicate English path: ${tool.paths.en}`);
  esPaths.add(tool.paths.es);
  enPaths.add(tool.paths.en);
}

for (const required of [
  'document.modelContext',
  'registerTool',
  'AbortController',
  '5sigmas_discover_tools',
  '5sigmas_search_library',
  '5sigmas_page_context',
  '5sigmas_run_',
  '[data-field]',
  '[data-output]',
  'search/search_index.json',
  'agent-tools.json',
  'related_content',
  'structuredContent'
]) {
  assert(runtime.includes(required), `runtime is missing ${required}`);
}
assert(!runtime.includes('navigator.modelContext'), 'runtime must use document.modelContext');
assert(loader.includes('/assets/javascripts/agent-webmcp.js'), 'global loader is missing');
assert(loader.includes('data-s5-agent-runtime') || loader.includes('s5AgentRuntime'), 'loader guard is missing');
assert(/published_files:\s*[\s\S]*- agent-tools\.json/.test(localeManifest), 'English locale does not publish agent-tools.json');

console.log(`WebMCP source validation passed: ${esCatalog.tools.length} bilingual tools plus site-wide discovery, search and page context.`);
