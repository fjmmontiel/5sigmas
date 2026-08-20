'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLlmCostLatency } = require('../../docs/javascripts/ai-tools.js');

const approx = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
};

const baseline = {
  inputTokens: 1800,
  cachedPct: 35,
  outputTokens: 450,
  inputPrice: 2.5,
  cachedPrice: 0.25,
  outputPrice: 10,
  ttftMs: 450,
  outputTps: 70,
  overheadMs: 150,
  requestsDay: 10000,
  peakRequestsMin: 240
};

test('baseline scenario keeps cost and latency units consistent', () => {
  const result = calculateLlmCostLatency(baseline);
  approx(result.uncachedInputTokens, 1170);
  approx(result.cachedInputTokens, 630);
  approx(result.inputCost, 0.002925);
  approx(result.cachedCost, 0.0001575);
  approx(result.outputCost, 0.0045);
  approx(result.requestCost, 0.0075825);
  approx(result.costPerThousand, 7.5825);
  approx(result.monthlyCost, 2274.75);
  approx(result.responseMs, 7028.571428571428, 1e-6);
  approx(result.peakConcurrency, 28.11428571428571, 1e-6);
  approx(result.monthlyTokens, 675000000);
  assert.equal(result.dominantCost, 'outputCost');
});

test('100% cache moves all input tokens to the cache rate', () => {
  const result = calculateLlmCostLatency({ ...baseline, cachedPct: 100 });
  approx(result.uncachedInputTokens, 0);
  approx(result.cachedInputTokens, 1800);
  approx(result.inputCost, 0);
  approx(result.cachedCost, 0.00045);
});

test('zero output has no generation duration but preserves TTFT and overhead', () => {
  const result = calculateLlmCostLatency({ ...baseline, outputTokens: 0 });
  approx(result.generationMs, 0);
  approx(result.responseMs, 600);
});

test('peak concurrency follows Little-law dimensionality', () => {
  const result = calculateLlmCostLatency({
    ...baseline,
    outputTokens: 0,
    ttftMs: 500,
    overheadMs: 500,
    peakRequestsMin: 60
  });
  approx(result.responseMs, 1000);
  approx(result.peakConcurrency, 1);
});

test('invalid ranges fail instead of producing misleading output', () => {
  assert.throws(() => calculateLlmCostLatency({ ...baseline, cachedPct: 101 }), RangeError);
  assert.throws(() => calculateLlmCostLatency({ ...baseline, outputTps: 0 }), RangeError);
  assert.throws(() => calculateLlmCostLatency({ ...baseline, inputTokens: -1 }), RangeError);
  assert.throws(() => calculateLlmCostLatency({ ...baseline, requestsDay: 'NaN' }), RangeError);
});
