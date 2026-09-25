#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const { calculate, resolvePricing } = require(path.join(root, 'docs/assets/javascripts/tools/llm-cost-latency-core.js'));
const pricing = JSON.parse(fs.readFileSync(path.join(root, 'docs/assets/data/tools/llm-pricing.json'), 'utf8'));

const close = (actual, expected, epsilon = 1e-9, label = '') => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
};

const base = {
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheHitRate: 0,
  requestsPerMinute: 0,
  activeHoursPerDay: 0,
  daysPerMonth: 0,
  ttftMs: 0,
  tokensPerSecond: 100,
  concurrency: 0,
  monthlyBudgetUsd: 0,
  latencyTargetMs: 0,
  inputPrice: 2,
  cachedInputPrice: 0.2,
  outputPrice: 12
};

{
  const result = calculate(base, null);
  close(result.cost.costPerRequest, 14, 1e-12, 'uncached request cost');
}

{
  const result = calculate({ ...base, outputTokens: 0, cacheHitRate: 50 }, null);
  close(result.cost.costPerRequest, 1.1, 1e-12, '50% cache request cost');
}

{
  const result = calculate({ ...base, outputTokens: 0, cacheHitRate: 140 }, null);
  close(result.normalized.cacheHitRate, 100, 1e-12, 'cache rate clamp');
  close(result.cost.costPerRequest, 0.2, 1e-12, '100% cache request cost');
}

{
  const longContextPricing = {
    input_usd_per_million: 2,
    cached_input_usd_per_million: 0.2,
    output_usd_per_million: 12,
    long_context: {
      threshold_input_tokens: 272_000,
      input_multiplier: 2,
      output_multiplier: 1.5
    }
  };
  const result = calculate({
    ...base,
    inputTokens: 300_000,
    outputTokens: 1_000,
    inputPrice: 2,
    cachedInputPrice: 0.2,
    outputPrice: 12
  }, longContextPricing);
  assert.equal(result.pricing.longContextActive, true);
  close(result.cost.costPerRequest, 1.218, 1e-12, 'long-context request cost');
}

{
  const result = calculate({
    ...base,
    inputTokens: 4_000,
    outputTokens: 500,
    cacheHitRate: 50,
    requestsPerMinute: 10,
    activeHoursPerDay: 8,
    daysPerMonth: 22,
    ttftMs: 650,
    tokensPerSecond: 60,
    concurrency: 3,
    monthlyBudgetUsd: 1_500,
    latencyTargetMs: 10_000
  }, null);
  const expectedResponseMs = 650 + (499 / 60) * 1000;
  close(result.latency.responseTimeMs, expectedResponseMs, 1e-9, 'completion latency');
  close(result.capacity.requiredConcurrency, (10 / 60) * (expectedResponseMs / 1000), 1e-12, 'Little law concurrency');
  assert.equal(result.capacity.enoughConcurrency, true);
  assert.equal(result.latency.withinTarget, true);
  assert.equal(result.cost.requestsPerMonth, 105_600);
}

const presets = new Map(pricing.presets.map((preset) => [preset.id, preset]));
const sonnet5 = presets.get('anthropic-claude-sonnet-5');
const astra = presets.get('openai-gpt-6-astra');
const sol6 = presets.get('openai-gpt-6-sol');
const luna6 = presets.get('openai-gpt-6-luna');
const sol56 = presets.get('openai-gpt-5-6-sol');
const gemini38 = presets.get('google-gemini-3-8-flash');

for (const [label, preset] of [
  ['Claude Sonnet 5', sonnet5], ['GPT-6 Astra', astra], ['GPT-6 Sol', sol6],
  ['GPT-6 Luna', luna6], ['GPT-5.6 Sol', sol56], ['Gemini 3.8 Flash', gemini38]
]) assert.ok(preset, `${label} preset required`);

assert.deepEqual([sonnet5.input_usd_per_million, sonnet5.cached_input_usd_per_million, sonnet5.output_usd_per_million], [2, 0.2, 10]);
assert.equal(sonnet5.future_price, undefined, 'Cancelled Sonnet 5 September increase must not remain encoded');
assert.deepEqual([astra.input_usd_per_million, astra.cached_input_usd_per_million, astra.output_usd_per_million], [10, 1, 50]);
assert.deepEqual([sol6.input_usd_per_million, sol6.cached_input_usd_per_million, sol6.output_usd_per_million], [2, 0.2, 10]);
assert.deepEqual([luna6.input_usd_per_million, luna6.cached_input_usd_per_million, luna6.output_usd_per_million], [0.1, 0.01, 0.5]);
assert.deepEqual([sol56.input_usd_per_million, sol56.cached_input_usd_per_million, sol56.output_usd_per_million], [4, 0.4, 20]);

{
  const current = resolvePricing(gemini38, '2026-09-25T12:00:00Z');
  close(current.input_usd_per_million, 0.75, 1e-12, 'Gemini 3.8 promotional input rate');
  close(current.cached_input_usd_per_million, 0.075, 1e-12, 'Gemini 3.8 promotional cache rate');
  close(current.output_usd_per_million, 3.75, 1e-12, 'Gemini 3.8 promotional output rate');

  const future = resolvePricing(gemini38, '2027-01-01T00:00:00Z');
  close(future.input_usd_per_million, 1.5, 1e-12, 'Gemini 3.8 2027 input rate');
  close(future.cached_input_usd_per_million, 0.15, 1e-12, 'Gemini 3.8 2027 cache rate');
  close(future.output_usd_per_million, 7.5, 1e-12, 'Gemini 3.8 2027 output rate');
  assert.equal(future.active_price_effective_from, '2027-01-01');
}

assert.equal(pricing.schema_version, 3);
assert.equal(pricing.updated_at, '2026-09-25');
assert.equal(pricing.freshness_policy?.review_interval_days, 7, 'pricing freshness policy must be explicit');
assert.ok(pricing.release_coverage?.corrections?.some((row) => row.model === 'Claude Sonnet 5'));
assert.ok(pricing.release_coverage?.removed?.some((row) => row.model === 'Gemini 3.6 Flash'));
assert.equal(presets.has('google-gemini-3-6-flash'), false, 'Previous-generation Gemini 3.6 preset must be retired');
assert.ok(pricing.presets.length >= 10, 'expected a current, sourced pricing preset set');

for (const preset of pricing.presets) {
  assert.match(preset.id, /^[a-z0-9-]+$/);
  assert.ok(preset.provider && preset.model, `${preset.id}: provider/model required`);
  assert.ok(Number.isFinite(preset.input_usd_per_million), `${preset.id}: input rate required`);
  assert.ok(Number.isFinite(preset.output_usd_per_million), `${preset.id}: output rate required`);
  assert.ok(preset.cached_input_usd_per_million === null || Number.isFinite(preset.cached_input_usd_per_million), `${preset.id}: cache-read rate must be null or numeric`);
  assert.match(preset.source?.url || '', /^https:\/\//, `${preset.id}: primary-source URL required`);
  assert.equal(preset.source?.verified_on, pricing.updated_at, `${preset.id}: verification date must match current pricing snapshot`);
  if (preset.future_price) {
    assert.match(preset.future_price.effective_from || '', /^20\d{2}-\d{2}-\d{2}$/, `${preset.id}: future effective date required`);
    assert.ok(Number.isFinite(preset.future_price.input_usd_per_million), `${preset.id}: future input rate required`);
    assert.ok(Number.isFinite(preset.future_price.output_usd_per_million), `${preset.id}: future output rate required`);
    if (preset.cached_input_usd_per_million !== null) {
      assert.ok(Number.isFinite(preset.future_price.cached_input_usd_per_million), `${preset.id}: future cache-read rate required when current cache-read rate is modelled`);
    }
  }
}
console.log(`LLM cost/latency math passed: ${pricing.presets.length} sourced presets; cache, scheduled pricing, long-context, latency and capacity cases verified.`);
