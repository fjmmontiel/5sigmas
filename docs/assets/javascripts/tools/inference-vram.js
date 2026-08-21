(() => {
  'use strict';

  const root = document.querySelector('[data-s5-inference-vram]');
  if (!root || !window.S5InferenceVram) return;

  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const strings = {
    es: {
      custom: 'Arquitectura personalizada', copied: 'Enlace copiado', copyFailed: 'No se pudo copiar; la URL ya contiene el escenario.',
      fits: 'Cabe en la VRAM configurada', doesNotFit: 'No cabe en la VRAM configurada', noHardware: 'Define VRAM por GPU para comprobar capacidad',
      architectureOk: 'Arquitectura coherente para esta aproximación', architectureWarn: 'Revisa la geometría de atención',
      withinPresetContext: 'Contexto dentro del máximo publicado del preset', overPresetContext: 'El contexto supera el máximo publicado del preset', customContext: 'Sin límite de contexto del preset',
      nominal: 'preset nominal', sourceVerified: 'verificado', scenario: 'Escenario 5sigmas — VRAM de inferencia',
      sequences: 'secuencias', tokens: 'tokens', idealSharding: 'por GPU con reparto ideal', noCapacity: '0 tokens',
      issues: {
        layers_not_integer: 'las capas deben ser enteras', attention_heads_not_integer: 'las cabezas de atención deben ser enteras',
        kv_heads_not_integer: 'las cabezas KV deben ser enteras', kv_heads_gt_attention_heads: 'hay más cabezas KV que cabezas de atención',
        attention_heads_not_divisible_by_kv_heads: 'las cabezas de atención no son divisibles por las cabezas KV',
        hidden_size_not_divisible_by_attention_heads: 'el tamaño oculto no es divisible por las cabezas de atención'
      }
    },
    en: {
      custom: 'Custom architecture', copied: 'Link copied', copyFailed: 'Could not copy; the URL already contains the scenario.',
      fits: 'Fits the configured VRAM', doesNotFit: 'Does not fit the configured VRAM', noHardware: 'Set VRAM per GPU to check capacity',
      architectureOk: 'Architecture is coherent for this approximation', architectureWarn: 'Check the attention geometry',
      withinPresetContext: 'Context is within the preset published maximum', overPresetContext: 'Context exceeds the preset published maximum', customContext: 'No preset context limit',
      nominal: 'nominal preset', sourceVerified: 'verified', scenario: '5sigmas scenario — inference VRAM',
      sequences: 'sequences', tokens: 'tokens', idealSharding: 'per GPU with ideal sharding', noCapacity: '0 tokens',
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
  let presetMap = new Map();
  let sourceMap = new Map();

  const defaults = {
    preset: 'meta-llama-3-1-8b', parametersB: 8, layers: 32, hiddenSize: 4096, attentionHeads: 32, kvHeads: 8,
    weightBits: 16, weightMetadataPct: 0, contextTokens: 8192, concurrentSequences: 1, kvBits: 16,
    runtimeOverheadPct: 10, devices: 1, gpuVramGiB: 24
  };
  const params = {
    preset: 'm', parametersB: 'p', layers: 'l', hiddenSize: 'h', attentionHeads: 'ah', kvHeads: 'kvh',
    weightBits: 'wb', weightMetadataPct: 'wm', contextTokens: 'ctx', concurrentSequences: 'seq', kvBits: 'kvb',
    runtimeOverheadPct: 'oh', devices: 'g', gpuVramGiB: 'vram'
  };

  const number = (name) => Number(fields[name]?.value ?? 0);
  const formatNumber = (value, digits = 1) => new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits }).format(Number(value) || 0);
  const formatGiB = (value) => `${formatNumber(value, value < 10 ? 2 : 1)} GiB`;
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
      parametersB: number('parametersB'), weightBits: number('weightBits'), weightMetadataPct: number('weightMetadataPct'),
      layers: number('layers'), hiddenSize: number('hiddenSize'), attentionHeads: number('attentionHeads'), kvHeads: number('kvHeads'),
      contextTokens: number('contextTokens'), concurrentSequences: number('concurrentSequences'), kvBits: number('kvBits'),
      runtimeOverheadPct: number('runtimeOverheadPct'), devices: number('devices'), gpuVramGiB: number('gpuVramGiB')
    };
  }

  function applyPreset(preset) {
    if (!preset) return;
    fields.parametersB.value = preset.parameters_b;
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

  function updateBreakdown(result) {
    const total = result.memory.totalGiB || 1;
    const parts = { weights: result.weights.totalGiB, kv: result.kv.totalGiB, runtime: result.runtime.overheadGiB };
    for (const [name, value] of Object.entries(parts)) {
      const bar = root.querySelector(`[data-memory-bar="${name}"]`);
      if (bar) bar.style.setProperty('--share', `${Math.max(0, (value / total) * 100)}%`);
    }
  }

  function render() {
    const result = window.S5InferenceVram.calculate(readScenario());
    const preset = selectedPreset();
    outputs.totalVram.textContent = formatGiB(result.memory.totalGiB);
    outputs.weights.textContent = formatGiB(result.weights.totalGiB);
    outputs.kvCache.textContent = formatGiB(result.kv.totalGiB);
    outputs.perDevice.textContent = formatGiB(result.memory.perDeviceGiB);
    outputs.perDeviceNote.textContent = `${formatNumber(result.normalized.devices, 0)} GPU · ${strings.idealSharding}`;
    outputs.kvPerToken.textContent = `${formatNumber(result.kv.mibPerTokenPerSequence, 3)} MiB`;
    outputs.maxContext.textContent = result.capacity.maxContextTokens == null ? '—' : `${formatNumber(result.capacity.maxContextTokens, 0)} ${strings.tokens}`;
    outputs.maxSequences.textContent = result.capacity.maxConcurrentSequences == null ? '—' : `${formatNumber(result.capacity.maxConcurrentSequences, 0)} ${strings.sequences}`;
    outputs.headDim.textContent = formatNumber(result.architecture.headDim, 2);
    outputs.gqaRatio.textContent = `${formatNumber(result.architecture.kvVsMhaRatio * 100, 1)}%`;
    outputs.headroom.textContent = result.memory.headroomPct == null ? '—' : `${result.memory.headroomPct >= 0 ? '+' : ''}${formatNumber(result.memory.headroomPct, 1)}%`;

    if (result.memory.fits === null) setStatus('fitStatus', 'neutral', strings.noHardware);
    else if (result.memory.fits) setStatus('fitStatus', 'good', `${strings.fits} · ${formatGiB(Math.max(0, result.memory.headroomGiB))}`);
    else setStatus('fitStatus', 'warn', `${strings.doesNotFit} · ${formatGiB(Math.abs(result.memory.headroomGiB))}`);

    if (result.architecture.valid) setStatus('architectureStatus', 'good', strings.architectureOk);
    else {
      const detail = result.architecture.issues.map((item) => strings.issues[item] || item).join(', ');
      setStatus('architectureStatus', 'warn', `${strings.architectureWarn} · ${detail}`);
    }

    if (!preset) setStatus('contextStatus', 'neutral', strings.customContext);
    else if (result.normalized.contextTokens <= preset.max_context_tokens) setStatus('contextStatus', 'good', strings.withinPresetContext);
    else setStatus('contextStatus', 'warn', `${strings.overPresetContext} · ${formatNumber(preset.max_context_tokens, 0)}`);

    updateBreakdown(result);
    updateSource(preset);
    return result;
  }

  function scenarioToUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    for (const [name, key] of Object.entries(params)) {
      if (fields[name]) url.searchParams.set(key, fields[name].value);
    }
    return url;
  }

  function applyUrlState() {
    const query = new URLSearchParams(window.location.search);
    for (const [name, key] of Object.entries(params)) {
      if (query.has(key) && fields[name]) fields[name].value = query.get(key);
    }
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

  function exportJson() {
    const preset = selectedPreset();
    const result = render();
    const payload = {
      title: strings.scenario,
      exported_at: new Date().toISOString(),
      preset: preset ? { id: preset.id, label: preset.label, source_ids: preset.source_ids } : { id: 'custom' },
      assumptions: result.normalized,
      architecture: result.architecture,
      result
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '5sigmas-inference-vram.json';
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
      console.error('5sigmas inference VRAM preset data failed to load', error);
      presetSelect.innerHTML = `<option value="custom">${strings.custom}</option>`;
      presetSelect.value = 'custom';
      render();
    }
  }

  form?.addEventListener('input', (event) => {
    if (event.target === presetSelect) return;
    if (['parametersB', 'layers', 'hiddenSize', 'attentionHeads', 'kvHeads'].includes(event.target?.dataset?.field)) presetSelect.value = 'custom';
    render();
  });
  presetSelect?.addEventListener('change', () => {
    const preset = selectedPreset();
    if (preset) applyPreset(preset);
    render();
  });
  root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
  root.querySelector('[data-action="share"]')?.addEventListener('click', share);
  root.querySelector('[data-action="export"]')?.addEventListener('click', exportJson);

  initialize();
})();
