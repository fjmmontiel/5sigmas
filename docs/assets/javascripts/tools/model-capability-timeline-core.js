(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5ModelCapabilityTimelineCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const METHODOLOGY_VERSION = '1.0.0';
  const SOURCE_REVIEW_DATE = '2026-08-21';

  function assertDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.series) || !dataset.sources) throw new Error('Invalid capability timeline dataset');
    const ids = new Set();
    dataset.series.forEach((series) => {
      if (!series.id || ids.has(series.id)) throw new Error('Series ids must be unique');
      ids.add(series.id);
      if (!Array.isArray(series.points) || series.points.length < 2) throw new Error(`Series ${series.id} needs at least two points`);
      let previous = -Infinity;
      series.points.forEach((point) => {
        if (!dataset.sources[point.source]) throw new Error(`Unknown source ${point.source}`);
        const timestamp = Date.parse(point.date);
        if (!Number.isFinite(timestamp)) throw new Error(`Invalid date ${point.date}`);
        if (!Number.isFinite(Number(point.score))) throw new Error(`Invalid score in ${series.id}`);
        if (Number(point.score) < 0 || Number(point.score) > 100) throw new Error(`Score outside 0-100 in ${series.id}`);
        if (timestamp < previous) throw new Error(`Points must be chronological in ${series.id}`);
        previous = timestamp;
      });
    });
    return dataset;
  }

  function seriesById(dataset, id) {
    assertDataset(dataset);
    return dataset.series.find((series) => series.id === id) || dataset.series[0];
  }

  function dateMonths(start, end) {
    const a = new Date(`${start}T00:00:00Z`);
    const b = new Date(`${end}T00:00:00Z`);
    return Math.max(0, (b - a) / (1000 * 60 * 60 * 24 * 30.4375));
  }

  function protocolSegments(series) {
    const segments = [];
    series.points.forEach((point) => {
      const protocol = point.protocol || 'unspecified';
      const current = segments[segments.length - 1];
      if (!current || current.protocol !== protocol) segments.push({ protocol, points: [point] });
      else current.points.push(point);
    });
    return segments;
  }

  function duplicateModelReports(series) {
    const byModel = new Map();
    series.points.forEach((point) => {
      const list = byModel.get(point.model) || [];
      list.push(point);
      byModel.set(point.model, list);
    });
    return Array.from(byModel.entries())
      .filter(([, points]) => points.length > 1)
      .map(([model, points]) => ({ model, points, spread: Math.max(...points.map((p) => p.score)) - Math.min(...points.map((p) => p.score)) }));
  }

  function stats(series) {
    const points = series.points;
    const first = points[0];
    const latest = points[points.length - 1];
    const months = dateMonths(first.date, latest.date);
    const gain = latest.score - first.score;
    const annualized = months > 0 ? gain / months * 12 : 0;
    const segments = protocolSegments(series);
    const duplicateReports = duplicateModelReports(series);
    return {
      first,
      latest,
      gain,
      months,
      annualized,
      headroom: series.higher_is_better === false ? latest.score : 100 - latest.score,
      pointCount: points.length,
      protocolCount: new Set(points.map((point) => point.protocol || 'unspecified')).size,
      protocolBreaks: Math.max(0, segments.length - 1),
      segments,
      duplicateReports,
      duplicateModelCount: duplicateReports.length
    };
  }

  function sourceCoverage(dataset, series) {
    const unique = Array.from(new Set(series.points.map((point) => point.source)));
    return unique.map((id) => ({ id, ...dataset.sources[id] }));
  }

  function chartDomain(series, padding = 5) {
    const scores = series.points.map((point) => point.score);
    const min = Math.max(0, Math.floor((Math.min(...scores) - padding) / 5) * 5);
    const max = Math.min(100, Math.ceil((Math.max(...scores) + padding) / 5) * 5);
    return { min: min === max ? Math.max(0, min - 5) : min, max: min === max ? Math.min(100, max + 5) : max };
  }

  function toCsv(dataset, series) {
    const rows = [['date','model','score','unit','protocol','conditions','source_title','source_url']];
    series.points.forEach((point) => {
      const source = dataset.sources[point.source];
      rows.push([point.date, point.model, point.score, series.unit || '%', point.protocol || '', point.conditions || '', source.title, source.url]);
    });
    return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  function exportPayload(dataset, series) {
    return {
      methodologyVersion: METHODOLOGY_VERSION,
      sourceReviewDate: SOURCE_REVIEW_DATE,
      datasetUpdated: dataset.updated,
      datasetScope: dataset.scope,
      freshnessPolicy: dataset.freshness_policy,
      series: {
        id: series.id,
        category: series.category,
        metric: series.metric,
        unit: series.unit,
        points: series.points.map((point) => ({ ...point, sourceMetadata: dataset.sources[point.source] }))
      },
      stats: stats(series)
    };
  }

  function queryState(raw, dataset) {
    const params = raw instanceof URLSearchParams ? raw : new URLSearchParams(raw || '');
    const requested = params.get('series');
    const fallback = dataset.series[0].id;
    const valid = dataset.series.some((series) => series.id === requested) ? requested : fallback;
    return { series: valid };
  }

  return { METHODOLOGY_VERSION, SOURCE_REVIEW_DATE, assertDataset, seriesById, dateMonths, protocolSegments, duplicateModelReports, stats, sourceCoverage, chartDomain, toCsv, exportPayload, queryState };
});
