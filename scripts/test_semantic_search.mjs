import test from 'node:test';
import assert from 'node:assert/strict';
import { bestPassage, bestSectionPassage, expandKnowledgeFragments, groundedMessages,
  normalizePrefix, projectKnowledge, rankLexical, safeSourceUrl, sourceLanguageMatches,
  topVectorMatches, uniqueMatches } from '../docs/assets/javascripts/semantic-search-core.mjs';

const origin = 'https://5sigmas.com';
const entry = (id, title, text) => ({
  id, locale: 'es', kind: 'text', title, text, search_text: title + ' ' + text,
  url: origin + '/temas/' + id + '/',
});

test('normalized Matryoshka prefixes remain unit vectors', () => {
  const vector = normalizePrefix([3, 4, 7], 2);
  assert.ok(Math.abs(vector[0] - 0.6) < 1e-6);
  assert.ok(Math.abs(vector[1] - 0.8) < 1e-6);
  assert.throws(() => normalizePrefix([0, 0], 2));
  assert.throws(() => normalizePrefix([NaN, 2], 2));
});

test('source links are canonical same-origin HTTPS only', () => {
  assert.equal(safeSourceUrl('/series/test/', origin), origin + '/series/test/');
  assert.equal(safeSourceUrl('https://evil.example/a', origin), null);
  assert.equal(safeSourceUrl('http://5sigmas.com/x', origin), null);
  assert.equal(safeSourceUrl('javascript:alert(1)', origin), null);
});

test('knowledge records preserve canonical visual deep links', () => {
  const result = projectKnowledge({
    id: 'visual-01', kind: 'animation', title: 'Attention', url: origin + '/visuales/attention/#demo',
    description: 'Interactive attention diagram', asset_url: '/assets/images/x.webp',
  }, 'es', origin);
  assert.equal(result.kind, 'animation');
  assert.equal(result.url, origin + '/visuales/attention/#demo');
  assert.equal(result.embedding_modalities[0], 'text');
});

test('candidate selection normalizes accents and avoids duplicates', () => {
  const a = entry('uno', 'Evaluación de atención', 'Métricas para agentes');
  const b = entry('dos', 'Modelo de inferencia', 'Precio');
  assert.equal(rankLexical([b, a], 'atencion evaluacion')[0].record.id, 'uno');
  assert.equal(uniqueMatches([{record:a,score:1},{record:a,score:0.5}], 8).length, 1);
});

test('vector scan filters locale and validates shape', () => {
  const es = entry('es','A','x'), en = {...entry('en','B','x'),locale:'en'};
  const vec = new Float32Array([1,0,0,1]);
  assert.equal(topVectorMatches([es,en],vec,new Float32Array([0,1]),2,2,'en')[0].record.id,'en');
  assert.throws(()=>topVectorMatches([es,en],new Float32Array([0]),new Float32Array([1,0]),2));
});

test('answer prompts include only bounded, verifiable evidence', () => {
  const r = entry('foo','Title','Grounded factual explanation');
  const messages = groundedMessages('explain foo',[{record:r}], 'en',origin);
  assert.match(messages[1].content,/\[1\] Title/);
  assert.match(messages[0].content,/untrusted data/);
  assert.throws(()=>groundedMessages('x',[{record:{...r,url:'https://evil.example/'}}],'es',origin));
});

test('passage selection favors specific query matches', () => {
  const markdown = '# Intro\n\nGeneral site introduction has many technical words.\n\n## Details\n\nContinuous batching increases inference throughput by sharing GPU compute.';
  assert.match(bestPassage(markdown, 'continuous batching inference'),/Continuous batching/);
});

test('rendered public heading IDs generate exact same-language deep links', () => {
  const page = { id:'article-1', kind:'engineering', title:'Production engineering',
    url:'https://5sigmas.com/en/series/inference/', description:'Inference serving',
    headings:[{id:'continuous-batching',text:'Continuous batching'},
      {id:'kv-cache',text:'KV cache management'},{id:'',text:'Invalid anchor'}] };
  const fragments = expandKnowledgeFragments(page,'en',origin);
  assert.equal(fragments.length,3);
  assert.equal(fragments[1].url,'https://5sigmas.com/en/series/inference/#continuous-batching');
  assert.equal(fragments[2].heading,'KV cache management');
  assert.ok(fragments.every(f=>sourceLanguageMatches(f,'en',origin)));
  assert.equal(sourceLanguageMatches(fragments[1],'es',origin),false);
  const es = { ...fragments[1], locale:'es', url:'https://5sigmas.com/series/inference/#continuous-batching' };
  assert.ok(sourceLanguageMatches(es,'es',origin));
  assert.equal(sourceLanguageMatches(es,'en',origin),false);
});

test('a heading-specific match opens its own section and uses its own passage', () => {
  const page={ id:'ai-2',kind:'concept',url:origin+'/temas/llms/',title:'AI systems',
    headings:[{id:'cache-paging',text:'KV cache paging'}] };
  const records=expandKnowledgeFragments(page,'es',origin);
  const ranked=rankLexical(records,'cache paging',2);
  assert.equal(ranked[0].record.url,origin+'/temas/llms/#cache-paging');
  const md='# Introduction\n\nGlobal overview explains the foundation in detail.\n\n## KV cache paging\n\nPaged attention stores blocks of key-value tensors without contiguous allocations.\n\n## Other topic\n\nThis unrelated section describes voice agents and telephone networks.';
  const section=bestSectionPassage(md,'KV cache paging','key-value tensors');
  assert.match(section,/key-value tensors/);
  assert.doesNotMatch(section,/voice agents/);
});
