import test from 'node:test';
import assert from 'node:assert/strict';
import { bestPassage, groundedMessages, normalizePrefix, projectKnowledge,
  rankLexical, safeSourceUrl, topVectorMatches, uniqueMatches } from '../docs/assets/javascripts/semantic-search-core.mjs';

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
