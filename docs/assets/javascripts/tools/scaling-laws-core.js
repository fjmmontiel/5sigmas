(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5ScalingLawsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const METHODOLOGY_VERSION = '1.0.0';
  const SOURCE_REVIEW_DATE = '2026-08-22';

  function finitePositive(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function assertDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.presets) || dataset.presets.length < 1 || !dataset.sources) {
      throw new Error('Invalid scaling-laws dataset');
    }
    const ids = new Set();
    dataset.presets.forEach((preset) => {
      if (!preset.id || ids.has(preset.id)) throw new Error('Preset ids must be unique');
      ids.add(preset.id);
      ['E', 'A', 'B', 'alpha', 'beta', 'compute_per_param_token'].forEach((key) => {
        if (!Number.isFinite(Number(preset[key])) || Number(preset[key]) <= 0) throw new Error(`Invalid ${key} in ${preset.id}`);
      });
      if (!dataset.sources[preset.source]) throw new Error(`Unknown source ${preset.source}`);
    });
    return dataset;
  }

  function presetById(dataset, id) {
    assertDataset(dataset);
    return dataset.presets.find((preset) => preset.id === id) || dataset.presets[0];
  }

  function effectivePreset(preset, overrides = {}) {
    return {
      ...preset,
      alpha: clamp(finitePositive(overrides.alpha, preset.alpha), 0.01, 2),
      beta: clamp(finitePositive(overrides.beta, preset.beta), 0.01, 2)
    };
  }

  function trainingCompute(N, D, k = 6) {
    return finitePositive(k, 6) * finitePositive(N, 1) * finitePositive(D, 1);
  }

  function predictedLoss(N, D, preset) {
    const n = finitePositive(N, 1);
    const d = finitePositive(D, 1);
    return Number(preset.E) + Number(preset.A) / Math.pow(n, Number(preset.alpha)) + Number(preset.B) / Math.pow(d, Number(preset.beta));
  }

  function computeElasticities(preset) {
    const alpha = Number(preset.alpha);
    const beta = Number(preset.beta);
    const sum = alpha + beta;
    return {
      parameterExponent: beta / sum,
      tokenExponent: alpha / sum
    };
  }

  function optimumForCompute(C, preset) {
    const compute = finitePositive(C, 1);
    const k = finitePositive(preset.compute_per_param_token, 6);
    const alpha = Number(preset.alpha);
    const beta = Number(preset.beta);
    const A = Number(preset.A);
    const B = Number(preset.B);
    const base = compute / k;
    const ratio = (alpha * A) / (beta * B);
    const N = Math.pow(ratio, 1 / (alpha + beta)) * Math.pow(base, beta / (alpha + beta));
    const D = compute / (k * N);
    return { N, D, compute, loss: predictedLoss(N, D, preset), tokensPerParameter: D / N };
  }

  function sameRatioAllocation(N, D, multiplier) {
    const m = clamp(finitePositive(multiplier, 1), 0.001, 1e6);
    const scale = Math.sqrt(m);
    return { N: N * scale, D: D * scale };
  }

  function allocationCurve(C, preset, count = 49) {
    const optimum = optimumForCompute(C, preset);
    const k = finitePositive(preset.compute_per_param_token, 6);
    const points = [];
    const n = Math.max(9, Math.floor(count));
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const factor = Math.pow(10, -1.25 + 2.5 * t);
      const N = optimum.N * factor;
      const D = C / (k * N);
      points.push({ factor, N, D, loss: predictedLoss(N, D, preset), tokensPerParameter: D / N });
    }
    return { optimum, points };
  }

  function scenario(input, preset) {
    const N = finitePositive(input.parametersB, 70) * 1e9;
    const D = finitePositive(input.tokensB, 1400) * 1e9;
    const multiplier = clamp(finitePositive(input.budgetMultiplier, 1), 0.01, 1000);
    const currentCompute = trainingCompute(N, D, preset.compute_per_param_token);
    const targetCompute = currentCompute * multiplier;
    const sameRatio = sameRatioAllocation(N, D, multiplier);
    const optimum = optimumForCompute(targetCompute, preset);
    const sameRatioLoss = predictedLoss(sameRatio.N, sameRatio.D, preset);
    const currentLoss = predictedLoss(N, D, preset);
    const lossGap = sameRatioLoss - optimum.loss;
    const relativeExcess = Math.max(0, lossGap) / Math.max(1e-12, optimum.loss - Number(preset.E));
    const orientationRatio = sameRatio.N / optimum.N;
    let orientation = 'balanced';
    if (orientationRatio > 1.08) orientation = 'parameter-heavy';
    if (orientationRatio < 0.92) orientation = 'data-heavy';
    return {
      N,
      D,
      multiplier,
      currentCompute,
      targetCompute,
      currentLoss,
      sameRatio: { ...sameRatio, loss: sameRatioLoss, tokensPerParameter: sameRatio.D / sameRatio.N },
      optimum,
      lossGap,
      relativeExcess,
      orientation,
      orientationRatio,
      elasticities: computeElasticities(preset)
    };
  }

  function queryState(raw, preset) {
    const params = raw instanceof URLSearchParams ? raw : new URLSearchParams(raw || '');
    return {
      parametersB: clamp(finitePositive(params.get('n'), 70), 0.001, 1e7),
      tokensB: clamp(finitePositive(params.get('d'), 1400), 0.001, 1e9),
      budgetMultiplier: clamp(finitePositive(params.get('c'), 1), 0.01, 1000),
      alpha: clamp(finitePositive(params.get('a'), preset.alpha), 0.01, 2),
      beta: clamp(finitePositive(params.get('b'), preset.beta), 0.01, 2)
    };
  }

  function exportPayload(dataset, preset, input) {
    const effective = effectivePreset(preset, input);
    return {
      methodologyVersion: METHODOLOGY_VERSION,
      sourceReviewDate: SOURCE_REVIEW_DATE,
      datasetUpdated: dataset.updated,
      scope: dataset.scope,
      freshnessPolicy: dataset.freshness_policy,
      assumptions: {
        preset: preset.id,
        E: Number(effective.E),
        A: Number(effective.A),
        B: Number(effective.B),
        alpha: Number(effective.alpha),
        beta: Number(effective.beta),
        computePerParameterToken: Number(effective.compute_per_param_token),
        source: dataset.sources[preset.source]
      },
      input: {
        parametersB: Number(input.parametersB),
        tokensB: Number(input.tokensB),
        budgetMultiplier: Number(input.budgetMultiplier)
      },
      result: scenario(input, effective)
    };
  }

  return {
    METHODOLOGY_VERSION,
    SOURCE_REVIEW_DATE,
    assertDataset,
    presetById,
    effectivePreset,
    trainingCompute,
    predictedLoss,
    computeElasticities,
    optimumForCompute,
    sameRatioAllocation,
    allocationCurve,
    scenario,
    queryState,
    exportPayload
  };
});
