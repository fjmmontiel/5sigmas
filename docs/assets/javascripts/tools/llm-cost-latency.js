(() => {
  'use strict';

  const root = document.querySelector('[data-s5-llm-calculator]');
  if (!root || !window.S5LlmCostLatency) return;

  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const strings = {
    es: {
      custom: 'Personalizado',
      copied: 'Enlace copiado',
      copyFailed: 'No se pudo copiar; la URL ya contiene el escenario.',
      noCacheRate: 'Este preset no codifica una tarifa específica de lectura de caché. Se usa la tarifa de entrada como aproximación conservadora hasta que introduzcas una tarifa manual.',
      longContext: 'Se ha activado el ajuste de precio por contexto largo del proveedor.',
      scheduledPrice: 'La tarifa efectiva desde {date} se ha aplicado automáticamente.',
      withinBudget: 'Dentro del presupuesto',
      overBudget: 'Supera el presupuesto',
      noBudget: 'Sin presupuesto objetivo',
      withinLatency: 'Cumple el objetivo de latencia',
      overLatency: 'Supera el objetivo de latencia',
      noLatency: 'Sin objetivo de latencia',
      enoughCapacity: 'Concurrencia suficiente para la carga media',
      lowCapacity: 'Concurrencia insuficiente para la carga media',
      noCapacity: 'Define concurrencia para estimar capacidad',
      margin: 'margen',
      overBy: 'exceso',
      updated: 'verificado',
      requests: 'solicitudes/mes',
      scenario: 'Escenario 5sigmas — coste y latencia de LLMs'
    },
    en: {
      custom: 'Custom',
      copied: 'Link copied',
      copyFailed: 'Could not copy; the URL already contains the scenario.',
      noCacheRate: 'This preset does not encode a specific cache-read rate. The input rate is used as a conservative approximation until you enter a manual cache rate.',
      longContext: 'The provider long-context pricing adjustment is active.',
      scheduledPrice: 'The rate effective from {date} has been applied automatically.',
      withinBudget: 'Within budget',
      overBudget: 'Over budget',
      noBudget: 'No budget target',
      withinLatency: 'Within latency target',
      overLatency: 'Over latency target',
      noLatency: 'No latency target',
      enoughCapacity: 'Enough concurrency for average load',
      lowCapacity: 'Not enough concurrency for average load',
      noCapacity: 'Set concurrency to estimate capacity',
      margin: 'margin',
      overBy: 'over by',
      updated: 'verified',
      requests: 'requests/month',
      scenario: '5sigmas scenario — LLM cost and latency'
    }
  }[locale];

  const form = root.querySelector('[data-s5-tool-form]');
  const modelSelect = root.querySelector('[data-field="model"]');
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const fields = Object.fromEntries(
    [...root.querySelectorAll('[data-field]')].map((node) => [node.dataset.field, node])
  );
  const outputs = Object.fromEntries(
    [...root.querySelectorAll('[data-output]')].map((node) => [node.dataset.output, node])
  );
  let pricingData = null;
  let presetMap = new Map();

  const defaults = {
    model: 'openai-gpt-5-6-terra',
    inputTokens: 4000,
    outputTokens: 500,
    cacheHitRate: 50,
    requestsPerMinute: 10,
    activeHoursPerDay: 8,
    daysPerMonth: 22,
    ttftMs: 650,
    tokensPerSecond: 60,
    concurrency: 3,
    monthlyBudgetUsd: 1500,
    latencyTargetMs: 10000
  };

  const params = {
    model: 'm', inputTokens: 'in', outputTokens: 'out', cacheHitRate: 'cache',
    requestsPerMinute: 'rpm', activeHoursPerDay: 'hrs', daysPerMonth: 'days',
    ttftMs: 'ttft', tokensPerSecond: 'tps', concurrency: 'conc',
    monthlyBudgetUsd: 'budget', latencyTargetMs: 'target',
    inputPrice: 'pin', cachedInputPrice: 'pcache', outputPrice: 'pout'
  };

  const number = (name) => Number(fields[name]?.value ?? 0);
  const preset = () => presetMap.get(modelSelect?.value) || null;
  const activePreset = (selected) => window.S5LlmCostLatency.resolvePricing(selected, new Date());
  const formatCurrency = (value, digits = 2) => new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits
  }).format(Number(value) || 0);
  const formatNumber = (value, digits = 1) => new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    maximumFractionDigits: digits
  }).format(Number(value) || 0);
  const formatDuration = (ms) => {
    if (ms < 1000) return `${formatNumber(ms, 0)} ms`;
    return `${formatNumber(ms / 1000, 2)} s`;
  };

  function setFeedback(message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function setStatus(name, state, text) {
    const node = outputs[name];
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
  }

  function updatePriceFieldsFromPreset(selected, preserveCacheRate = false) {
    if (!selected) return;
    const active = activePreset(selected);
    fields.inputPrice.value = active.input_usd_per_million;
    fields.outputPrice.value = active.output_usd_per_million;
    const hasCacheRate = active.cached_input_usd_per_million !== null && active.cached_input_usd_per_million !== undefined;
    fields.cachedInputPrice.value = hasCacheRate ? active.cached_input_usd_per_million : active.input_usd_per_million;
    if (!hasCacheRate && !preserveCacheRate) fields.cacheHitRate.value = 0;
  }

  function readScenario() {
    return {
      inputTokens: number('inputTokens'),
      outputTokens: number('outputTokens'),
      cacheHitRate: number('cacheHitRate'),
      requestsPerMinute: number('requestsPerMinute'),
      activeHoursPerDay: number('activeHoursPerDay'),
      daysPerMonth: number('daysPerMonth'),
      ttftMs: number('ttftMs'),
      tokensPerSecond: number('tokensPerSecond'),
      concurrency: number('concurrency'),
      monthlyBudgetUsd: number('monthlyBudgetUsd'),
      latencyTargetMs: number('latencyTargetMs'),
      inputPrice: number('inputPrice'),
      cachedInputPrice: number('cachedInputPrice'),
      outputPrice: number('outputPrice')
    };
  }

  function updateBreakdown(result) {
    const totalCost = result.cost.costPerRequest || 1;
    const costParts = {
      uncached: result.cost.uncachedInputCost,
      cached: result.cost.cachedInputCost,
      output: result.cost.outputCost
    };
    for (const [name, value] of Object.entries(costParts)) {
      const bar = root.querySelector(`[data-cost-bar="${name}"]`);
      if (bar) bar.style.setProperty('--share', `${Math.max(0, (value / totalCost) * 100)}%`);
    }

    const totalLatency = result.latency.responseTimeMs || 1;
    const ttft = root.querySelector('[data-latency-bar="ttft"]');
    const generation = root.querySelector('[data-latency-bar="generation"]');
    if (ttft) ttft.style.setProperty('--share', `${Math.max(0, (result.latency.ttftMs / totalLatency) * 100)}%`);
    if (generation) generation.style.setProperty('--share', `${Math.max(0, (result.latency.generationMs / totalLatency) * 100)}%`);
  }

  function updateSource(selected, result) {
    const sourceLink = outputs.sourceLink;
    const sourceDate = outputs.sourceDate;
    const sourceNote = outputs.sourceNote;
    if (!selected) {
      if (sourceLink) {
        sourceLink.textContent = strings.custom;
        sourceLink.removeAttribute('href');
      }
      if (sourceDate) sourceDate.textContent = '';
      if (sourceNote) sourceNote.textContent = '';
      return;
    }
    if (sourceLink) {
      sourceLink.textContent = `${selected.provider} · ${selected.model}`;
      sourceLink.href = selected.source.url;
    }
    if (sourceDate) sourceDate.textContent = `${strings.updated}: ${selected.source.verified_on}`;
    const notes = [selected.notes?.[locale] || ''];
    const active = activePreset(selected);
    if (active.cached_input_usd_per_million == null && number('cacheHitRate') > 0) notes.push(strings.noCacheRate);
    if (result.pricing.longContextActive) notes.push(strings.longContext);
    if (result.pricing.activePriceEffectiveFrom) {
      notes.push(strings.scheduledPrice.replace('{date}', result.pricing.activePriceEffectiveFrom));
    }
    if (sourceNote) sourceNote.textContent = notes.filter(Boolean).join(' ');
  }

  function render() {
    const selected = preset();
    const result = window.S5LlmCostLatency.calculate(readScenario(), selected);

    outputs.costPerRequest.textContent = formatCurrency(result.cost.costPerRequest, result.cost.costPerRequest < 0.01 ? 5 : 4);
    outputs.monthlyCost.textContent = formatCurrency(result.cost.monthlyCost, 0);
    outputs.requestsPerMonth.textContent = `${formatNumber(result.cost.requestsPerMonth, 0)} ${strings.requests}`;
    outputs.responseTime.textContent = formatDuration(result.latency.responseTimeMs);
    outputs.ttft.textContent = formatDuration(result.latency.ttftMs);
    outputs.generationTime.textContent = formatDuration(result.latency.generationMs);
    outputs.requiredConcurrency.textContent = formatNumber(result.capacity.requiredConcurrency, 2);
    outputs.capacityRpm.textContent = `${formatNumber(result.capacity.capacityRpm, 1)} rpm`;
    outputs.headroom.textContent = `${result.capacity.capacityHeadroomPct >= 0 ? '+' : ''}${formatNumber(result.capacity.capacityHeadroomPct, 0)}%`;

    if (result.cost.withinBudget === null) {
      setStatus('budgetStatus', 'neutral', strings.noBudget);
    } else if (result.cost.withinBudget) {
      setStatus('budgetStatus', 'good', `${strings.withinBudget} · ${strings.margin} ${formatCurrency(result.cost.budgetDeltaUsd, 0)}`);
    } else {
      setStatus('budgetStatus', 'warn', `${strings.overBudget} · ${strings.overBy} ${formatCurrency(Math.abs(result.cost.budgetDeltaUsd), 0)}`);
    }

    if (result.latency.withinTarget === null) {
      setStatus('latencyStatus', 'neutral', strings.noLatency);
    } else if (result.latency.withinTarget) {
      setStatus('latencyStatus', 'good', `${strings.withinLatency} · ${strings.margin} ${formatDuration(result.latency.latencyDeltaMs)}`);
    } else {
      setStatus('latencyStatus', 'warn', `${strings.overLatency} · ${strings.overBy} ${formatDuration(Math.abs(result.latency.latencyDeltaMs))}`);
    }

    if (result.capacity.enoughConcurrency === null) {
      setStatus('capacityStatus', 'neutral', strings.noCapacity);
    } else if (result.capacity.enoughConcurrency) {
      setStatus('capacityStatus', 'good', strings.enoughCapacity);
    } else {
      setStatus('capacityStatus', 'warn', strings.lowCapacity);
    }

    updateBreakdown(result);
    updateSource(selected, result);
    return result;
  }

  function scenarioToUrl() {
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
      if (!query.has(key) || !fields[name]) continue;
      fields[name].value = query.get(key);
    }
    if (query.has(params.model) && modelSelect) modelSelect.value = query.get(params.model);
  }

  function reset() {
    if (modelSelect) modelSelect.value = defaults.model;
    const selected = presetMap.get(defaults.model);
    if (selected) updatePriceFieldsFromPreset(selected);
    for (const [name, value] of Object.entries(defaults)) {
      if (name === 'model' || !fields[name]) continue;
      fields[name].value = value;
    }
    history.replaceState({}, '', window.location.pathname);
    setFeedback('');
    render();
  }

  async function share() {
    const url = scenarioToUrl();
    history.replaceState({}, '', url);
    try {
      await navigator.clipboard.writeText(url.toString());
      setFeedback(strings.copied);
    } catch {
      setFeedback(strings.copyFailed);
    }
  }

  function exportJson() {
    const selected = preset();
    const result = render();
    const payload = {
      title: strings.scenario,
      exported_at: new Date().toISOString(),
      preset: selected ? { id: selected.id, provider: selected.provider, model: selected.model, source: selected.source } : { id: 'custom' },
      assumptions: result.normalized,
      result
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '5sigmas-llm-cost-latency.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function initialize() {
    try {
      const response = await fetch('/assets/data/tools/llm-pricing.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      pricingData = await response.json();
      presetMap = new Map(pricingData.presets.map((item) => [item.id, item]));

      for (const item of pricingData.presets) {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.provider} · ${item.model}`;
        modelSelect.append(option);
      }
      const custom = document.createElement('option');
      custom.value = 'custom';
      custom.textContent = strings.custom;
      modelSelect.append(custom);

      modelSelect.value = defaults.model;
      updatePriceFieldsFromPreset(presetMap.get(defaults.model));
      applyUrlState();
      if (modelSelect.value !== 'custom' && presetMap.has(modelSelect.value)) {
        const selected = presetMap.get(modelSelect.value);
        const hasManualPrices = new URLSearchParams(window.location.search).has(params.inputPrice);
        if (!hasManualPrices) updatePriceFieldsFromPreset(selected, true);
      }
      render();
    } catch (error) {
      console.error('5sigmas LLM calculator pricing data failed to load', error);
      modelSelect.innerHTML = `<option value="custom">${strings.custom}</option>`;
      modelSelect.value = 'custom';
      render();
    }
  }

  form?.addEventListener('input', (event) => {
    if (event.target === modelSelect) return;
    render();
  });
  modelSelect?.addEventListener('change', () => {
    const selected = preset();
    if (selected) updatePriceFieldsFromPreset(selected);
    render();
  });
  root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
  root.querySelector('[data-action="share"]')?.addEventListener('click', share);
  root.querySelector('[data-action="export"]')?.addEventListener('click', exportJson);

  initialize();
})();
