(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.S5LlmCostLatency = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.1.0';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const nonNegative = (value) => Math.max(0, Number(value) || 0);

  function resolvePricing(pricing, asOf = new Date()) {
    if (!pricing || typeof pricing !== 'object') return pricing || null;
    const future = pricing.future_price;
    if (!future || !future.effective_from) return pricing;

    const currentDate = asOf instanceof Date ? asOf : new Date(asOf);
    const effectiveDate = new Date(`${future.effective_from}T00:00:00Z`);
    if (Number.isNaN(currentDate.getTime()) || Number.isNaN(effectiveDate.getTime()) || currentDate < effectiveDate) {
      return pricing;
    }

    return {
      ...pricing,
      input_usd_per_million: future.input_usd_per_million ?? pricing.input_usd_per_million,
      cached_input_usd_per_million: future.cached_input_usd_per_million ?? pricing.cached_input_usd_per_million,
      output_usd_per_million: future.output_usd_per_million ?? pricing.output_usd_per_million,
      active_price_effective_from: future.effective_from
    };
  }

  function calculate(raw, pricing) {
    const activePricing = resolvePricing(pricing, raw?.asOfDate ?? new Date());
    const inputTokens = nonNegative(raw.inputTokens);
    const outputTokens = nonNegative(raw.outputTokens);
    const cacheHitRate = clamp(raw.cacheHitRate, 0, 100) / 100;
    const requestsPerMinute = nonNegative(raw.requestsPerMinute);
    const activeHoursPerDay = clamp(raw.activeHoursPerDay, 0, 24);
    const daysPerMonth = clamp(raw.daysPerMonth, 0, 31);
    const ttftMs = nonNegative(raw.ttftMs);
    const tokensPerSecond = Math.max(0.000001, nonNegative(raw.tokensPerSecond));
    const concurrency = nonNegative(raw.concurrency);
    const monthlyBudgetUsd = nonNegative(raw.monthlyBudgetUsd);
    const latencyTargetMs = nonNegative(raw.latencyTargetMs);

    const baseInputRate = nonNegative(raw.inputPrice ?? activePricing?.input_usd_per_million);
    const baseOutputRate = nonNegative(raw.outputPrice ?? activePricing?.output_usd_per_million);
    const declaredCachedRate = raw.cachedInputPrice ?? activePricing?.cached_input_usd_per_million;
    const baseCachedRate = declaredCachedRate === null || declaredCachedRate === undefined || declaredCachedRate === ''
      ? baseInputRate
      : nonNegative(declaredCachedRate);

    const longContext = activePricing?.long_context || null;
    const longContextActive = Boolean(
      longContext &&
      nonNegative(longContext.threshold_input_tokens) > 0 &&
      inputTokens > nonNegative(longContext.threshold_input_tokens)
    );
    const inputMultiplier = longContextActive ? nonNegative(longContext.input_multiplier) || 1 : 1;
    const outputMultiplier = longContextActive ? nonNegative(longContext.output_multiplier) || 1 : 1;

    const inputRate = baseInputRate * inputMultiplier;
    const cachedInputRate = baseCachedRate * inputMultiplier;
    const outputRate = baseOutputRate * outputMultiplier;

    const cachedInputTokens = inputTokens * cacheHitRate;
    const uncachedInputTokens = inputTokens - cachedInputTokens;
    const uncachedInputCost = (uncachedInputTokens / 1_000_000) * inputRate;
    const cachedInputCost = (cachedInputTokens / 1_000_000) * cachedInputRate;
    const outputCost = (outputTokens / 1_000_000) * outputRate;
    const costPerRequest = uncachedInputCost + cachedInputCost + outputCost;

    const requestsPerMonth = requestsPerMinute * 60 * activeHoursPerDay * daysPerMonth;
    const monthlyCost = costPerRequest * requestsPerMonth;
    const monthlyInputTokens = inputTokens * requestsPerMonth;
    const monthlyOutputTokens = outputTokens * requestsPerMonth;

    const generationMs = outputTokens > 0 ? (Math.max(outputTokens - 1, 0) / tokensPerSecond) * 1000 : 0;
    const responseTimeMs = ttftMs + generationMs;
    const serviceSeconds = responseTimeMs / 1000;
    const arrivalRatePerSecond = requestsPerMinute / 60;
    const requiredConcurrency = arrivalRatePerSecond * serviceSeconds;
    const capacityRpm = concurrency > 0 && serviceSeconds > 0 ? (concurrency / serviceSeconds) * 60 : 0;
    const capacityHeadroomPct = requestsPerMinute > 0 ? ((capacityRpm / requestsPerMinute) - 1) * 100 : 0;

    return {
      version: VERSION,
      normalized: {
        inputTokens,
        outputTokens,
        cacheHitRate: cacheHitRate * 100,
        requestsPerMinute,
        activeHoursPerDay,
        daysPerMonth,
        ttftMs,
        tokensPerSecond,
        concurrency,
        monthlyBudgetUsd,
        latencyTargetMs,
        inputPrice: baseInputRate,
        cachedInputPrice: baseCachedRate,
        outputPrice: baseOutputRate
      },
      pricing: {
        inputRate,
        cachedInputRate,
        outputRate,
        longContextActive,
        inputMultiplier,
        outputMultiplier,
        activePriceEffectiveFrom: activePricing?.active_price_effective_from || null
      },
      cost: {
        uncachedInputCost,
        cachedInputCost,
        outputCost,
        costPerRequest,
        requestsPerMonth,
        monthlyCost,
        monthlyInputTokens,
        monthlyOutputTokens,
        monthlyBudgetUsd,
        budgetDeltaUsd: monthlyBudgetUsd - monthlyCost,
        withinBudget: monthlyBudgetUsd <= 0 ? null : monthlyCost <= monthlyBudgetUsd
      },
      latency: {
        ttftMs,
        generationMs,
        responseTimeMs,
        latencyTargetMs,
        latencyDeltaMs: latencyTargetMs - responseTimeMs,
        withinTarget: latencyTargetMs <= 0 ? null : responseTimeMs <= latencyTargetMs
      },
      capacity: {
        arrivalRatePerSecond,
        requiredConcurrency,
        configuredConcurrency: concurrency,
        capacityRpm,
        capacityHeadroomPct,
        enoughConcurrency: concurrency <= 0 ? null : concurrency >= requiredConcurrency
      }
    };
  }

  return { VERSION, calculate, resolvePricing };
});
