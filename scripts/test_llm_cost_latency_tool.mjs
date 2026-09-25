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

const SNAPSHOT = pricing.updated_at;
assert.match(SNAPSHOT, /^\d{4}-\d{2}-\d{2}$/);
const ageDays = (Date.now() - Date.parse(`${SNAPSHOT}T23:59:59Z`)) / 86_400_000;
assert.ok(ageDays >= -1 && ageDays <= pricing.freshness_policy.review_interval_days, `pricing snapshot is stale: ${SNAPSHOT}`);

const presets = new Map(pricing.presets.map((preset) => [preset.id, preset]));
for (const id of [
  'openai-gpt-6-astra','openai-gpt-6-sol','openai-gpt-6-luna','openai-gpt-5-6-terra',
  'anthropic-claude-opus-5-5','anthropic-claude-sonnet-5','google-gemini-3-8-flash','spacexai-grok-4-7'
]) assert.ok(presets.has(id), `${id}: current preset missing`);

const sonnet5 = presets.get('anthropic-claude-sonnet-5');
const gemini38 = presets.get('google-gemini-3-8-flash');
const sol = presets.get('openai-gpt-6-sol');
const luna = presets.get('openai-gpt-6-luna');
const astra = presets.get('openai-gpt-6-astra');
const opus = presets.get('anthropic-claude-opus-5-5');
const grok = presets.get('spacexai-grok-4-7');

assert.deepEqual([sonnet5.input_usd_per_million, sonnet5.cached_input_usd_per_million, sonnet5.output_usd_per_million], [2, 0.2, 10]);
assert.equal(sonnet5.future_price, undefined, 'cancelled Sonnet 5 price increase must not remain scheduled');
assert.deepEqual([astra.input_usd_per_million, astra.cached_input_usd_per_million, astra.output_usd_per_million], [10, 1, 50]);
assert.deepEqual([sol.input_usd_per_million, sol.cached_input_usd_per_million, sol.output_usd_per_million], [2, 0.2, 10]);
assert.deepEqual([luna.input_usd_per_million, luna.cached_input_usd_per_million, luna.output_usd_per_million], [0.1, 0.01, 0.5]);
assert.deepEqual([opus.input_usd_per_million, opus.cached_input_usd_per_million, opus.output_usd_per_million], [4, 0.2, 20]);
assert.deepEqual([grok.input_usd_per_million, grok.cached_input_usd_per_million, grok.output_usd_per_million], [2, 0.5, 6]);

{
  const current = resolvePricing(gemini38, '2026-09-25T12:00:00Z');
  close(current.input_usd_per_million, 0.75, 1e-12, 'Gemini 3.8 introductory input');
  close(current.cached_input_usd_per_million, 0.075, 1e-12, 'Gemini 3.8 introductory cache');
  close(current.output_usd_per_million, 3.75, 1e-12, 'Gemini 3.8 introductory output');
  const future = resolvePricing(gemini38, '2027-01-01T00:00:00Z');
  close(future.input_usd_per_million, 1.5, 1e-12, 'Gemini 3.8 standard input');
  close(future.cached_input_usd_per_million, 0.15, 1e-12, 'Gemini 3.8 standard cache');
  close(future.output_usd_per_million, 7.5, 1e-12, 'Gemini 3.8 standard output');
  assert.equal(future.active_price_effective_from, '2027-01-01');
}
{
  const long = calculate({ ...base, inputTokens: 300_000, outputTokens: 1_000, inputPrice: 2, cachedInputPrice: 0.2, outputPrice: 10 }, sol);
  assert.equal(long.pricing.longContextActive, true);
  close(long.pricing.inputRate, 4, 1e-12, 'GPT-6 Sol long input');
  close(long.pricing.cachedInputRate, 0.4, 1e-12, 'GPT-6 Sol long cache');
  close(long.pricing.outputRate, 15, 1e-12, 'GPT-6 Sol long output');
}
{
  const long = calculate({ ...base, inputTokens: 300_000, outputTokens: 1_000, inputPrice: 2, cachedInputPrice: 0.5, outputPrice: 6 }, grok);
  assert.equal(long.pricing.longContextActive, true);
  close(long.pricing.inputRate, 4, 1e-12, 'Grok 4.7 long input');
  close(long.pricing.cachedInputRate, 1, 1e-12, 'Grok 4.7 long cache');
  close(long.pricing.outputRate, 12, 1e-12, 'Grok 4.7 long output');
}

assert.equal(pricing.presets.length, 8);
assert.equal(pricing.freshness_policy.review_interval_days, 14);
for (const preset of pricing.presets) {
  assert.match(preset.id, /^[a-z0-9-]+$/);
  assert.ok(preset.provider && preset.model);
  assert.ok(Number.isFinite(preset.input_usd_per_million));
  assert.ok(Number.isFinite(preset.output_usd_per_million));
  assert.ok(preset.cached_input_usd_per_million === null || Number.isFinite(preset.cached_input_usd_per_million));
  assert.match(preset.source?.url || '', /^https:\/\//);
  const sourceAge = (Date.parse(`${SNAPSHOT}T00:00:00Z`) - Date.parse(`${preset.source.verified_on}T00:00:00Z`)) / 86_400_000;
  assert.ok(sourceAge >= 0 && sourceAge <= pricing.freshness_policy.review_interval_days, `${preset.id}: source verification is stale`);
}
for (const retired of ['openai-gpt-5-6-sol','openai-gpt-5-6-luna','google-gemini-3-7-flash','google-gemini-3-6-flash']) {
  assert.equal(presets.has(retired), false, `${retired}: superseded preset remains in current catalog`);
}
assert.equal(pricing.release_coverage.reviewed_through, SNAPSHOT);

console.log(`LLM cost/latency math passed: ${pricing.presets.length} current sourced presets; pricing freshness, cache, scheduled pricing, long-context, latency and capacity verified.`);
