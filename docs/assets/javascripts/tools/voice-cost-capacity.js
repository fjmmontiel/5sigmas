(() => {
  'use strict';

  const root = document.querySelector('[data-s5-voice-cost-capacity]');
  if (!root || !window.S5VoiceCostCapacityCore) return;

  const core = window.S5VoiceCostCapacityCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = {
    es: {
      copied: 'Enlace copiado.', copyFailed: 'No se pudo copiar automáticamente. Copia la URL del navegador.',
      reset: 'Escenario restablecido.', downloaded: 'JSON generado.', unlimited: 'Sin límite configurado',
      within: (n) => `${formatNumber(n, 1)} de margen`, over: (n) => `${formatNumber(Math.abs(n), 1)} por encima`,
      presetNote: 'Tarifas y supuestos públicos verificados el 21-08-2026; edítalos para reflejar tu contrato, región y arquitectura.'
    },
    en: {
      copied: 'Link copied.', copyFailed: 'Automatic copy failed. Copy the browser URL instead.',
      reset: 'Scenario reset.', downloaded: 'JSON generated.', unlimited: 'No limit configured',
      within: (n) => `${formatNumber(n, 1)} headroom`, over: (n) => `${formatNumber(Math.abs(n), 1)} over`,
      presetNote: 'Public rates and assumptions verified on 2026-08-21; edit them to match your contract, region and architecture.'
    }
  }[locale];

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((el) => [el.dataset.output, el]));
  const costRows = Object.fromEntries([...root.querySelectorAll('[data-cost-row]')].map((el) => [el.dataset.costRow, el]));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  let presetData = null;

  const paramMap = {
    callsPerMonth: 'c', averageCallMinutes: 'd', userSpeechPercent: 'u', agentSpeechPercent: 'a',
    serviceHoursPerMonth: 'h', peakConcurrency: 'p', targetWorkerUtilizationPercent: 'wu', sessionsPerWorker: 'sw',
    sttSessionsPerCall: 'ss', ttsGenerationDutyPercent: 'td', sttConcurrencyLimit: 'sl', ttsConcurrencyLimit: 'tl',
    telephonyUsdPerConnectedMinute: 'tp', mediaStreamUsdPerConnectedMinute: 'mp', sttUsdPerUserAudioMinute: 'sp',
    ttsUsdPer1000Characters: 'tts', charactersPerAgentMinute: 'ch', llmInputTokensPerCall: 'it',
    llmOutputTokensPerCall: 'ot', llmInputUsdPerMillionTokens: 'ip', llmOutputUsdPerMillionTokens: 'op', fixedUsdPerCall: 'fc'
  };

  function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  }

  function formatCompact(value) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }

  function formatUsd(value, digits = 2) {
    const options = { maximumFractionDigits: digits, minimumFractionDigits: digits };
    if (locale === 'es') return `${new Intl.NumberFormat('es-ES', options).format(value)} USD`;
    return new Intl.NumberFormat('en-US', { ...options, style: 'currency', currency: 'USD' }).format(value);
  }

  function number(name, fallback = 0) {
    const n = Number(fields[name]?.value);
    return Number.isFinite(n) ? n : fallback;
  }

  function currentInput() {
    return Object.fromEntries(Object.keys(paramMap).map((name) => [name, number(name)]));
  }

  function setField(name, value) {
    if (fields[name] && value !== undefined && value !== null) fields[name].value = String(value);
  }

  function setFeedback(text) {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.hidden = false;
    clearTimeout(setFeedback.timer);
    setFeedback.timer = setTimeout(() => { feedback.hidden = true; }, 2400);
  }

  function presetToInput(preset) {
    const t = preset.traffic || {};
    const c = preset.capacity || {};
    const r = preset.rates || {};
    return {
      callsPerMonth: t.calls_per_month,
      averageCallMinutes: t.average_call_minutes,
      userSpeechPercent: t.user_speech_percent,
      agentSpeechPercent: t.agent_speech_percent,
      serviceHoursPerMonth: t.service_hours_per_month,
      peakConcurrency: t.peak_concurrency,
      targetWorkerUtilizationPercent: c.target_worker_utilization_percent,
      sessionsPerWorker: c.sessions_per_worker,
      sttSessionsPerCall: c.stt_sessions_per_call,
      ttsGenerationDutyPercent: c.tts_generation_duty_percent,
      sttConcurrencyLimit: c.stt_concurrency_limit,
      ttsConcurrencyLimit: c.tts_concurrency_limit,
      telephonyUsdPerConnectedMinute: r.telephony_usd_per_connected_minute,
      mediaStreamUsdPerConnectedMinute: r.media_stream_usd_per_connected_minute,
      sttUsdPerUserAudioMinute: r.stt_usd_per_user_audio_minute,
      ttsUsdPer1000Characters: r.tts_usd_per_1000_characters,
      charactersPerAgentMinute: r.characters_per_agent_minute,
      llmInputTokensPerCall: r.llm_input_tokens_per_call,
      llmOutputTokensPerCall: r.llm_output_tokens_per_call,
      llmInputUsdPerMillionTokens: r.llm_input_usd_per_million_tokens,
      llmOutputUsdPerMillionTokens: r.llm_output_usd_per_million_tokens,
      fixedUsdPerCall: r.fixed_usd_per_call
    };
  }

  function applyInput(input) {
    Object.entries(input).forEach(([name, value]) => setField(name, value));
  }

  function quotaText(q) {
    if (!q.configured) return copy.unlimited;
    return q.within ? copy.within(q.headroom) : copy.over(q.headroom);
  }

  function renderCostRows(result) {
    const labels = {
      telephony: locale === 'es' ? 'Telefonía' : 'Telephony',
      media: 'Media Streams', stt: 'STT', tts: 'TTS', llm: 'LLM',
      fixed: locale === 'es' ? 'Coste fijo por llamada' : 'Fixed per-call cost'
    };
    let largestKey = null;
    let largestValue = -1;
    Object.entries(result.costs.shares).forEach(([key, share]) => {
      const row = costRows[key];
      if (!row) return;
      const value = result.costs[key];
      if (value > largestValue) { largestValue = value; largestKey = key; }
      row.style.setProperty('--share', `${Math.max(0, Math.min(100, share * 100))}%`);
      const amount = row.querySelector('[data-cost-amount]');
      const shareEl = row.querySelector('[data-cost-share]');
      if (amount) amount.textContent = formatUsd(value);
      if (shareEl) shareEl.textContent = `${formatNumber(share * 100, 1)}%`;
    });
    outputs.largestCost.textContent = largestKey ? `${labels[largestKey]} · ${formatUsd(largestValue)}` : '—';
  }

  function render() {
    const result = core.evaluate(currentInput());
    outputs.monthlyCost.textContent = formatUsd(result.costs.total, 0);
    outputs.costPerCall.textContent = formatUsd(result.costs.perCall, 3);
    outputs.costPerMinute.textContent = formatUsd(result.costs.perConnectedMinute, 3);
    outputs.connectedMinutes.textContent = `${formatCompact(result.usage.connectedMinutes)} min`;
    outputs.userMinutes.textContent = `${formatCompact(result.usage.userAudioMinutes)} min`;
    outputs.agentMinutes.textContent = `${formatCompact(result.usage.agentAudioMinutes)} min`;
    outputs.averageConcurrency.textContent = formatNumber(result.capacity.averageConcurrency, 1);
    outputs.peakRatio.textContent = `${formatNumber(result.capacity.peakToAverage, 1)}×`;
    outputs.workers.textContent = String(result.capacity.workersRequired);
    outputs.workerRead.textContent = `${formatNumber(result.capacity.targetSessionsPerWorker, 1)} / ${result.input.sessionsPerWorker}`;
    outputs.sttStreams.textContent = formatNumber(result.capacity.expectedConcurrentSttSessionsAtPeak, 1);
    outputs.ttsStreams.textContent = formatNumber(result.capacity.expectedConcurrentTtsRequestsAtPeak, 1);
    outputs.sttQuota.textContent = quotaText(result.capacity.sttQuota);
    outputs.ttsQuota.textContent = quotaText(result.capacity.ttsQuota);
    outputs.sttQuota.dataset.state = result.capacity.sttQuota.within === false ? 'over' : 'ok';
    outputs.ttsQuota.dataset.state = result.capacity.ttsQuota.within === false ? 'over' : 'ok';
    renderCostRows(result);
    return result;
  }

  function scenarioUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    const input = core.normalize(currentInput());
    Object.entries(paramMap).forEach(([name, key]) => url.searchParams.set(key, String(input[name])));
    return url.toString();
  }

  function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let touched = false;
    Object.entries(paramMap).forEach(([name, key]) => {
      if (!params.has(key)) return;
      setField(name, params.get(key));
      touched = true;
    });
    return touched;
  }

  function exportJson() {
    const result = render();
    const payload = {
      schema_version: 2,
      tool: '5sigmas-voice-cost-capacity',
      exported_at: new Date().toISOString(),
      source_snapshot: presetData ? { updated_at: presetData.updated_at, preset: presetData.presets?.[0]?.id } : null,
      scenario: result
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '5sigmas-voice-cost-capacity.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    setFeedback(copy.downloaded);
  }

  async function loadPresetData() {
    const response = await fetch('/assets/data/tools/voice-cost-capacity-presets.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`preset data ${response.status}`);
    presetData = await response.json();
    const preset = presetData.presets?.[0];
    if (preset) {
      if (fields.presetLabel) fields.presetLabel.textContent = locale === 'es' ? preset.label_es : preset.label_en;
      if (outputs.sourceUpdated) outputs.sourceUpdated.textContent = presetData.updated_at;
      if (outputs.presetNote) outputs.presetNote.textContent = copy.presetNote;
      if (!restoreFromUrl()) applyInput(presetToInput(preset));
    }
    render();
  }

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-field]')) render();
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-field]')) render();
  });

  root.querySelector('[data-action="share"]')?.addEventListener('click', async () => {
    const url = scenarioUrl();
    history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url); setFeedback(copy.copied); }
    catch { setFeedback(copy.copyFailed); }
  });

  root.querySelector('[data-action="export"]')?.addEventListener('click', exportJson);
  root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    const preset = presetData?.presets?.[0];
    if (preset) applyInput(presetToInput(preset));
    history.replaceState(null, '', window.location.pathname);
    render();
    setFeedback(copy.reset);
  });

  loadPresetData().catch(() => {
    restoreFromUrl();
    render();
  });
})();
