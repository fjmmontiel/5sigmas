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
const gemini36 = presets.get('google-gemini-3-6-flash');
const gemini37 = presets.get('google-gemini-3-7-flash');
const gemini35Lite = presets.get('google-gemini-3-5-flash-lite');

assert.ok(sonnet5, 'Claude Sonnet 5 preset required');
assert.ok(gemini36, 'Gemini 3.6 Flash preset required');
assert.ok(gemini37, 'Gemini 3.7 Flash preset required');
assert.ok(gemini35Lite, 'Gemini 3.5 Flash-Lite preset required');

{
  const active = resolvePricing(sonnet5, '2026-08-21T12:00:00Z');
  close(active.input_usd_per_million, 2, 1e-12, 'Sonnet 5 introductory input rate');
  close(active.cached_input_usd_per_million, 0.2, 1e-12, 'Sonnet 5 introductory cache-read rate');
  close(active.output_usd_per_million, 10, 1e-12, 'Sonnet 5 introductory output rate');
  assert.equal(active.active_price_effective_from, undefined);

  const future = resolvePricing(sonnet5, '2026-09-01T00:00:00Z');
  close(future.input_usd_per_million, 3, 1e-12, 'Sonnet 5 standard input rate');
  close(future.cached_input_usd_per_million, 0.3, 1e-12, 'Sonnet 5 standard cache-read rate');
  close(future.output_usd_per_million, 15, 1e-12, 'Sonnet 5 standard output rate');
  assert.equal(future.active_price_effective_from, '2026-09-01');
}

{
  const current = resolvePricing(gemini36, '2026-08-21T12:00:00Z');
  close(current.input_usd_per_million, 0.75, 1e-12, 'Gemini 3.6 promotional input rate');
  close(current.cached_input_usd_per_million, 0.075, 1e-12, 'Gemini 3.6 promotional cache rate');
  close(current.output_usd_per_million, 3.75, 1e-12, 'Gemini 3.6 promotional output rate');

  const future = resolvePricing(gemini36, '2027-01-01T00:00:00Z');
  close(future.input_usd_per_million, 1.5, 1e-12, 'Gemini 3.6 2027 input rate');
  close(future.cached_input_usd_per_million, 0.15, 1e-12, 'Gemini 3.6 2027 cache rate');
  close(future.output_usd_per_million, 7.5, 1e-12, 'Gemini 3.6 2027 output rate');
  assert.equal(future.active_price_effective_from, '2027-01-01');
}

assert.ok(pricing.presets.length >= 8, 'expected at least eight sourced pricing presets');
assert.equal(pricing.freshness_policy?.review_interval_days, 14, 'pricing freshness policy must be explicit');
for (const preset of pricing.presets) {
  assert.match(preset.id, /^[a-z0-9-]+$/);
  assert.ok(preset.provider && preset.model, `${preset.id}: provider/model required`);
  assert.ok(Number.isFinite(preset.input_usd_per_million), `${preset.id}: input rate required`);
  assert.ok(Number.isFinite(preset.output_usd_per_million), `${preset.id}: output rate required`);
  assert.ok(preset.cached_input_usd_per_million === null || Number.isFinite(preset.cached_input_usd_per_million), `${preset.id}: cache-read rate must be null or numeric`);
  assert.match(preset.source?.url || '', /^https:\/\//, `${preset.id}: primary-source URL required`);
  assert.match(preset.source?.verified_on || '', /^2026-\d{2}-\d{2}$/, `${preset.id}: verification date required`);
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
