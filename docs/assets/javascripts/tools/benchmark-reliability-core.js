(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5BenchmarkReliabilityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const METHODOLOGY_VERSION = '1.0.0';
  const SOURCE_REVIEW_DATE = '2026-08-21';
  const SOURCES = Object.freeze([
    Object.freeze({ organization: 'Dehghani et al.', title: 'The Benchmark Lottery', url: 'https://arxiv.org/abs/2107.07002' }),
    Object.freeze({ organization: 'Stanford CRFM', title: 'Holistic Evaluation of Language Models (HELM)', url: 'https://crfm.stanford.edu/2022/11/17/helm.html' }),
    Object.freeze({ organization: 'LiveBench', title: 'LiveBench: A Challenging, Contamination-Free LLM Benchmark', url: 'https://arxiv.org/abs/2406.19314' })
  ]);

  const DEFAULTS = Object.freeze({
    items: 1000,
    invalidRate: 2,
    contaminationExposure: 5,
    weightSwing: 30,
    groups: Object.freeze([
      Object.freeze({ id: 'reasoning', weight: 25, a: 82, b: 80 }),
      Object.freeze({ id: 'coding', weight: 25, a: 74, b: 78 }),
      Object.freeze({ id: 'knowledge', weight: 25, a: 86, b: 84 }),
      Object.freeze({ id: 'instruction', weight: 25, a: 79, b: 78 })
    ])
  });

  function number(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function normalize(raw = {}) {
    const groups = DEFAULTS.groups.map((base, index) => {
      const candidate = Array.isArray(raw.groups) ? (raw.groups[index] || {}) : {};
      return {
        id: base.id,
        weight: number(candidate.weight, base.weight, 0.01, 100),
        a: number(candidate.a, base.a, 0, 100),
        b: number(candidate.b, base.b, 0, 100)
      };
    });
    return {
      items: Math.round(number(raw.items, DEFAULTS.items, 20, 10000000)),
      invalidRate: number(raw.invalidRate, DEFAULTS.invalidRate, 0, 95),
      contaminationExposure: number(raw.contaminationExposure, DEFAULTS.contaminationExposure, 0, 100),
      weightSwing: number(raw.weightSwing, DEFAULTS.weightSwing, 0, 100),
      groups
    };
  }

  function normalizedWeights(groups) {
    const sum = groups.reduce((acc, group) => acc + group.weight, 0) || 1;
    return groups.map((group) => group.weight / sum);
  }

  function weightedScore(groups, key, weights) {
    return groups.reduce((acc, group, index) => acc + weights[index] * group[key], 0);
  }

  function wilson(scorePct, n, z = 1.959963984540054) {
    if (!Number.isFinite(n) || n <= 0) return { low: 0, high: 100, halfWidth: 50 };
    const p = Math.min(1, Math.max(0, scorePct / 100));
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const radius = z * Math.sqrt((p * (1 - p) / n) + (z2 / (4 * n * n))) / denom;
    const low = Math.max(0, center - radius) * 100;
    const high = Math.min(1, center + radius) * 100;
    return { low, high, halfWidth: (high - low) / 2 };
  }

  function sensitivityEnvelope(groups, weightSwing) {
    const baseWeights = normalizedWeights(groups);
    const swing = weightSwing / 100;
    let minGap = Infinity;
    let maxGap = -Infinity;
    let minWeights = baseWeights;
    let maxWeights = baseWeights;
    const combinations = 1 << groups.length;
    for (let mask = 0; mask < combinations; mask += 1) {
      const raw = baseWeights.map((weight, index) => weight * ((mask & (1 << index)) ? (1 + swing) : Math.max(0.0001, 1 - swing)));
      const total = raw.reduce((acc, value) => acc + value, 0) || 1;
      const weights = raw.map((value) => value / total);
      const gap = weightedScore(groups, 'a', weights) - weightedScore(groups, 'b', weights);
      if (gap < minGap) { minGap = gap; minWeights = weights; }
      if (gap > maxGap) { maxGap = gap; maxWeights = weights; }
    }
    return { minGap, maxGap, minWeights, maxWeights, flips: minGap < 0 && maxGap > 0 };
  }

  function classify(input, metrics) {
    const flags = [];
    if (metrics.rankSensitivity.flips) flags.push('weight-fragile');
    if (metrics.maxHeadroom < 5) flags.push('saturated');
    if (metrics.contaminationEnvelopeCoversGap) flags.push('contamination-sensitive');
    if (metrics.invalidEnvelopeCoversGap) flags.push('invalid-item-sensitive');
    if (metrics.intervalOverlap) flags.push('statistically-unresolved');
    return flags;
  }

  function evaluate(raw = {}) {
    const input = normalize(raw);
    const weights = normalizedWeights(input.groups);
    const scoreA = weightedScore(input.groups, 'a', weights);
    const scoreB = weightedScore(input.groups, 'b', weights);
    const gap = scoreA - scoreB;
    const absoluteGap = Math.abs(gap);
    const cleanItems = Math.max(1, Math.round(input.items * (1 - input.invalidRate / 100)));
    const invalidItems = Math.max(0, input.items - cleanItems);
    const exposureItems = Math.round(cleanItems * input.contaminationExposure / 100);
    const gapItems = Math.max(1, Math.ceil(cleanItems * absoluteGap / 100));
    const intervalA = wilson(scoreA, cleanItems);
    const intervalB = wilson(scoreB, cleanItems);
    const intervalOverlap = Math.max(intervalA.low, intervalB.low) <= Math.min(intervalA.high, intervalB.high);
    const maxScore = Math.max(scoreA, scoreB);
    const maxHeadroom = 100 - maxScore;
    const rankSensitivity = sensitivityEnvelope(input.groups, input.weightSwing);
    const groupWinners = input.groups.map((group) => ({ id: group.id, gap: group.a - group.b, winner: group.a === group.b ? 'tie' : (group.a > group.b ? 'a' : 'b') }));

    const metrics = {
      weights,
      scoreA,
      scoreB,
      gap,
      absoluteGap,
      cleanItems,
      invalidItems,
      exposureItems,
      gapItems,
      intervalA,
      intervalB,
      intervalOverlap,
      maxHeadroom,
      contaminationEnvelopeCoversGap: exposureItems >= gapItems,
      invalidEnvelopeCoversGap: invalidItems >= gapItems,
      rankSensitivity,
      groupWinners
    };

    return {
      input,
      metrics,
      flags: classify(input, metrics),
      caveats: [
        'Overlapping 95% Wilson intervals are a descriptive resolution check, not a paired significance test. Aggregate accuracies cannot recover the paired per-item error structure.',
        'The contamination and invalid-item envelopes are worst-case sensitivity bounds. They show whether the observed gap could fit inside the stated exposure, not whether contamination or invalid scoring actually caused the gap.',
        'Weight sensitivity changes benchmark composition within the selected swing. A rank flip shows dependence on task weighting, not that either weighting is objectively correct.',
        'A benchmark score characterizes performance on the benchmark definition. It is not a complete measure of model quality or deployment fitness.'
      ]
    };
  }

  return { METHODOLOGY_VERSION, SOURCE_REVIEW_DATE, SOURCES, DEFAULTS, normalize, normalizedWeights, weightedScore, wilson, sensitivityEnvelope, evaluate };
});
