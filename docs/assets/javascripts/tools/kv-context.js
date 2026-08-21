(() => {
  'use strict';

  const root = document.querySelector('[data-s5-kv-context]');
  if (!root || !window.S5KvContext) return;

  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const strings = {
    es: {
      custom: 'Arquitectura personalizada', copied: 'Enlace copiado', copyFailed: 'No se pudo copiar; la URL ya contiene el escenario.',
      fits: 'Dentro del presupuesto de KV', doesNotFit: 'Supera el presupuesto de KV', noBudget: 'Define un presupuesto de KV para comprobar capacidad',
      architectureOk: 'Arquitectura coherente para esta aproximación', architectureWarn: 'Revisa la geometría de atención',
      withinPresetContext: 'Contexto dentro del máximo publicado del preset', overPresetContext: 'El contexto supera el máximo publicado del preset', customContext: 'Sin límite de contexto del preset',
      sourceVerified: 'verificado', idealBudget: 'presupuesto de KV', tokens: 'tokens', sequences: 'secuencias', scenario: 'Escenario 5sigmas — KV cache y contexto',
      curveKv: 'KV con la geometría seleccionada', curveMha: 'KV con MHA completo', curveBudget: 'Presupuesto de KV',
      issues: {
        layers_not_integer: 'las capas deben ser enteras', attention_heads_not_integer: 'las cabezas de atención deben ser enteras',
        kv_heads_not_integer: 'las cabezas KV deben ser enteras', kv_heads_gt_attention_heads: 'hay más cabezas KV que cabezas de atención',
        attention_heads_not_divisible_by_kv_heads: 'las cabezas de atención no son divisibles por las cabezas KV',
        hidden_size_not_divisible_by_attention_heads: 'el tamaño oculto no es divisible por las cabezas de atención'
      }
    },
    en: {
      custom: 'Custom architecture', copied: 'Link copied', copyFailed: 'Could not copy; the URL already contains the scenario.',
      fits: 'Within the KV budget', doesNotFit: 'Exceeds the KV budget', noBudget: 'Set a KV budget to check capacity',
      architectureOk: 'Architecture is coherent for this approximation', architectureWarn: 'Check the attention geometry',
      withinPresetContext: 'Context is within the preset published maximum', overPresetContext: 'Context exceeds the preset published maximum', customContext: 'No preset context limit',
      sourceVerified: 'verified', idealBudget: 'KV budget', tokens: 'tokens', sequences: 'sequences', scenario: '5sigmas scenario — KV cache and context',
      curveKv: 'KV with selected geometry', curveMha: 'KV with full MHA', curveBudget: 'KV budget',
      issues: {
        layers_not_integer: 'layers must be integers', attention_heads_not_integer: 'attention heads must be integers',
        kv_heads_not_integer: 'KV heads must be integers', kv_heads_gt_attention_heads: 'KV heads exceed attention heads',
        attention_heads_not_divisible_by_kv_heads: 'attention heads are not divisible by KV heads',
        hidden_size_not_divisible_by_attention_heads: 'hidden size is not divisible by attention heads'
      }
    }
  }[locale];

  const form = root.querySelector('[data-s5-tool-form]');
  const presetSelect = root.querySelector('[data-field="preset"]');
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((node) => [node.dataset.field, node]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((node) => [node.dataset.output, node]));
  const chart = root.querySelector('[data-kv-chart]');
  let presetMap = new Map();
  let sourceMap = new Map();
  let lastCurve = [];

  const defaults = {
    preset: 'meta-llama-3-1-8b', layers: 32, hiddenSize: 4096, attentionHeads: 32, kvHeads: 8,
    kvBits: 16, contextTokens: 8192, concurrentSequences: 1, kvBudgetGiB: 16
  };
  const params = {
    preset: 'm', layers: 'l', hiddenSize: 'h', attentionHeads: 'ah', kvHeads: 'kvh', kvBits: 'kvb',
    contextTokens: 'ctx', concurrentSequences: 'seq', kvBudgetGiB: 'budget'
  };

  const number = (name) => Number(fields[name]?.value ?? 0);
  const formatter = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 2 });
  const integerFormatter = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 });
  const formatGiB = (value) => `${formatter.format(Number(value) || 0)} GiB`;
  const formatMiB = (value) => `${formatter.format(Number(value) || 0)} MiB`;
  const selectedPreset = () => presetMap.get(presetSelect?.value) || null;

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

  function readScenario() {
    return {
      layers: number('layers'), hiddenSize: number('hiddenSize'), attentionHeads: number('attentionHeads'), kvHeads: number('kvHeads'),
      kvBits: number('kvBits'), contextTokens: number('contextTokens'), concurrentSequences: number('concurrentSequences'), kvBudgetGiB: number('kvBudgetGiB')
    };
  }

  function applyPreset(preset) {
    if (!preset) return;
    fields.layers.value = preset.layers;
    fields.hiddenSize.value = preset.hidden_size;
    fields.attentionHeads.value = preset.attention_heads;
    fields.kvHeads.value = preset.kv_heads;
  }

  function updateSource(preset) {
    if (!outputs.sourceLink || !outputs.sourceDate || !outputs.sourceNote) return;
    if (!preset) {
      outputs.sourceLink.textContent = strings.custom;
      outputs.sourceLink.removeAttribute('href');
      outputs.sourceDate.textContent = '';
      outputs.sourceNote.textContent = '';
      return;
    }
    const source = sourceMap.get(preset.source_ids?.[0]);
    outputs.sourceLink.textContent = source ? `${source.organization} · ${source.title}` : preset.label;
    if (source) outputs.sourceLink.href = source.url;
    outputs.sourceDate.textContent = source ? `${strings.sourceVerified}: ${source.verified_on}` : '';
    outputs.sourceNote.textContent = preset[locale === 'es' ? 'note_es' : 'note_en'] || '';
  }

  function makeContexts(result, preset) {
    const selected = Math.max(1024, result.normalized.contextTokens || 1024);
    const published = preset?.max_context_tokens || 0;
    const capacity = result.budget.maxContextTokens || 0;
    const maxTarget = Math.min(2_097_152, Math.max(131072, selected * 2, published * 2, capacity ? Math.min(capacity * 1.25, 2_097_152) : 0));
    const points = [];
    for (let value = 1024; value <= maxTarget; value *= 2) points.push(value);
    if (!points.includes(selected)) points.push(selected);
    if (published && !points.includes(published)) points.push(published);
    return [...new Set(points)].sort((a, b) => a - b);
  }

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  }

  function renderChart(result, preset) {
    if (!chart) return;
    const contexts = makeContexts(result, preset);
    lastCurve = window.S5KvContext.curve(readScenario(), contexts);
    const width = 760;
    const height = 320;
    const pad = { left: 54, right: 18, top: 18, bottom: 42 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const xMin = Math.log2(Math.max(1, contexts[0]));
    const xMax = Math.log2(Math.max(...contexts));
    const curveMax = Math.max(...lastCurve.flatMap((point) => [point.kvGiB, point.mhaGiB]), result.normalized.kvBudgetGiB || 0, 1);
    const yMax = curveMax * 1.08;
    const x = (tokens) => pad.left + ((Math.log2(Math.max(1, tokens)) - xMin) / Math.max(1e-9, xMax - xMin)) * innerW;
    const y = (gib) => pad.top + innerH - (gib / yMax) * innerH;

    chart.innerHTML = '';
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    chart.setAttribute('role', 'img');

    for (let i = 0; i <= 4; i += 1) {
      const value = (yMax * i) / 4;
      const yy = y(value);
      chart.append(svgEl('line', { x1: pad.left, x2: width - pad.right, y1: yy, y2: yy, class: 's5-kv-chart__grid' }));
      const label = svgEl('text', { x: pad.left - 8, y: yy + 4, 'text-anchor': 'end', class: 's5-kv-chart__axis-label' });
      label.textContent = `${formatter.format(value)} GiB`;
      chart.append(label);
    }

    const tickIndexes = [...new Set([0, Math.floor((contexts.length - 1) / 3), Math.floor((contexts.length - 1) * 2 / 3), contexts.length - 1])];
    for (const index of tickIndexes) {
      const tokens = contexts[index];
      const xx = x(tokens);
      chart.append(svgEl('line', { x1: xx, x2: xx, y1: pad.top, y2: height - pad.bottom, class: 's5-kv-chart__grid s5-kv-chart__grid--vertical' }));
      const label = svgEl('text', { x: xx, y: height - 14, 'text-anchor': 'middle', class: 's5-kv-chart__axis-label' });
      label.textContent = tokens >= 1024 ? `${formatter.format(tokens / 1024)}K` : String(tokens);
      chart.append(label);
    }

    if (result.normalized.kvBudgetGiB > 0) {
      const budgetY = y(result.normalized.kvBudgetGiB);
      chart.append(svgEl('line', { x1: pad.left, x2: width - pad.right, y1: budgetY, y2: budgetY, class: 's5-kv-chart__budget' }));
    }

    const selectedPoints = lastCurve.map((point) => `${x(point.contextTokens)},${y(point.kvGiB)}`).join(' ');
    const mhaPoints = lastCurve.map((point) => `${x(point.contextTokens)},${y(point.mhaGiB)}`).join(' ');
    chart.append(svgEl('polyline', { points: mhaPoints, class: 's5-kv-chart__line s5-kv-chart__line--mha', fill: 'none' }));
    chart.append(svgEl('polyline', { points: selectedPoints, class: 's5-kv-chart__line s5-kv-chart__line--selected', fill: 'none' }));

    const current = lastCurve.find((point) => point.contextTokens === result.normalized.contextTokens) || {
      contextTokens: result.normalized.contextTokens, kvGiB: result.selected.gib
    };
    chart.append(svgEl('circle', { cx: x(current.contextTokens), cy: y(current.kvGiB), r: 5, class: 's5-kv-chart__point' }));

    if (preset?.max_context_tokens) {
      const markerX = x(Math.min(preset.max_context_tokens, Math.max(...contexts)));
      chart.append(svgEl('line', { x1: markerX, x2: markerX, y1: pad.top, y2: height - pad.bottom, class: 's5-kv-chart__preset' }));
    }
  }

  function render() {
    const result = window.S5KvContext.calculate(readScenario());
    const preset = selectedPreset();
    outputs.kvTotal.textContent = formatGiB(result.selected.gib);
    outputs.kvPerToken.textContent = formatMiB(result.perToken.mib);
    outputs.residentTokens.textContent = `${integerFormatter.format(result.selected.residentTokens)} ${strings.tokens}`;
    outputs.budgetUse.textContent = result.budget.utilization == null ? '—' : `${formatter.format(result.budget.utilization * 100)}%`;
    outputs.maxContext.textContent = result.budget.maxContextTokens == null ? '—' : `${integerFormatter.format(result.budget.maxContextTokens)} ${strings.tokens}`;
    outputs.maxSequences.textContent = result.budget.maxConcurrentSequences == null ? '—' : `${integerFormatter.format(result.budget.maxConcurrentSequences)} ${strings.sequences}`;
    outputs.gqaRatio.textContent = `${formatter.format(result.architecture.kvVsMhaRatio * 100)}%`;
    outputs.gqaSaved.textContent = `${formatter.format((1 - result.architecture.kvVsMhaRatio) * 100)}%`;
    outputs.mhaKv.textContent = formatGiB(result.selected.mhaGiB);
    outputs.headDim.textContent = formatter.format(result.architecture.headDim);

    if (result.budget.fits === null) setStatus('budgetStatus', 'neutral', strings.noBudget);
    else if (result.budget.fits) setStatus('budgetStatus', 'good', `${strings.fits} · ${formatGiB(Math.max(0, result.budget.headroomGiB))}`);
    else setStatus('budgetStatus', 'warn', `${strings.doesNotFit} · ${formatGiB(Math.abs(result.budget.headroomGiB))}`);

    if (result.architecture.valid) setStatus('architectureStatus', 'good', strings.architectureOk);
    else {
      const detail = result.architecture.issues.map((item) => strings.issues[item] || item).join(', ');
      setStatus('architectureStatus', 'warn', `${strings.architectureWarn} · ${detail}`);
    }

    if (!preset) setStatus('contextStatus', 'neutral', strings.customContext);
    else if (result.normalized.contextTokens <= preset.max_context_tokens) setStatus('contextStatus', 'good', strings.withinPresetContext);
    else setStatus('contextStatus', 'warn', `${strings.overPresetContext} · ${integerFormatter.format(preset.max_context_tokens)} ${strings.tokens}`);

    updateSource(preset);
    renderChart(result, preset);
    return result;
  }

  function scenarioToUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    for (const [name, key] of Object.entries(params)) if (fields[name]) url.searchParams.set(key, fields[name].value);
    return url;
  }

  function applyUrlState() {
    const query = new URLSearchParams(window.location.search);
    for (const [name, key] of Object.entries(params)) if (query.has(key) && fields[name]) fields[name].value = query.get(key);
  }

  function reset() {
    presetSelect.value = defaults.preset;
    applyPreset(presetMap.get(defaults.preset));
    for (const [name, value] of Object.entries(defaults)) {
      if (name === 'preset' || !fields[name]) continue;
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

  function exportCsv() {
    render();
    const headers = ['context_tokens', 'kv_gib_selected', 'kv_gib_full_mha'];
    const rows = lastCurve.map((point) => [point.contextTokens, point.kvGiB, point.mhaGiB]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '5sigmas-kv-cache-context.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function initialize() {
    try {
      const response = await fetch('/assets/data/tools/inference-vram-presets.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      presetMap = new Map(data.presets.map((item) => [item.id, item]));
      sourceMap = new Map(data.sources.map((item) => [item.id, item]));
      for (const item of data.presets) {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.label;
        presetSelect.append(option);
      }
      const custom = document.createElement('option');
      custom.value = 'custom';
      custom.textContent = strings.custom;
      presetSelect.append(custom);
      presetSelect.value = defaults.preset;
      applyPreset(presetMap.get(defaults.preset));
      applyUrlState();
      render();
    } catch (error) {
      console.error('5sigmas KV context preset data failed to load', error);
      presetSelect.innerHTML = `<option value="custom">${strings.custom}</option>`;
      presetSelect.value = 'custom';
      render();
    }
  }

  form?.addEventListener('input', (event) => {
    if (event.target === presetSelect) return;
    if (['layers', 'hiddenSize', 'attentionHeads', 'kvHeads'].includes(event.target?.dataset?.field)) presetSelect.value = 'custom';
    render();
  });
  presetSelect?.addEventListener('change', () => {
    const preset = selectedPreset();
    if (preset) applyPreset(preset);
    render();
  });
  root.querySelectorAll('[data-context-preset]').forEach((button) => button.addEventListener('click', () => {
    fields.contextTokens.value = button.dataset.contextPreset;
    render();
  }));
  root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
  root.querySelector('[data-action="share"]')?.addEventListener('click', share);
  root.querySelector('[data-action="export"]')?.addEventListener('click', exportCsv);

  initialize();
})();
