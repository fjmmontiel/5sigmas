(function () {
  'use strict';

  const root = document.querySelector('[data-s5-model-capability-timeline]');
  if (!root || !window.S5ModelCapabilityTimelineCore) return;
  const Core = window.S5ModelCapabilityTimelineCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = {
    es: {
      loadError: 'No se pudo cargar el dataset de capacidades.',
      copied: 'Escenario copiado.',
      copyFailed: 'No se pudo copiar el enlace.',
      exported: 'Archivo generado.',
      latest: 'Último valor reportado',
      gain: 'Cambio desde el primer punto',
      months: 'Ventana temporal',
      breaks: 'Cambios de protocolo',
      monthsUnit: 'meses',
      points: 'puntos',
      noBreaks: 'sin cambios explícitos',
      oneBreak: '1 cambio explícito',
      manyBreaks: 'cambios explícitos',
      reportDifference: 'Una misma generación tiene más de un resultado reportado bajo protocolos distintos.',
      noDuplicate: 'No hay generaciones duplicadas por protocolo en esta serie.',
      source: 'Fuente',
      protocol: 'Protocolo',
      conditions: 'Condiciones',
      date: 'Fecha',
      model: 'Modelo',
      score: 'Resultado',
      chartLabel: 'Evolución temporal de resultados reportados para'
    },
    en: {
      loadError: 'The capability dataset could not be loaded.',
      copied: 'Scenario copied.',
      copyFailed: 'Could not copy the link.',
      exported: 'File generated.',
      latest: 'Latest reported value',
      gain: 'Change from first point',
      months: 'Time window',
      breaks: 'Protocol changes',
      monthsUnit: 'months',
      points: 'points',
      noBreaks: 'no explicit changes',
      oneBreak: '1 explicit change',
      manyBreaks: 'explicit changes',
      reportDifference: 'The same model generation has more than one reported result under different protocols.',
      noDuplicate: 'No model generation is duplicated across protocols in this series.',
      source: 'Source',
      protocol: 'Protocol',
      conditions: 'Conditions',
      date: 'Date',
      model: 'Model',
      score: 'Result',
      chartLabel: 'Timeline of reported results for'
    }
  }[locale];

  const select = root.querySelector('[data-field="series"]');
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  let dataset = null;
  let activeSeries = null;

  function text(selector, value) {
    const el = root.querySelector(selector);
    if (el) el.textContent = value;
  }

  function format(value, digits = 1) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  }

  function setFeedback(message) {
    if (!feedback) return;
    feedback.hidden = false;
    feedback.textContent = message;
    window.clearTimeout(setFeedback.timer);
    setFeedback.timer = window.setTimeout(() => { feedback.hidden = true; }, 2400);
  }

  function svgNode(name, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    return el;
  }

  function renderChart(series) {
    const host = root.querySelector('[data-output="chart"]');
    if (!host) return;
    host.replaceChildren();
    const width = 920;
    const height = 400;
    const margin = { top: 34, right: 34, bottom: 64, left: 58 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const times = series.points.map((p) => Date.parse(`${p.date}T00:00:00Z`));
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const domain = Core.chartDomain(series, 5);
    const x = (date) => margin.left + ((Date.parse(`${date}T00:00:00Z`) - minT) / Math.max(1, maxT - minT)) * innerW;
    const y = (score) => margin.top + (domain.max - score) / Math.max(1, domain.max - domain.min) * innerH;

    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${copy.chartLabel} ${locale === 'es' ? series.title_es : series.title_en}` });
    const title = svgNode('title');
    title.textContent = `${copy.chartLabel} ${locale === 'es' ? series.title_es : series.title_en}`;
    svg.appendChild(title);

    const ticks = 5;
    for (let i = 0; i <= ticks; i += 1) {
      const value = domain.min + (domain.max - domain.min) * i / ticks;
      const yy = y(value);
      svg.appendChild(svgNode('line', { x1: margin.left, y1: yy, x2: width - margin.right, y2: yy, class: 's5-timeline-gridline' }));
      const label = svgNode('text', { x: margin.left - 10, y: yy + 4, 'text-anchor': 'end', class: 's5-timeline-axis-label' });
      label.textContent = `${format(value, 0)}${series.unit || '%'}`;
      svg.appendChild(label);
    }

    const segments = Core.protocolSegments(series);
    segments.forEach((segment, segmentIndex) => {
      if (segment.points.length < 2) return;
      const d = segment.points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.date).toFixed(2)} ${y(point.score).toFixed(2)}`).join(' ');
      svg.appendChild(svgNode('path', { d, class: `s5-timeline-line s5-timeline-line--${segmentIndex % 4}` }));
    });

    const firstYear = new Date(minT).getUTCFullYear();
    const lastYear = new Date(maxT).getUTCFullYear();
    const xDates = [series.points[0].date];
    for (let year = firstYear + 1; year <= lastYear; year += 1) xDates.push(`${year}-01-01`);
    if (series.points[series.points.length - 1].date !== xDates[xDates.length - 1]) xDates.push(series.points[series.points.length - 1].date);
    Array.from(new Set(xDates)).forEach((date) => {
      const xx = x(date);
      const label = svgNode('text', { x: xx, y: height - 24, 'text-anchor': 'middle', class: 's5-timeline-axis-label' });
      label.textContent = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
      svg.appendChild(label);
    });

    series.points.forEach((point, index) => {
      const xx = x(point.date);
      const yy = y(point.score);
      const group = svgNode('g', { class: 's5-timeline-point', tabindex: '0', role: 'group', 'aria-label': `${point.model}: ${format(point.score)}${series.unit || '%'}, ${formatDate(point.date)}. ${point.conditions}` });
      const circle = svgNode('circle', { cx: xx, cy: yy, r: 6 });
      group.appendChild(circle);
      const score = svgNode('text', { x: xx, y: yy - 13, 'text-anchor': 'middle', class: 's5-timeline-point-score' });
      score.textContent = `${format(point.score)}${series.unit || '%'}`;
      group.appendChild(score);
      const model = svgNode('text', { x: xx, y: yy + (index % 2 === 0 ? 22 : 35), 'text-anchor': 'middle', class: 's5-timeline-point-model' });
      model.textContent = point.model;
      group.appendChild(model);
      svg.appendChild(group);
    });

    host.appendChild(svg);
  }

  function renderTable(series) {
    const body = root.querySelector('[data-output="table-body"]');
    if (!body) return;
    body.replaceChildren();
    series.points.forEach((point) => {
      const source = dataset.sources[point.source];
      const row = document.createElement('tr');
      [formatDate(point.date), point.model, `${format(point.score)}${series.unit || '%'}`, point.protocol || '—', point.conditions || '—'].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      const sourceCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = source.title;
      link.rel = 'noopener';
      sourceCell.appendChild(link);
      row.appendChild(sourceCell);
      body.appendChild(row);
    });
  }

  function renderSources(series) {
    const host = root.querySelector('[data-output="sources"]');
    if (!host) return;
    host.replaceChildren();
    Core.sourceCoverage(dataset, series).forEach((source) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = `${source.organization} · ${source.title}`;
      link.rel = 'noopener';
      item.appendChild(link);
      const date = document.createElement('span');
      date.textContent = formatDate(source.published);
      item.appendChild(date);
      host.appendChild(item);
    });
  }

  function render() {
    activeSeries = Core.seriesById(dataset, select.value);
    const s = Core.stats(activeSeries);
    const title = locale === 'es' ? activeSeries.title_es : activeSeries.title_en;
    const definition = locale === 'es' ? activeSeries.definition_es : activeSeries.definition_en;
    const caveat = locale === 'es' ? activeSeries.caveat_es : activeSeries.caveat_en;
    text('[data-output="series-title"]', title);
    text('[data-output="definition"]', definition);
    text('[data-output="caveat"]', caveat);
    text('[data-output="latest"]', `${format(s.latest.score)}${activeSeries.unit || '%'}`);
    text('[data-output="latest-model"]', `${s.latest.model} · ${formatDate(s.latest.date)}`);
    text('[data-output="gain"]', `${s.gain >= 0 ? '+' : ''}${format(s.gain)} ${copy.points}`);
    text('[data-output="window"]', `${format(s.months, 0)} ${copy.monthsUnit}`);
    text('[data-output="breaks"]', s.protocolBreaks === 0 ? copy.noBreaks : (s.protocolBreaks === 1 ? copy.oneBreak : `${s.protocolBreaks} ${copy.manyBreaks}`));
    text('[data-output="duplicate-note"]', s.duplicateModelCount ? copy.reportDifference : copy.noDuplicate);
    renderChart(activeSeries);
    renderTable(activeSeries);
    renderSources(activeSeries);
    const url = new URL(window.location.href);
    url.searchParams.set('series', activeSeries.id);
    window.history.replaceState(null, '', url);
  }

  function download(filename, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback(copy.exported);
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !dataset || !activeSeries) return;
    const action = button.dataset.action;
    if (action === 'reset') {
      select.value = dataset.series[0].id;
      render();
    }
    if (action === 'share') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setFeedback(copy.copied);
      } catch (_) { setFeedback(copy.copyFailed); }
    }
    if (action === 'csv') download(`5sigmas-${activeSeries.id}.csv`, 'text/csv;charset=utf-8', Core.toCsv(dataset, activeSeries));
    if (action === 'json') download(`5sigmas-${activeSeries.id}.json`, 'application/json;charset=utf-8', JSON.stringify(Core.exportPayload(dataset, activeSeries), null, 2));
  });

  fetch('/assets/data/tools/model-capability-timeline.json')
    .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then((data) => {
      dataset = Core.assertDataset(data);
      const state = Core.queryState(window.location.search, dataset);
      dataset.series.forEach((series) => {
        const option = document.createElement('option');
        option.value = series.id;
        option.textContent = locale === 'es' ? series.title_es : series.title_en;
        select.appendChild(option);
      });
      select.value = state.series;
      select.addEventListener('change', render);
      render();
      root.dataset.ready = 'true';
    })
    .catch(() => {
      root.dataset.error = 'true';
      setFeedback(copy.loadError);
    });
})();
