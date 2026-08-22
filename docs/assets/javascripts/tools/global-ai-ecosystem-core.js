(() => {
  'use strict';

  const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function transformValue(value, transform) {
    if (!finite(value)) return null;
    const x = Number(value);
    if (transform === 'log1p') return Math.log1p(Math.max(0, x));
    return x;
  }

  function normalizeWeights(activeMetrics, weights = {}) {
    const positive = activeMetrics.map((metric) => ({
      id: metric.id,
      weight: Math.max(0, finite(weights[metric.id]) ? Number(weights[metric.id]) : Number(metric.default_weight || 1)),
    }));
    const total = positive.reduce((sum, item) => sum + item.weight, 0);
    if (!(total > 0)) {
      const equal = positive.length ? 1 / positive.length : 0;
      return Object.fromEntries(positive.map((item) => [item.id, equal]));
    }
    return Object.fromEntries(positive.map((item) => [item.id, item.weight / total]));
  }

  function comparableCountries(data, activeIds) {
    return data.countries.filter((country) => activeIds.every((id) => finite(country.values[id])));
  }

  function metricBounds(countries, metric) {
    const values = countries
      .map((country) => transformValue(country.values[metric.id], metric.transform))
      .filter((value) => value !== null);
    if (!values.length) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  function normalizeMetric(rawValue, metric, bounds) {
    const value = transformValue(rawValue, metric.transform);
    if (value === null || !bounds) return null;
    if (bounds.max === bounds.min) return 50;
    let score = ((value - bounds.min) / (bounds.max - bounds.min)) * 100;
    if (metric.higher_is_better === false) score = 100 - score;
    return clamp(score, 0, 100);
  }

  function computeScenario(data, state = {}) {
    const metricById = Object.fromEntries(data.metrics.map((metric) => [metric.id, metric]));
    const requested = Array.isArray(state.activeMetrics) && state.activeMetrics.length
      ? state.activeMetrics.filter((id) => metricById[id])
      : data.metrics.filter((metric) => metric.default_active).map((metric) => metric.id);
    const activeIds = [...new Set(requested)];
    const activeMetrics = activeIds.map((id) => metricById[id]);
    const countries = comparableCountries(data, activeIds);
    const weights = normalizeWeights(activeMetrics, state.weights || {});
    const bounds = Object.fromEntries(activeMetrics.map((metric) => [metric.id, metricBounds(countries, metric)]));

    const rows = countries.map((country) => {
      const metricScores = {};
      let composite = 0;
      activeMetrics.forEach((metric) => {
        const normalized = normalizeMetric(country.values[metric.id], metric, bounds[metric.id]);
        metricScores[metric.id] = normalized;
        composite += normalized * weights[metric.id];
      });
      return {
        id: country.id,
        name_es: country.name_es,
        name_en: country.name_en,
        region: country.region,
        reference_vibrancy_2024: finite(country.reference_vibrancy_2024) ? Number(country.reference_vibrancy_2024) : null,
        raw: Object.fromEntries(activeIds.map((id) => [id, country.values[id]])),
        normalized: metricScores,
        score: composite,
      };
    }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    rows.forEach((row, index) => { row.rank = index + 1; });

    return {
      activeIds,
      activeMetrics,
      weights,
      bounds,
      rows,
      excluded: data.countries
        .filter((country) => !countries.includes(country))
        .map((country) => ({
          id: country.id,
          name_es: country.name_es,
          name_en: country.name_en,
          missing: activeIds.filter((id) => !finite(country.values[id])),
        })),
      totalCountries: data.countries.length,
      comparableCount: countries.length,
    };
  }

  function rankSensitivity(data, state = {}, metricId, factors = [0, 0.5, 1, 2, 4]) {
    const baseline = computeScenario(data, state);
    if (!baseline.activeIds.includes(metricId)) return [];
    const baseRawWeights = Object.fromEntries(baseline.activeIds.map((id) => [id, baseline.weights[id]]));
    return factors.map((factor) => {
      const weights = { ...baseRawWeights, [metricId]: baseRawWeights[metricId] * factor };
      const scenario = computeScenario(data, { activeMetrics: baseline.activeIds, weights });
      return {
        factor,
        leader: scenario.rows[0]?.id || null,
        rows: scenario.rows.map((row) => ({ id: row.id, rank: row.rank, score: row.score })),
      };
    });
  }

  function encodeState(state = {}) {
    const params = new URLSearchParams();
    if (Array.isArray(state.activeMetrics) && state.activeMetrics.length) params.set('m', state.activeMetrics.join(','));
    const weights = state.weights || {};
    Object.entries(weights).forEach(([id, value]) => {
      if (finite(value)) params.set(`w_${id}`, String(Number(value)));
    });
    if (state.focus) params.set('focus', String(state.focus));
    return params.toString();
  }

  function decodeState(search, data) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    const valid = new Set(data.metrics.map((metric) => metric.id));
    const rawMetrics = (params.get('m') || '').split(',').filter((id) => valid.has(id));
    const weights = {};
    valid.forEach((id) => {
      const value = params.get(`w_${id}`);
      if (finite(value)) weights[id] = Number(value);
    });
    const focus = params.get('focus');
    return {
      activeMetrics: rawMetrics.length ? rawMetrics : undefined,
      weights,
      focus: data.countries.some((country) => country.id === focus) ? focus : undefined,
    };
  }

  const Core = {
    transformValue,
    normalizeWeights,
    comparableCountries,
    metricBounds,
    normalizeMetric,
    computeScenario,
    rankSensitivity,
    encodeState,
    decodeState,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (typeof window !== 'undefined') window.S5GlobalAIEcosystemCore = Core;
})();
