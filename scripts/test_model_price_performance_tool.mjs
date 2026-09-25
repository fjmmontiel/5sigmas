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

const SNAPSHOT = data.updated_at;
assert.match(SNAPSHOT, /^\\d{4}-\\d{2}-\\d{2}$/, 'dataset snapshot must be YYYY-MM-DD');
const wallAgeDays = (Date.now() - Date.parse(`${SNAPSHOT}T23:59:59Z`)) / 86_400_000;
assert.ok(wallAgeDays >= -1 && wallAgeDays <= data.freshness_policy.review_interval_days, `dataset snapshot is outside freshness window: ${SNAPSHOT}`);
const close = (actual, expected, epsilon = 1e-10, label = '') => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
};

assert.equal(data.schema_version, 2);
assert.ok(data.freshness_policy?.review_interval_days <= 7);
assert.equal(data.freshness_policy?.performance_review_interval_days, 1);
assert.ok(data.methodology?.benchmark?.includes('Artificial Analysis Intelligence Index v4.3.2'));
assert.equal(data.release_coverage?.reviewed_through, SNAPSHOT);
assert.match(data.release_coverage?.source?.url || '', /^https:\/\/artificialanalysis\.ai\/models\/releases/);
assert.ok(data.models.length >= 16, 'expected the refreshed current comparison set');

for (const requiredRelease of [
  'Claude Opus 5.5', 'GPT-6 Sol', 'GPT-6 Luna', 'GPT-6 Astra', 'Grok 4.7',
  'Gemini 3.8 Flash', 'DeepSeek V4.1 Flash', 'Qwen3.8 Max (0902)',
  'Qwen3.8-Flash-Next', 'Muse Spark 1.3', 'MiMo-V2.6-Pro', 'Step 5 Preview',
  'GLM 5.3 Flash', 'Claude Fable 5.1'
]) {
  assert.ok(data.release_coverage.included_release_names.includes(requiredRelease), `${requiredRelease}: release coverage missing`);
}

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
    const ageDays = (Date.parse(`${SNAPSHOT}T00:00:00Z`) - Date.parse(`${source.verified_on}T00:00:00Z`)) / 86_400_000;
    assert.ok(ageDays >= 0 && ageDays <= data.freshness_policy.review_interval_days, `${model.id}: ${key} verification is stale`);
  }
  const performanceAgeDays = (Date.parse(`${SNAPSHOT}T00:00:00Z`) - Date.parse(`${model.sources.benchmark.performance_snapshot_on}T00:00:00Z`)) / 86_400_000;
  assert.ok(performanceAgeDays >= 0 && performanceAgeDays <= data.freshness_policy.performance_review_interval_days, `${model.id}: performance snapshot is stale`);
  assert.equal(model.sources.benchmark.index_family, 'Artificial Analysis Intelligence Index v4.3.2');
}

for (const retiredId of [
  'anthropic-claude-opus-5-max',
  'openai-gpt-5-6-sol-max',
  'openai-gpt-5-6-luna-max'
]) {
  assert.ok(!ids.has(retiredId), `${retiredId}: superseded row must not remain in current chart`);
}

const byId = new Map(data.models.map((model) => [model.id, model]));
const opus = byId.get('anthropic-claude-opus-5-5-xhigh');
const astra = byId.get('openai-gpt-6-astra-max');
const sol = byId.get('openai-gpt-6-sol-max');
const luna = byId.get('openai-gpt-6-luna-max');
const gemini = byId.get('google-gemini-3-8-flash-high');
const grok = byId.get('spacexai-grok-4-7-high');
const deepseek = byId.get('deepseek-v4-1-flash-max');
for (const model of [opus, astra, sol, luna, gemini, grok, deepseek]) assert.ok(model, 'required refreshed comparison model missing');

assert.deepEqual([opus.input_usd_per_million, opus.output_usd_per_million], [4, 20]);
assert.deepEqual([astra.input_usd_per_million, astra.output_usd_per_million], [10, 50]);
assert.deepEqual([sol.input_usd_per_million, sol.output_usd_per_million], [2, 10]);
assert.deepEqual([luna.input_usd_per_million, luna.output_usd_per_million], [0.1, 0.5]);
assert.deepEqual([gemini.input_usd_per_million, gemini.output_usd_per_million], [0.75, 3.75]);
assert.deepEqual([grok.input_usd_per_million, grok.output_usd_per_million], [2, 6]);
assert.deepEqual([deepseek.input_usd_per_million, deepseek.output_usd_per_million], [0.3, 1.2]);

{
  const current = api.resolvePricing(gemini, '2026-09-24T12:00:00Z');
  close(current.input, 0.75, 1e-12, 'Gemini current input');
  close(current.output, 3.75, 1e-12, 'Gemini current output');
  assert.equal(current.effectiveFrom, null);
  const future = api.resolvePricing(gemini, '2027-01-01T00:00:00Z');
  close(future.input, 1.5, 1e-12, 'Gemini future input');
  close(future.output, 7.5, 1e-12, 'Gemini future output');
  assert.equal(future.effectiveFrom, '2027-01-01');
}

{
  const long = api.calculateScenarioCost(sol, 300_000, 1_000, '2026-09-24T12:00:00Z');
  assert.equal(long.longContextActive, true);
  close(long.inputRate, 4, 1e-12, 'Sol long-context input rate');
  close(long.outputRate, 15, 1e-12, 'Sol long-context output rate');
  close(long.costPerRequest, 1.215, 1e-12, 'Sol long-context scenario cost');
}
{
  const long = api.calculateScenarioCost(grok, 300_000, 1_000, '2026-09-24T12:00:00Z');
  assert.equal(long.longContextActive, true);
  close(long.inputRate, 4, 1e-12, 'Grok long-context input rate');
  close(long.outputRate, 12, 1e-12, 'Grok long-context output rate');
}

const rows = api.enrichModels(data.models, { inputTokens: 4_000, outputTokens: 500 }, '2026-09-24T12:00:00Z');
assert.equal(rows.length, data.models.length);
close(rows.find((row) => row.id === luna.id).scenario.costPerRequest, 0.00065, 1e-12, 'Luna default cost');
close(rows.find((row) => row.id === deepseek.id).scenario.costPerRequest, 0.0018, 1e-12, 'DeepSeek default cost');

const frontier = rows.filter((item) => item.on_frontier);
assert.ok(frontier.length >= 2, 'expected a non-trivial Pareto frontier');
for (const candidate of frontier) {
  const dominated = rows.some((other) => other.id !== candidate.id
    && Number(other.intelligence_index) >= Number(candidate.intelligence_index)
    && Number(other.scenario.costPerRequest) <= Number(candidate.scenario.costPerRequest)
    && (Number(other.intelligence_index) > Number(candidate.intelligence_index)
      || Number(other.scenario.costPerRequest) < Number(candidate.scenario.costPerRequest)));
  assert.equal(dominated, false, `${candidate.id}: frontier member is dominated`);
}

const highQuality = api.filterModels(rows, { minIntelligence: 50 });
assert.ok(highQuality.length >= 3);
assert.ok(highQuality.every((row) => row.intelligence_index >= 50));

const lowTtft = api.filterModels(rows, { maxTtftSeconds: 3 });
assert.ok(lowTtft.length >= 3);
assert.ok(lowTtft.every((row) => row.ttft_seconds <= 3));

const summary = api.summary(rows);
assert.equal(summary.smartest.intelligence_index, Math.max(...rows.map((row) => Number(row.intelligence_index))));
assert.equal(summary.cheapest.scenario.costPerRequest, Math.min(...rows.map((row) => Number(row.scenario.costPerRequest))));
assert.equal(summary.fastest.output_tokens_per_second, Math.max(...rows.map((row) => Number(row.output_tokens_per_second))));
assert.equal(summary.lowestLatency.ttft_seconds, Math.min(...rows.map((row) => Number(row.ttft_seconds)));

const excluded = new Map((data.release_coverage.reviewed_not_charted || []).map((row) => [row.model, row.reason]));
assert.match(excluded.get('DeepSeek V4 Flash Vision') || '', /Superseded/i);
assert.match(excluded.get('Grok 4.6') || '', /Superseded/i);
assert.ok(excluded.size >= 25, 'release coverage ledger should record every reviewed-but-not-charted release');

console.log(`Model price/performance tests passed: ${data.models.length} current configurations; v4.3.2 provenance, release coverage, pricing rules, filters, sorting and Pareto frontier verified.`);
