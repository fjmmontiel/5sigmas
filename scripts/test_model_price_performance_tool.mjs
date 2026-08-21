#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const api = require(path.join(root, 'docs/assets/javascripts/tools/model-price-performance-core.js'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/assets/data/tools/model-price-performance.json'), 'utf8'));

const close = (actual, expected, epsilon = 1e-10, label = '') => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
};

assert.equal(data.schema_version, 1);
assert.equal(data.freshness_policy?.review_interval_days, 14);
assert.ok(data.methodology?.benchmark?.includes('Artificial Analysis'));
assert.ok(data.models.length >= 5, 'expected at least five rigorously sourced comparable configurations');

const ids = new Set();
for (const model of data.models) {
  assert.match(model.id, /^[a-z0-9-]+$/);
  assert.ok(!ids.has(model.id), `${model.id}: duplicate id`);
  ids.add(model.id);
  assert.ok(model.provider && model.model && model.variant, `${model.id}: identity fields required`);
  assert.ok(Number(model.context_tokens) > 0, `${model.id}: positive context required`);
  assert.ok(Number(model.input_usd_per_million) >= 0, `${model.id}: input price required`);
  assert.ok(Number(model.output_usd_per_million) >= 0, `${model.id}: output price required`);
  assert.ok(Number(model.intelligence_index) > 0, `${model.id}: intelligence measurement required`);
  assert.ok(Number(model.output_tokens_per_second) > 0, `${model.id}: output speed required`);
  assert.ok(Number(model.ttft_seconds) > 0, `${model.id}: TTFT required`);
  for (const key of ['specs_pricing', 'benchmark']) {
    const source = model.sources?.[key];
    assert.match(source?.url || '', /^https:\/\//, `${model.id}: ${key} URL required`);
    assert.match(source?.verified_on || '', /^2026-\d{2}-\d{2}$/, `${model.id}: ${key} verification date required`);
  }
}

const byId = new Map(data.models.map((model) => [model.id, model]));
const opus = byId.get('anthropic-claude-opus-5-max');
const sol = byId.get('openai-gpt-5-6-sol-max');
const terra = byId.get('openai-gpt-5-6-terra-max');
const luna = byId.get('openai-gpt-5-6-luna-max');
const gemini = byId.get('google-gemini-3-6-flash-high');
for (const model of [opus, sol, terra, luna, gemini]) assert.ok(model, 'required comparison model missing');

{
  const current = api.resolvePricing(gemini, '2026-08-21T12:00:00Z');
  close(current.input, 0.75, 1e-12, 'Gemini current input');
  close(current.output, 3.75, 1e-12, 'Gemini current output');
  assert.equal(current.effectiveFrom, null);
  const future = api.resolvePricing(gemini, '2027-01-01T00:00:00Z');
  close(future.input, 1.5, 1e-12, 'Gemini future input');
  close(future.output, 7.5, 1e-12, 'Gemini future output');
  assert.equal(future.effectiveFrom, '2027-01-01');
}

{
  const long = api.calculateScenarioCost(sol, 300_000, 1_000, '2026-08-21T12:00:00Z');
  assert.equal(long.longContextActive, true);
  close(long.inputRate, 10, 1e-12, 'Sol long-context input rate');
  close(long.outputRate, 45, 1e-12, 'Sol long-context output rate');
  close(long.costPerRequest, 3.045, 1e-12, 'Sol long-context scenario cost');
}

const rows = api.enrichModels(data.models, { inputTokens: 4_000, outputTokens: 500 }, '2026-08-21T12:00:00Z');
const row = (id) => rows.find((item) => item.id === id);
close(row(opus.id).scenario.costPerRequest, 0.0325, 1e-12, 'Opus default cost');
close(row(sol.id).scenario.costPerRequest, 0.035, 1e-12, 'Sol default cost');
close(row(terra.id).scenario.costPerRequest, 0.014, 1e-12, 'Terra default cost');
close(row(luna.id).scenario.costPerRequest, 0.0014, 1e-12, 'Luna default cost');
close(row(gemini.id).scenario.costPerRequest, 0.004875, 1e-12, 'Gemini default cost');

const frontier = rows.filter((item) => item.on_frontier).map((item) => item.id).sort();
assert.deepEqual(frontier, [opus.id, terra.id, luna.id].sort(), 'default price/intelligence frontier changed unexpectedly');

const highQuality = api.filterModels(rows, { minIntelligence: 60 });
assert.deepEqual(highQuality.map((item) => item.id).sort(), [opus.id, sol.id].sort());

const lowTtft = api.filterModels(rows, { maxTtftSeconds: 30 });
assert.deepEqual(lowTtft.map((item) => item.id), [gemini.id]);

const sortedCost = api.sortModels(rows, 'cost');
assert.equal(sortedCost[0].id, luna.id);
const summary = api.summary(rows);
assert.equal(summary.smartest.id, opus.id);
assert.equal(summary.cheapest.id, luna.id);
assert.equal(summary.fastest.id, gemini.id);
assert.equal(summary.lowestLatency.id, gemini.id);

console.log(`Model price/performance tests passed: ${data.models.length} sourced configurations; effective pricing, long-context cost, filters, sorting and Pareto frontier verified.`);
