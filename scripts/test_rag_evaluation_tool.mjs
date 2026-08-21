#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/rag-evaluation-core.js');

assert.equal(core.ratio(3, 5), 0.6);
assert.equal(core.ratio(0, 0), 0);
assert.equal(core.ratio(10, 5), 1);

const interval = core.wilson(4, 5);
assert.ok(interval.low > 0.25 && interval.low < 0.5);
assert.ok(interval.high > 0.9 && interval.high <= 1);
assert.ok(interval.low <= 0.8 && interval.high >= 0.8);

const defaults = core.evaluate({});
assert.equal(defaults.counts.relevantContexts, 4);
assert.equal(defaults.counts.contexts, 6);
assert.equal(defaults.metrics.contextRelevance, 4 / 6);
assert.equal(defaults.counts.supportedClaims, 3);
assert.equal(defaults.metrics.faithfulness, 3 / 5);
assert.equal(defaults.counts.correctClaims, 3);
assert.equal(defaults.metrics.answerCorrectness, 3 / 5);
assert.equal(defaults.metrics.referenceCoverage, 3 / 4);
assert.equal(defaults.diagnosis, 'grounding');
assert.ok(defaults.weightedScore >= 0 && defaults.weightedScore <= 1);

const perfect = core.evaluate({
  contexts: core.DEFAULT_CONTEXTS.map((x) => ({ ...x, relevant: true })),
  claims: core.DEFAULT_CLAIMS.map((x) => ({ ...x, supported: true, correct: true })),
  referenceFacts: 8,
  coveredFacts: 8,
  weights: { contextRelevance: 1, faithfulness: 1, answerCorrectness: 1, referenceCoverage: 1 }
});
assert.equal(perfect.weightedScore, 1);
assert.equal(perfect.diagnosis, 'balanced');

const retrievalFailure = core.evaluate({
  contexts: core.DEFAULT_CONTEXTS.map((x, i) => ({ ...x, relevant: i === 0 })),
  claims: core.DEFAULT_CLAIMS.map((x) => ({ ...x, supported: true, correct: true })),
  referenceFacts: 4,
  coveredFacts: 4
});
assert.equal(retrievalFailure.diagnosis, 'retrieval');

const weights = core.normalizeWeights({ contextRelevance: 10, faithfulness: 20, answerCorrectness: 30, referenceCoverage: 40 });
assert.equal(weights.contextRelevance, 0.1);
assert.equal(weights.faithfulness, 0.2);
assert.equal(weights.answerCorrectness, 0.3);
assert.equal(weights.referenceCoverage, 0.4);

const zeroWeights = core.normalizeWeights({ contextRelevance: 0, faithfulness: 0, answerCorrectness: 0, referenceCoverage: 0 });
assert.equal(zeroWeights.contextRelevance, 0);
assert.equal(zeroWeights.faithfulness, 0);
assert.equal(zeroWeights.answerCorrectness, 0);
assert.equal(zeroWeights.referenceCoverage, 0);
assert.equal(zeroWeights.normalized, false);
assert.equal(zeroWeights.sum, 0);
assert.equal(core.evaluate({ weights: { contextRelevance: 0, faithfulness: 0, answerCorrectness: 0, referenceCoverage: 0 } }).weightedScore, 0);

const encodedContexts = core.encodeFlags(core.DEFAULT_CONTEXTS, ['relevant']);
assert.deepEqual(core.decodeFlags(encodedContexts, core.DEFAULT_CONTEXTS, ['relevant']), core.DEFAULT_CONTEXTS);
const encodedClaims = core.encodeFlags(core.DEFAULT_CLAIMS, ['supported', 'correct']);
assert.deepEqual(core.decodeFlags(encodedClaims, core.DEFAULT_CLAIMS, ['supported', 'correct']), core.DEFAULT_CLAIMS);

const es = fs.readFileSync('docs/herramientas/evaluacion-rag.md', 'utf8');
const en = fs.readFileSync('locales/en/tools/rag-evaluation.md', 'utf8');
for (const source of [es, en]) {
  assert.match(source, /aclanthology\.org\/2024\.eacl-demo\.16/);
  assert.match(source, /arxiv\.org\/abs\/2311\.09476/);
  assert.match(source, /WebApplication/);
  assert.match(source, /Wilson/);
}
assert.match(es, /No es un LLM judge/);
assert.match(en, /This is not an LLM judge/);

console.log('RAG evaluation metrics, uncertainty, diagnosis, zero-weight semantics, share-state encoding and provenance passed.');
