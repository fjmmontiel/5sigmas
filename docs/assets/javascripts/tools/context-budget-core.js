(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.S5ContextBudget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const COMPONENTS = ['systemTokens', 'toolTokens', 'historyTokens', 'ragTokens', 'userTokens'];
  const nonNegativeInt = (value, fallback = 0) => Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : fallback));

  function normalize(raw = {}) {
    return {
      contextLimit: Math.max(1, nonNegativeInt(raw.contextLimit, 128000)),
      reservedOutput: nonNegativeInt(raw.reservedOutput, 8000),
      safetyTokens: nonNegativeInt(raw.safetyTokens, 4096),
      systemTokens: nonNegativeInt(raw.systemTokens, 2500),
      toolTokens: nonNegativeInt(raw.toolTokens, 5000),
      historyTokens: nonNegativeInt(raw.historyTokens, 20000),
      ragTokens: nonNegativeInt(raw.ragTokens, 24000),
      userTokens: nonNegativeInt(raw.userTokens, 2000),
      historyGrowthPerTurn: nonNegativeInt(raw.historyGrowthPerTurn, 1800)
    };
  }

  function calculate(raw = {}) {
    const input = normalize(raw);
    const components = Object.fromEntries(COMPONENTS.map((key) => [key, input[key]]));
    const usedInput = COMPONENTS.reduce((sum, key) => sum + input[key], 0);
    const nonInputReserve = input.reservedOutput + input.safetyTokens;
    const availableInput = Math.max(0, input.contextLimit - nonInputReserve);
    const remainingInput = availableInput - usedInput;
    const overflowTokens = Math.max(0, -remainingInput);
    const totalPlanned = usedInput + nonInputReserve;
    const utilization = totalPlanned / input.contextLimit;
    const inputUtilization = availableInput > 0 ? usedInput / availableInput : null;
    const fits = totalPlanned <= input.contextLimit;
    const turnsUntilPressure = input.historyGrowthPerTurn > 0 && remainingInput >= 0
      ? Math.floor(remainingInput / input.historyGrowthPerTurn)
      : (remainingInput >= 0 ? null : 0);

    const rankedComponents = COMPONENTS
      .map((key) => ({ key, tokens: input[key], shareOfInput: usedInput > 0 ? input[key] / usedInput : 0 }))
      .sort((a, b) => b.tokens - a.tokens);

    const possibleRecoveries = rankedComponents.map((component) => ({
      key: component.key,
      tokens: component.tokens,
      recoverableForCurrentOverflow: Math.min(component.tokens, overflowTokens)
    }));

    return {
      version: VERSION,
      normalized: input,
      components,
      input: {
        used: usedInput,
        available: availableInput,
        remaining: remainingInput,
        utilization: inputUtilization
      },
      reserve: {
        output: input.reservedOutput,
        safety: input.safetyTokens,
        total: nonInputReserve
      },
      context: {
        limit: input.contextLimit,
        planned: totalPlanned,
        utilization,
        fits,
        overflowTokens,
        headroomTokens: Math.max(0, input.contextLimit - totalPlanned)
      },
      growth: {
        historyGrowthPerTurn: input.historyGrowthPerTurn,
        turnsUntilPressure
      },
      rankedComponents,
      possibleRecoveries
    };
  }

  function scenarioSummary(raw = {}) {
    const result = calculate(raw);
    return {
      contextLimit: result.context.limit,
      usedInput: result.input.used,
      availableInput: result.input.available,
      reservedOutput: result.reserve.output,
      safetyTokens: result.reserve.safety,
      remainingInput: result.input.remaining,
      overflowTokens: result.context.overflowTokens,
      utilization: result.context.utilization,
      fits: result.context.fits,
      turnsUntilPressure: result.growth.turnsUntilPressure,
      components: result.components
    };
  }

  return { VERSION, COMPONENTS, normalize, calculate, scenarioSummary };
});
