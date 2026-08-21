(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5RagEvaluationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_CONTEXTS = [
    { id: 'A', relevant: true },
    { id: 'B', relevant: true },
    { id: 'C', relevant: false },
    { id: 'D', relevant: true },
    { id: 'E', relevant: false },
    { id: 'F', relevant: true }
  ];

  const DEFAULT_CLAIMS = [
    { id: '1', supported: true, correct: true },
    { id: '2', supported: true, correct: true },
    { id: '3', supported: false, correct: false },
    { id: '4', supported: true, correct: true },
    { id: '5', supported: false, correct: false }
  ];

  const DEFAULT_WEIGHTS = {
    contextRelevance: 25,
    faithfulness: 30,
    answerCorrectness: 30,
    referenceCoverage: 15
  };

  const DIAG_THRESHOLDS = {
    contextRelevance: 0.5,
    faithfulness: 0.7,
    answerCorrectness: 0.7,
    referenceCoverage: 0.7
  };

  function clampInt(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function ratio(successes, total) {
    const n = clampInt(total, 0, 1000000);
    const k = clampInt(successes, 0, n);
    return n === 0 ? 0 : k / n;
  }

  function wilson(successes, total, z = 1.959963984540054) {
    const n = clampInt(total, 0, 1000000);
    const k = clampInt(successes, 0, n);
    if (n === 0) return { low: 0, high: 0, center: 0 };
    const p = k / n;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
    return {
      low: Math.max(0, center - margin),
      high: Math.min(1, center + margin),
      center
    };
  }

  function normalizeWeights(weights) {
    const raw = {
      contextRelevance: Math.max(0, Number(weights?.contextRelevance) || 0),
      faithfulness: Math.max(0, Number(weights?.faithfulness) || 0),
      answerCorrectness: Math.max(0, Number(weights?.answerCorrectness) || 0),
      referenceCoverage: Math.max(0, Number(weights?.referenceCoverage) || 0)
    };
    const sum = Object.values(raw).reduce((a, b) => a + b, 0);
    if (sum === 0) {
      return {
        contextRelevance: 0,
        faithfulness: 0,
        answerCorrectness: 0,
        referenceCoverage: 0,
        normalized: false,
        sum: 0
      };
    }
    return {
      contextRelevance: raw.contextRelevance / sum,
      faithfulness: raw.faithfulness / sum,
      answerCorrectness: raw.answerCorrectness / sum,
      referenceCoverage: raw.referenceCoverage / sum,
      normalized: true,
      sum
    };
  }

  function diagnose(metrics) {
    const failed = [];
    if (metrics.contextRelevance < DIAG_THRESHOLDS.contextRelevance) failed.push('retrieval');
    if (metrics.faithfulness < DIAG_THRESHOLDS.faithfulness) failed.push('grounding');
    if (metrics.answerCorrectness < DIAG_THRESHOLDS.answerCorrectness) failed.push('correctness');
    if (metrics.referenceCoverage < DIAG_THRESHOLDS.referenceCoverage) failed.push('coverage');
    if (failed.length === 0) return 'balanced';
    if (failed.length > 1) return 'multiple';
    return failed[0];
  }

  function evaluate(input) {
    const contexts = (input.contexts || DEFAULT_CONTEXTS).map((item) => ({ ...item, relevant: Boolean(item.relevant) }));
    const claims = (input.claims || DEFAULT_CLAIMS).map((item) => ({ ...item, supported: Boolean(item.supported), correct: Boolean(item.correct) }));
    const referenceFacts = clampInt(input.referenceFacts ?? 4, 1, 1000);
    const coveredFacts = clampInt(input.coveredFacts ?? 3, 0, referenceFacts);

    const relevantContexts = contexts.filter((item) => item.relevant).length;
    const supportedClaims = claims.filter((item) => item.supported).length;
    const correctClaims = claims.filter((item) => item.correct).length;

    const metrics = {
      contextRelevance: ratio(relevantContexts, contexts.length),
      faithfulness: ratio(supportedClaims, claims.length),
      answerCorrectness: ratio(correctClaims, claims.length),
      referenceCoverage: ratio(coveredFacts, referenceFacts)
    };

    const weights = normalizeWeights(input.weights || DEFAULT_WEIGHTS);
    const weightedScore =
      metrics.contextRelevance * weights.contextRelevance +
      metrics.faithfulness * weights.faithfulness +
      metrics.answerCorrectness * weights.answerCorrectness +
      metrics.referenceCoverage * weights.referenceCoverage;

    return {
      contexts,
      claims,
      counts: {
        relevantContexts,
        contexts: contexts.length,
        supportedClaims,
        claims: claims.length,
        correctClaims,
        coveredFacts,
        referenceFacts
      },
      metrics,
      intervals: {
        contextRelevance: wilson(relevantContexts, contexts.length),
        faithfulness: wilson(supportedClaims, claims.length),
        answerCorrectness: wilson(correctClaims, claims.length),
        referenceCoverage: wilson(coveredFacts, referenceFacts)
      },
      weights,
      weightedScore,
      diagnosis: diagnose(metrics)
    };
  }

  function encodeFlags(items, keys) {
    return items.map((item) => keys.map((key) => item[key] ? '1' : '0').join('')).join('-');
  }

  function decodeFlags(encoded, template, keys) {
    const parts = String(encoded || '').split('-');
    if (parts.length !== template.length) return template.map((item) => ({ ...item }));
    return template.map((item, idx) => {
      const bits = parts[idx] || '';
      const next = { ...item };
      keys.forEach((key, bit) => { next[key] = bits[bit] === '1'; });
      return next;
    });
  }

  return {
    DEFAULT_CONTEXTS,
    DEFAULT_CLAIMS,
    DEFAULT_WEIGHTS,
    DIAG_THRESHOLDS,
    ratio,
    wilson,
    normalizeWeights,
    diagnose,
    evaluate,
    encodeFlags,
    decodeFlags
  };
});
