(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.S5ModelPricePerformance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const finite = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const nonNegative = (value) => Math.max(0, finite(value));

  function resolvePricing(model, now = new Date()) {
    const date = now instanceof Date ? now : new Date(now);
    let input = nonNegative(model.input_usd_per_million);
    let output = nonNegative(model.output_usd_per_million);
    let effectiveFrom = null;

    if (model.future_price?.effective_from) {
      const effectiveDate = new Date(`${model.future_price.effective_from}T00:00:00Z`);
      if (!Number.isNaN(effectiveDate.getTime()) && date >= effectiveDate) {
        input = nonNegative(model.future_price.input_usd_per_million);
        output = nonNegative(model.future_price.output_usd_per_million);
        effectiveFrom = model.future_price.effective_from;
      }
    }

    return { input, output, effectiveFrom };
  }

  function calculateScenarioCost(model, inputTokens, outputTokens, now = new Date()) {
    const input = nonNegative(inputTokens);
    const output = nonNegative(outputTokens);
    const pricing = resolvePricing(model, now);
    let inputRate = pricing.input;
    let outputRate = pricing.output;
    let longContextActive = false;

    if (model.long_context && input > nonNegative(model.long_context.threshold_input_tokens)) {
      inputRate *= nonNegative(model.long_context.input_multiplier) || 1;
      outputRate *= nonNegative(model.long_context.output_multiplier) || 1;
      longContextActive = true;
    }

    const inputCost = input * inputRate / 1_000_000;
    const outputCost = output * outputRate / 1_000_000;
    return {
      inputTokens: input,
      outputTokens: output,
      inputRate,
      outputRate,
      inputCost,
      outputCost,
      costPerRequest: inputCost + outputCost,
      effectiveFrom: pricing.effectiveFrom,
      longContextActive
    };
  }

  function enrichModels(models, scenario = {}, now = new Date()) {
    const inputTokens = nonNegative(scenario.inputTokens ?? 4000);
    const outputTokens = nonNegative(scenario.outputTokens ?? 500);
    const rows = (Array.isArray(models) ? models : []).map((model) => ({
      ...model,
      scenario: calculateScenarioCost(model, inputTokens, outputTokens, now)
    }));
    const frontierIds = new Set(priceIntelligenceFrontier(rows).map((row) => row.id));
    return rows.map((row) => ({ ...row, on_frontier: frontierIds.has(row.id) }));
  }

  function priceIntelligenceFrontier(rows) {
    const scored = (Array.isArray(rows) ? rows : []).filter((row) =>
      Number.isFinite(Number(row.intelligence_index)) && Number.isFinite(Number(row.scenario?.costPerRequest))
    );
    return scored.filter((candidate) => !scored.some((other) => {
      if (other.id === candidate.id) return false;
      const noWorseQuality = Number(other.intelligence_index) >= Number(candidate.intelligence_index);
      const noWorseCost = Number(other.scenario.costPerRequest) <= Number(candidate.scenario.costPerRequest);
      const strictlyBetter = Number(other.intelligence_index) > Number(candidate.intelligence_index)
        || Number(other.scenario.costPerRequest) < Number(candidate.scenario.costPerRequest);
      return noWorseQuality && noWorseCost && strictlyBetter;
    }));
  }

  function filterModels(rows, filters = {}) {
    const provider = String(filters.provider || 'all');
    const minIntelligence = nonNegative(filters.minIntelligence);
    const maxTtftSeconds = nonNegative(filters.maxTtftSeconds);
    const minContextTokens = nonNegative(filters.minContextTokens);
    const maxCostPerRequest = nonNegative(filters.maxCostPerRequest);

    return (Array.isArray(rows) ? rows : []).filter((row) => {
      if (provider !== 'all' && row.provider !== provider) return false;
      if (minIntelligence > 0 && (!Number.isFinite(Number(row.intelligence_index)) || Number(row.intelligence_index) < minIntelligence)) return false;
      if (maxTtftSeconds > 0 && (!Number.isFinite(Number(row.ttft_seconds)) || Number(row.ttft_seconds) > maxTtftSeconds)) return false;
      if (minContextTokens > 0 && Number(row.context_tokens || 0) < minContextTokens) return false;
      if (maxCostPerRequest > 0 && Number(row.scenario?.costPerRequest || Infinity) > maxCostPerRequest) return false;
      return true;
    });
  }

  function sortModels(rows, sortBy = 'frontier') {
    const copy = [...(Array.isArray(rows) ? rows : [])];
    const sorters = {
      frontier: (a, b) => Number(b.on_frontier) - Number(a.on_frontier)
        || Number(b.intelligence_index ?? -Infinity) - Number(a.intelligence_index ?? -Infinity)
        || Number(a.scenario?.costPerRequest ?? Infinity) - Number(b.scenario?.costPerRequest ?? Infinity),
      intelligence: (a, b) => Number(b.intelligence_index ?? -Infinity) - Number(a.intelligence_index ?? -Infinity),
      cost: (a, b) => Number(a.scenario?.costPerRequest ?? Infinity) - Number(b.scenario?.costPerRequest ?? Infinity),
      speed: (a, b) => Number(b.output_tokens_per_second ?? -Infinity) - Number(a.output_tokens_per_second ?? -Infinity),
      latency: (a, b) => Number(a.ttft_seconds ?? Infinity) - Number(b.ttft_seconds ?? Infinity),
      context: (a, b) => Number(b.context_tokens ?? -Infinity) - Number(a.context_tokens ?? -Infinity)
    };
    copy.sort(sorters[sortBy] || sorters.frontier);
    return copy;
  }

  function summary(rows) {
    const candidates = Array.isArray(rows) ? rows : [];
    const withIntelligence = candidates.filter((row) => Number.isFinite(Number(row.intelligence_index)));
    const withSpeed = candidates.filter((row) => Number.isFinite(Number(row.output_tokens_per_second)));
    const withLatency = candidates.filter((row) => Number.isFinite(Number(row.ttft_seconds)));
    const cheapest = [...candidates].sort((a, b) => Number(a.scenario?.costPerRequest ?? Infinity) - Number(b.scenario?.costPerRequest ?? Infinity))[0] || null;
    const smartest = [...withIntelligence].sort((a, b) => Number(b.intelligence_index) - Number(a.intelligence_index))[0] || null;
    const fastest = [...withSpeed].sort((a, b) => Number(b.output_tokens_per_second) - Number(a.output_tokens_per_second))[0] || null;
    const lowestLatency = [...withLatency].sort((a, b) => Number(a.ttft_seconds) - Number(b.ttft_seconds))[0] || null;
    return { count: candidates.length, cheapest, smartest, fastest, lowestLatency };
  }

  return {
    resolvePricing,
    calculateScenarioCost,
    enrichModels,
    priceIntelligenceFrontier,
    filterModels,
    sortModels,
    summary
  };
});
