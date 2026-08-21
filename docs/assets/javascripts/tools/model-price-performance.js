(() => {
  'use strict';

  const root = document.querySelector('[data-s5-model-explorer]');
  if (!root || !window.S5ModelPricePerformance) return;

  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const api = window.S5ModelPricePerformance;
  const lang = locale === 'es' ? 'es-ES' : 'en-US';
  const strings = {
    es: {
      allProviders: 'Todos los proveedores',
      models: 'modelos',
      noModels: 'Ningún modelo cumple estos filtros.',
      frontier: 'frontera precio/inteligencia',
      notFrontier: 'fuera de la frontera',
      copied: 'Enlace copiado',
      copyFailed: 'No se pudo copiar. La URL ya contiene el escenario para copiarla manualmente.',
      verified: 'verificado',
      currentPrice: 'precio vigente',
      futurePrice: 'cambio anunciado',
      longContext: 'ajuste por contexto largo activo',
      intelligence: 'Índice de inteligencia',
      cost: 'Coste por solicitud',
      speed: 'Velocidad de salida',
      latency: 'TTFT',
      context: 'Contexto',
      highest: 'Mayor índice',
      cheapest: 'Menor coste',
      fastest: 'Mayor velocidad',
      lowestLatency: 'Menor TTFT',
      noScore: 'sin dato',
      source: 'Fuentes',
      priceSource: 'precio y especificaciones',
      benchmarkSource: 'benchmark y rendimiento',
      scenario: 'Escenario 5sigmas — precio y rendimiento de modelos',
      tableModel: 'Modelo',
      tableCost: 'Coste',
      tableIndex: 'Índice',
      tableSpeed: 'tokens/s',
      tableLatency: 'TTFT',
      tableContext: 'Contexto',
      tableSignal: 'Lectura',
      chartEmpty: 'Amplía los filtros para volver a dibujar la comparación.',
      summary: (count, frontier) => `${count} modelos comparables · ${frontier} en la frontera precio/inteligencia para este escenario`,
      point: (name, cost, intelligence) => `${name}. Coste ${cost}. Índice de inteligencia ${intelligence}.`
    },
    en: {
      allProviders: 'All providers',
      models: 'models',
      noModels: 'No models match these filters.',
      frontier: 'price/intelligence frontier',
      notFrontier: 'off the frontier',
      copied: 'Link copied',
      copyFailed: 'Could not copy. The URL already contains the scenario so you can copy it manually.',
      verified: 'verified',
      currentPrice: 'current price',
      futurePrice: 'announced change',
      longContext: 'long-context adjustment active',
      intelligence: 'Intelligence Index',
      cost: 'Cost per request',
      speed: 'Output speed',
      latency: 'TTFT',
      context: 'Context',
      highest: 'Highest index',
      cheapest: 'Lowest cost',
      fastest: 'Highest speed',
      lowestLatency: 'Lowest TTFT',
      noScore: 'no data',
      source: 'Sources',
      priceSource: 'pricing and specifications',
      benchmarkSource: 'benchmark and performance',
      scenario: '5sigmas scenario — model price and performance',
      tableModel: 'Model',
      tableCost: 'Cost',
      tableIndex: 'Index',
      tableSpeed: 'tokens/s',
      tableLatency: 'TTFT',
      tableContext: 'Context',
      tableSignal: 'Read',
      chartEmpty: 'Relax the filters to draw the comparison again.',
      summary: (count, frontier) => `${count} comparable models · ${frontier} on the price/intelligence frontier for this scenario`,
      point: (name, cost, intelligence) => `${name}. Cost ${cost}. Intelligence Index ${intelligence}.`
    }
  }[locale];

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((node) => [node.dataset.field, node]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((node) => [node.dataset.output, node]));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const tableBody = root.querySelector('[data-model-table-body]');
  const chart = root.querySelector('[data-model-chart]');
  const chartPoints = root.querySelector('[data-model-chart-points]');
  const focus = root.querySelector('[data-model-focus]');
  let data = null;
  let selectedModelId = null;

  const defaults = {
    inputTokens: 4000,
    outputTokens: 500,
    provider: 'all',
    minIntelligence: 0,
    maxTtftSeconds: 0,
    minContextTokens: 0,
    maxCostPerRequest: 0,
    xAxis: 'cost',
    yAxis: 'intelligence',
    sortBy: 'frontier'
  };

  const params = {
    inputTokens: 'in', outputTokens: 'out', provider: 'provider', minIntelligence: 'minq',
    maxTtftSeconds: 'maxttft', minContextTokens: 'minctx', maxCostPerRequest: 'maxcost',
    xAxis: 'x', yAxis: 'y', sortBy: 'sort'
  };

  const axis = {
    cost: { label: strings.cost, lowerBetter: true, value: (row) => row.scenario.costPerRequest, format: (value) => formatCurrency(value, value < .01 ? 4 : 3) },
    intelligence: { label: strings.intelligence, lowerBetter: false, value: (row) => row.intelligence_index, format: (value) => formatNumber(value, 0) },
    speed: { label: strings.speed, lowerBetter: false, value: (row) => row.output_tokens_per_second, format: (value) => `${formatNumber(value, 1)} tok/s` },
    latency: { label: strings.latency, lowerBetter: true, value: (row) => row.ttft_seconds, format: (value) => `${formatNumber(value, 2)} s` },
    context: { label: strings.context, lowerBetter: false, value: (row) => row.context_tokens, format: (value) => formatTokens(value) }
  };

  function number(name) {
    const value = Number(fields[name]?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function formatCurrency(value, digits = 3) {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value) || 0);
  }

  function formatNumber(value, digits = 1) {
    if (!Number.isFinite(Number(value))) return strings.noScore;
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(Number(value));
  }

  function formatTokens(value) {
    const numberValue = Number(value) || 0;
    if (numberValue >= 1_000_000) return `${formatNumber(numberValue / 1_000_000, 2)}M`;
    if (numberValue >= 1_000) return `${formatNumber(numberValue / 1_000, 0)}k`;
    return formatNumber(numberValue, 0);
  }

  function setFeedback(message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function readState() {
    return {
      inputTokens: Math.max(0, number('inputTokens')),
      outputTokens: Math.max(0, number('outputTokens')),
      provider: fields.provider?.value || 'all',
      minIntelligence: Math.max(0, number('minIntelligence')),
      maxTtftSeconds: Math.max(0, number('maxTtftSeconds')),
      minContextTokens: Math.max(0, number('minContextTokens')),
      maxCostPerRequest: Math.max(0, number('maxCostPerRequest')),
      xAxis: fields.xAxis?.value || 'cost',
      yAxis: fields.yAxis?.value || 'intelligence',
      sortBy: fields.sortBy?.value || 'frontier'
    };
  }

  function activeRows() {
    const state = readState();
    const enriched = api.enrichModels(data.models, state, new Date());
    const filtered = api.filterModels(enriched, state);
    return { state, rows: api.sortModels(filtered, state.sortBy) };
  }

  function renderSummary(rows) {
    const summary = api.summary(rows);
    const frontierCount = rows.filter((row) => row.on_frontier).length;
    outputs.visibleCount.textContent = formatNumber(summary.count, 0);
    outputs.frontierCount.textContent = formatNumber(frontierCount, 0);
    outputs.summarySentence.textContent = strings.summary(summary.count, frontierCount);

    const cards = [
      ['smartest', strings.highest, summary.smartest, (row) => `${row.model} · ${formatNumber(row.intelligence_index, 0)}`],
      ['cheapest', strings.cheapest, summary.cheapest, (row) => `${row.model} · ${formatCurrency(row.scenario.costPerRequest, row.scenario.costPerRequest < .01 ? 4 : 3)}`],
      ['fastest', strings.fastest, summary.fastest, (row) => `${row.model} · ${formatNumber(row.output_tokens_per_second, 1)} tok/s`],
      ['lowestLatency', strings.lowestLatency, summary.lowestLatency, (row) => `${row.model} · ${formatNumber(row.ttft_seconds, 2)} s`]
    ];
    for (const [key, label, row, formatter] of cards) {
      const node = outputs[key];
      if (!node) continue;
      node.innerHTML = `<small>${escapeHtml(label)}</small><strong>${row ? escapeHtml(formatter(row)) : '—'}</strong>`;
    }
  }

  function metricValue(row, key) {
    const metric = axis[key] || axis.cost;
    const value = Number(metric.value(row));
    return Number.isFinite(value) ? value : null;
  }

  function boxesOverlap(a, b, gap = 4) {
    return !(
      a.right + gap <= b.left ||
      b.right + gap <= a.left ||
      a.bottom + gap <= b.top ||
      b.bottom + gap <= a.top
    );
  }

  function placeChartLabels(items) {
    if (!chartPoints || !items.length) return;
    const plotWidth = chartPoints.clientWidth;
    const plotHeight = chartPoints.clientHeight;
    if (!plotWidth || !plotHeight) return;

    const candidates = [
      [0, 0],
      [0, -34], [0, 34],
      [48, 0], [-48, 0],
      [48, -28], [-48, -28], [48, 28], [-48, 28],
      [0, -68], [0, 68],
      [86, 0], [-86, 0],
      [86, -34], [-86, -34], [86, 34], [-86, 34]
    ];
    const placed = [];
    const ordered = [...items].sort((a, b) => a.y - b.y || a.x - b.x || a.row.id.localeCompare(b.row.id));

    for (const item of ordered) {
      const width = item.point.offsetWidth;
      const height = item.point.offsetHeight;
      const anchorX = item.x * plotWidth;
      const anchorY = item.y * plotHeight;
      let chosen = null;

      for (const [dx, dy] of candidates) {
        const box = {
          left: anchorX + dx - width / 2,
          right: anchorX + dx + width / 2,
          top: anchorY + dy - height / 2,
          bottom: anchorY + dy + height / 2
        };
        const inside = box.left >= 2 && box.right <= plotWidth - 2 && box.top >= 2 && box.bottom <= plotHeight - 2;
        if (inside && !placed.some((other) => boxesOverlap(box, other))) {
          chosen = { dx, dy, box };
          break;
        }
      }

      if (!chosen) {
        const dx = 0;
        const dy = placed.length % 2 ? 72 : -72;
        chosen = {
          dx,
          dy,
          box: {
            left: anchorX - width / 2,
            right: anchorX + width / 2,
            top: anchorY + dy - height / 2,
            bottom: anchorY + dy + height / 2
          }
        };
      }

      item.point.style.transform = `translate(calc(-50% + ${chosen.dx}px), calc(-50% + ${chosen.dy}px))`;
      item.point.dataset.labelOffsetX = String(chosen.dx);
      item.point.dataset.labelOffsetY = String(chosen.dy);
      placed.push(chosen.box);
    }
  }

  function renderChart(rows, state) {
    if (!chart || !chartPoints) return;
    const xMetric = axis[state.xAxis] || axis.cost;
    const yMetric = axis[state.yAxis] || axis.intelligence;
    const drawable = rows.filter((row) => metricValue(row, state.xAxis) !== null && metricValue(row, state.yAxis) !== null);
    outputs.chartXLabel.textContent = xMetric.label;
    outputs.chartYLabel.textContent = yMetric.label;
    chartPoints.replaceChildren();

    if (!drawable.length) {
      chart.dataset.empty = 'true';
      outputs.chartEmpty.textContent = strings.chartEmpty;
      return;
    }
    chart.dataset.empty = 'false';
    outputs.chartEmpty.textContent = '';

    const xValues = drawable.map((row) => metricValue(row, state.xAxis));
    const yValues = drawable.map((row) => metricValue(row, state.yAxis));
    let xMin = Math.min(...xValues), xMax = Math.max(...xValues), yMin = Math.min(...yValues), yMax = Math.max(...yValues);
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const pad = .07;
    const scale = (value, min, max) => pad + ((value - min) / (max - min)) * (1 - 2 * pad);

    outputs.chartXMin.textContent = xMetric.format(xMin);
    outputs.chartXMax.textContent = xMetric.format(xMax);
    outputs.chartYMin.textContent = yMetric.format(yMin);
    outputs.chartYMax.textContent = yMetric.format(yMax);

    const pointItems = [];
    for (const row of drawable) {
      const x = scale(metricValue(row, state.xAxis), xMin, xMax);
      const y = 1 - scale(metricValue(row, state.yAxis), yMin, yMax);
      const point = document.createElement('button');
      point.type = 'button';
      point.className = 's5-model-point';
      if (row.on_frontier) point.dataset.frontier = 'true';
      if (selectedModelId === row.id) point.dataset.selected = 'true';
      point.style.left = `${x * 100}%`;
      point.style.top = `${y * 100}%`;
      point.dataset.modelId = row.id;
      point.textContent = shortName(row);
      point.title = `${row.provider} · ${row.model} · ${row.variant}`;
      point.setAttribute('aria-label', strings.point(`${row.provider} ${row.model} ${row.variant}`, formatCurrency(row.scenario.costPerRequest, 3), formatNumber(row.intelligence_index, 0)));
      point.addEventListener('click', () => {
        selectedModelId = row.id;
        renderFocus(row);
        renderChart(rows, state);
      });
      chartPoints.append(point);
      pointItems.push({ row, point, x, y });
    }
    placeChartLabels(pointItems);
  }

  function shortName(row) {
    if (row.model.includes('Opus')) return 'Opus 5';
    if (row.model.includes('Sol')) return 'Sol';
    if (row.model.includes('Terra')) return 'Terra';
    if (row.model.includes('Luna')) return 'Luna';
    if (row.model.includes('Gemini')) return 'Gemini 3.6';
    return row.model;
  }

  function renderTable(rows) {
    if (!tableBody) return;
    tableBody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" class="s5-model-table__empty">${escapeHtml(strings.noModels)}</td>`;
      tableBody.append(tr);
      return;
    }

    for (const row of rows) {
      const tr = document.createElement('tr');
      if (row.on_frontier) tr.dataset.frontier = 'true';
      const signal = row.on_frontier ? strings.frontier : strings.notFrontier;
      tr.innerHTML = `
        <td><strong>${escapeHtml(row.model)}</strong><small>${escapeHtml(row.provider)} · ${escapeHtml(row.variant)}</small></td>
        <td>${escapeHtml(formatCurrency(row.scenario.costPerRequest, row.scenario.costPerRequest < .01 ? 4 : 3))}${row.scenario.longContextActive ? `<small>${escapeHtml(strings.longContext)}</small>` : ''}</td>
        <td>${escapeHtml(formatNumber(row.intelligence_index, 0))}</td>
        <td>${escapeHtml(formatNumber(row.output_tokens_per_second, 1))}</td>
        <td>${escapeHtml(formatNumber(row.ttft_seconds, 2))} s</td>
        <td>${escapeHtml(formatTokens(row.context_tokens))}</td>
        <td><span class="s5-model-signal">${escapeHtml(signal)}</span></td>`;
      tableBody.append(tr);
    }
  }

  function renderFocus(row) {
    if (!focus || !row) return;
    const price = api.resolvePricing(row, new Date());
    const future = row.future_price?.effective_from
      ? `<span>${escapeHtml(strings.futurePrice)}: ${escapeHtml(row.future_price.effective_from)} · ${escapeHtml(formatCurrency(row.future_price.input_usd_per_million, 2))}/${escapeHtml(formatCurrency(row.future_price.output_usd_per_million, 2))} MTok</span>`
      : '';
    focus.innerHTML = `
      <div class="s5-model-focus__title"><small>${escapeHtml(row.provider)}</small><strong>${escapeHtml(row.model)}</strong><span>${escapeHtml(row.variant)}</span></div>
      <div class="s5-model-focus__facts">
        <span>${escapeHtml(strings.intelligence)} <strong>${escapeHtml(formatNumber(row.intelligence_index, 0))}</strong></span>
        <span>${escapeHtml(strings.speed)} <strong>${escapeHtml(formatNumber(row.output_tokens_per_second, 1))} tok/s</strong></span>
        <span>${escapeHtml(strings.latency)} <strong>${escapeHtml(formatNumber(row.ttft_seconds, 2))} s</strong></span>
        <span>${escapeHtml(strings.context)} <strong>${escapeHtml(formatTokens(row.context_tokens))}</strong></span>
      </div>
      <div class="s5-model-focus__sources">
        <span>${escapeHtml(strings.currentPrice)}: ${escapeHtml(formatCurrency(price.input, 2))}/${escapeHtml(formatCurrency(price.output, 2))} MTok</span>
        ${future}
        <a href="${escapeAttribute(row.sources.specs_pricing.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.priceSource)} · ${escapeHtml(strings.verified)} ${escapeHtml(row.sources.specs_pricing.verified_on)}</a>
        <a href="${escapeAttribute(row.sources.benchmark.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.benchmarkSource)} · ${escapeHtml(strings.verified)} ${escapeHtml(row.sources.benchmark.verified_on)}</a>
      </div>`;
  }

  function renderSources() {
    const container = root.querySelector('[data-model-sources]');
    if (!container || !data) return;
    container.replaceChildren();
    for (const model of data.models) {
      const row = document.createElement('div');
      row.className = 's5-model-source-row';
      row.innerHTML = `<strong>${escapeHtml(model.provider)} · ${escapeHtml(model.model)} · ${escapeHtml(model.variant)}</strong>
        <span><a href="${escapeAttribute(model.sources.specs_pricing.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.priceSource)}</a> · ${escapeHtml(model.sources.specs_pricing.verified_on)}</span>
        <span><a href="${escapeAttribute(model.sources.benchmark.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.benchmarkSource)}</a> · ${escapeHtml(model.sources.benchmark.verified_on)}</span>`;
      container.append(row);
    }
  }

  function render() {
    if (!data) return;
    const { state, rows } = activeRows();
    renderSummary(rows);
    renderChart(rows, state);
    renderTable(rows);
    if (!selectedModelId || !rows.some((row) => row.id === selectedModelId)) selectedModelId = rows[0]?.id || null;
    const selected = rows.find((row) => row.id === selectedModelId) || rows[0];
    if (selected) renderFocus(selected);
    else if (focus) focus.innerHTML = '';
  }

  function scenarioUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    for (const [name, key] of Object.entries(params)) {
      const node = fields[name];
      if (!node) continue;
      url.searchParams.set(key, node.value);
    }
    return url;
  }

  function applyUrlState() {
    const query = new URLSearchParams(window.location.search);
    for (const [name, key] of Object.entries(params)) {
      if (query.has(key) && fields[name]) fields[name].value = query.get(key);
    }
  }

  async function share() {
    const url = scenarioUrl();
    history.replaceState({}, '', url);
    try {
      await navigator.clipboard.writeText(url.toString());
      setFeedback(strings.copied);
    } catch {
      setFeedback(strings.copyFailed);
    }
  }

  function exportCsv() {
    const { state, rows } = activeRows();
    const header = ['id','provider','model','variant','input_tokens','output_tokens','cost_usd_per_request','intelligence_index','output_tokens_per_second','ttft_seconds','context_tokens','frontier','pricing_source','benchmark_source'];
    const csvRows = rows.map((row) => [
      row.id, row.provider, row.model, row.variant, state.inputTokens, state.outputTokens,
      row.scenario.costPerRequest, row.intelligence_index ?? '', row.output_tokens_per_second ?? '', row.ttft_seconds ?? '',
      row.context_tokens ?? '', row.on_frontier, row.sources.specs_pricing.url, row.sources.benchmark.url
    ]);
    const csv = [header, ...csvRows].map((cells) => cells.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '5sigmas-model-price-performance.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function reset() {
    for (const [name, value] of Object.entries(defaults)) if (fields[name]) fields[name].value = value;
    history.replaceState({}, '', window.location.pathname);
    selectedModelId = null;
    setFeedback('');
    render();
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  async function initialize() {
    try {
      const response = await fetch('/assets/data/tools/model-price-performance.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      const providers = [...new Set(data.models.map((row) => row.provider))].sort();
      if (fields.provider) {
        fields.provider.innerHTML = `<option value="all">${escapeHtml(strings.allProviders)}</option>`;
        for (const provider of providers) {
          const option = document.createElement('option');
          option.value = provider;
          option.textContent = provider;
          fields.provider.append(option);
        }
      }
      applyUrlState();
      renderSources();
      render();
    } catch (error) {
      console.error('5sigmas model price/performance data failed to load', error);
      if (outputs.summarySentence) outputs.summarySentence.textContent = strings.noModels;
    }
  }

  root.querySelector('[data-s5-tool-form]')?.addEventListener('input', render);
  root.querySelector('[data-s5-tool-form]')?.addEventListener('change', render);
  root.querySelector('[data-action="share"]')?.addEventListener('click', share);
  root.querySelector('[data-action="export"]')?.addEventListener('click', exportCsv);
  root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);

  initialize();
})();