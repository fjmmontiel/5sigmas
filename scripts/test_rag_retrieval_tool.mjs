#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/rag-retrieval-core.js');

const chunked = core.chunkStats(1000, 300, 100);
assert.equal(chunked.stride, 200);
assert.equal(chunked.chunks, 5);
assert.equal(chunked.indexedTokens, 1400);
assert.equal(chunked.duplicatedTokens, 400);
assert.equal(chunked.duplicationRatio, 0.4);

const noOverlap = core.chunkStats(1000, 300, 0);
assert.equal(noOverlap.duplicatedTokens, 0);
assert.equal(noOverlap.indexedTokens, 1000);

const base = core.DEFAULT_RESULTS;
const metrics = core.evaluate(base, { k: 5, relevanceThreshold: 1, totalRelevant: 8 });
assert.equal(metrics.relevantRetrieved, 4);
assert.equal(metrics.precision, 0.8);
assert.equal(metrics.recall, 0.5);
assert.equal(metrics.mrr, 1);
assert.ok(metrics.ndcg > 0 && metrics.ndcg <= 1);

const reranked = core.rerank(base, 8);
assert.equal(reranked[0].id, 'A');
assert.equal(reranked[1].id, 'D');
assert.equal(reranked[2].id, 'G');
assert.ok(core.ndcgAtK(reranked, 5) > core.ndcgAtK(base, 5));
assert.equal(core.mrrAtK([{ grade: 0 }, { grade: 0 }, { grade: 1 }], 2, 1), 0);
assert.equal(core.mrrAtK([{ grade: 0 }, { grade: 0 }, { grade: 1 }], 3, 1), 1 / 3);
assert.equal(core.ndcgAtK([{ grade: 0 }, { grade: 0 }], 2), 0);
assert.equal(core.recallAtK([{ grade: 0 }], 1, 0, 1), 0);

const es = fs.readFileSync('docs/herramientas/laboratorio-recuperacion-rag.md', 'utf8');
const en = fs.readFileSync('locales/en/tools/rag-retrieval-lab.md', 'utf8');
for (const source of [es, en]) {
  assert.match(source, /aclanthology\.org\/2020\.emnlp-main\.550/);
  assert.match(source, /arxiv\.org\/abs\/2005\.11401/);
  assert.match(source, /arxiv\.org\/abs\/2104\.08663/);
  assert.match(source, /dl\.acm\.org\/doi\/10\.1145\/582415\.582418/);
  assert.match(source, /WebApplication/);
}
assert.match(es, /No convierte chunk size u overlap en una supuesta mejora de relevancia/);
assert.match(en, /does not turn chunk size or overlap into a supposed relevance gain/);

console.log('RAG retrieval lab math, reranking boundaries, chunk footprint and provenance passed.');
