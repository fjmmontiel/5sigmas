(function () {
  'use strict';

  const root = document.querySelector('[data-s5-context-budget]');
  if (!root || !window.S5ContextBudget) return;

  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const core = window.S5ContextBudget;
  const form = root.querySelector('[data-s5-tool-form]');
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((el) => [el.dataset.output, el]));
  const bar = root.querySelector('[data-budget-bar]');
  const legend = root.querySelector('[data-budget-legend]');
  const pressure = root.querySelector('[data-budget-pressure]');

  const copy = {
    es: {
      fits: 'Cabe dentro del presupuesto',
      overflow: 'Supera el presupuesto',
      outputSafe: 'Reserva de salida protegida',
      outputConflict: 'Salida + margen consumen todo el contexto',
      noGrowth: 'Sin crecimiento automático',
      now: 'ya está bajo presión',
      turns: (n) => n === 1 ? '≈ 1 turno adicional' : `≈ ${n} turnos adicionales`,
      unlimited: 'sin presión por historial configurada',
      largest: 'Mayor bloque de entrada',
      recover: 'Reducción posible si recortas este bloque',
      noTrim: 'No hace falta recortar',
      copied: 'Enlace copiado.',
      copyFailed: 'No se pudo copiar automáticamente; la URL ya contiene el escenario.',
      reset: 'Escenario restablecido.',
      exported: 'JSON exportado.',
      labels: {
        systemTokens: 'Sistema', toolTokens: 'Herramientas', historyTokens: 'Historial', ragTokens: 'RAG', userTokens: 'Usuario', reservedOutput: 'Salida reservada', safetyTokens: 'Margen'
      }
    },
    en: {
      fits: 'Fits within the budget',
      overflow: 'Exceeds the budget',
      outputSafe: 'Output reserve protected',
      outputConflict: 'Output + safety consume the full context',
      noGrowth: 'No automatic growth',
      now: 'already under pressure',
      turns: (n) => n === 1 ? '≈ 1 additional turn' : `≈ ${n} additional turns`,
      unlimited: 'no configured history pressure',
      largest: 'Largest input block',
      recover: 'Possible reduction if you trim this block',
      noTrim: 'No trimming required',
      copied: 'Link copied.',
      copyFailed: 'Automatic copy failed; the URL already contains the scenario.',
      reset: 'Scenario reset.',
      exported: 'JSON exported.',
      labels: {
        systemTokens: 'System', toolTokens: 'Tools', historyTokens: 'History', ragTokens: 'RAG', userTokens: 'User', reservedOutput: 'Output reserve', safetyTokens: 'Safety'
      }
    }
  }[locale];

  const defaults = core.normalize({});
  const params = {
    contextLimit: 'c', reservedOutput: 'o', safetyTokens: 's', systemTokens: 'sys', toolTokens: 'tools', historyTokens: 'hist', ragTokens: 'rag', userTokens: 'usr', historyGrowthPerTurn: 'g'
  };

  function parseStateFromUrl() {
    const search = new URLSearchParams(location.search);
    for (const [key, short] of Object.entries(params)) {
      if (!fields[key] || !search.has(short)) continue;
      const value = Number(search.get(short));
      if (Number.isFinite(value) && value >= 0) fields[key].value = String(value);
    }
  }

  function readState() {
    const raw = {};
    for (const [key, el] of Object.entries(fields)) raw[key] = Number(el.value);
    return core.normalize(raw);
  }

  function fmtTokens(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return Math.round(n).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US');
  }

  function fmtPct(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  }

  function setOutput(name, text) {
    if (outputs[name]) outputs[name].textContent = text;
  }

  function renderBar(result) {
    if (!bar || !legend) return;
    bar.replaceChildren();
    legend.replaceChildren();
    const segments = [
      ['systemTokens', result.components.systemTokens],
      ['toolTokens', result.components.toolTokens],
      ['historyTokens', result.components.historyTokens],
      ['ragTokens', result.components.ragTokens],
      ['userTokens', result.components.userTokens],
      ['reservedOutput', result.reserve.output],
      ['safetyTokens', result.reserve.safety]
    ];
    for (const [key, tokens] of segments) {
      const share = Math.max(0, Math.min(1, tokens / result.context.limit));
      const segment = document.createElement('span');
      segment.dataset.segment = key;
      segment.style.setProperty('--share', `${share * 100}%`);
      segment.title = `${copy.labels[key]} · ${fmtTokens(tokens)}`;
      bar.appendChild(segment);

      const item = document.createElement('span');
      item.dataset.segment = key;
      item.textContent = `${copy.labels[key]} · ${fmtTokens(tokens)}`;
      legend.appendChild(item);
    }
    if (result.context.planned < result.context.limit) {
      const empty = document.createElement('span');
      empty.dataset.segment = 'free';
      empty.style.setProperty('--share', `${Math.max(0, (result.context.limit - result.context.planned) / result.context.limit) * 100}%`);
      empty.title = `${locale === 'es' ? 'Libre' : 'Free'} · ${fmtTokens(result.context.limit - result.context.planned)}`;
      bar.appendChild(empty);
    }
  }

  function renderPressure(result) {
    if (!pressure) return;
    pressure.replaceChildren();
    const largest = result.rankedComponents[0];
    const items = [];
    if (largest) items.push({ label: copy.largest, value: `${copy.labels[largest.key]} · ${fmtTokens(largest.tokens)} (${fmtPct(largest.shareOfInput)})` });
    if (result.context.overflowTokens > 0) {
      for (const candidate of result.possibleRecoveries.filter((item) => item.recoverableForCurrentOverflow > 0).slice(0, 3)) {
        items.push({ label: `${copy.recover} · ${copy.labels[candidate.key]}`, value: fmtTokens(candidate.recoverableForCurrentOverflow) });
      }
    } else {
      items.push({ label: copy.noTrim, value: `${fmtTokens(result.context.headroomTokens)} ${locale === 'es' ? 'tokens de margen total' : 'tokens total headroom'}` });
    }
    for (const item of items) {
      const row = document.createElement('div');
      const small = document.createElement('small');
      const strong = document.createElement('strong');
      small.textContent = item.label;
      strong.textContent = item.value;
      row.append(small, strong);
      pressure.appendChild(row);
    }
  }

  function render() {
    const result = core.calculate(readState());
    setOutput('planned', fmtTokens(result.context.planned));
    setOutput('limit', fmtTokens(result.context.limit));
    setOutput('availableInput', fmtTokens(result.input.available));
    setOutput('remainingInput', result.input.remaining >= 0 ? fmtTokens(result.input.remaining) : `−${fmtTokens(result.context.overflowTokens)}`);
    setOutput('utilization', fmtPct(result.context.utilization));
    setOutput('inputUse', fmtPct(result.input.utilization));
    setOutput('overflow', result.context.overflowTokens > 0 ? fmtTokens(result.context.overflowTokens) : '0');
    setOutput('largestBlock', result.rankedComponents[0] ? `${copy.labels[result.rankedComponents[0].key]} · ${fmtTokens(result.rankedComponents[0].tokens)}` : '—');
    setOutput('turns', result.growth.historyGrowthPerTurn === 0 ? copy.unlimited : (result.growth.turnsUntilPressure === 0 ? copy.now : copy.turns(result.growth.turnsUntilPressure)));

    const budgetStatus = outputs.budgetStatus;
    if (budgetStatus) {
      budgetStatus.textContent = result.context.fits ? copy.fits : `${copy.overflow} · ${fmtTokens(result.context.overflowTokens)}`;
      budgetStatus.dataset.state = result.context.fits ? 'good' : 'warn';
    }
    const reserveStatus = outputs.reserveStatus;
    if (reserveStatus) {
      const valid = result.reserve.total < result.context.limit;
      reserveStatus.textContent = valid ? copy.outputSafe : copy.outputConflict;
      reserveStatus.dataset.state = valid ? 'good' : 'warn';
    }
    const growthStatus = outputs.growthStatus;
    if (growthStatus) {
      growthStatus.textContent = result.growth.historyGrowthPerTurn === 0 ? copy.noGrowth : `${fmtTokens(result.growth.historyGrowthPerTurn)} / ${locale === 'es' ? 'turno' : 'turn'}`;
      growthStatus.dataset.state = result.context.fits ? 'good' : 'warn';
    }

    renderBar(result);
    renderPressure(result);
  }

  function scenarioUrl() {
    const url = new URL(location.href);
    url.search = '';
    const state = readState();
    for (const [key, short] of Object.entries(params)) {
      if (state[key] !== defaults[key]) url.searchParams.set(short, String(state[key]));
    }
    return url;
  }

  function showFeedback(text) {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.hidden = false;
    window.setTimeout(() => { feedback.hidden = true; }, 2600);
  }

  async function share() {
    const url = scenarioUrl();
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url.href);
      showFeedback(copy.copied);
    } catch (_) {
      showFeedback(copy.copyFailed);
    }
  }

  function exportJson() {
    const payload = {
      tool: '5sigmas-context-budget-planner',
      version: core.VERSION,
      generatedAt: new Date().toISOString(),
      locale,
      sourceUrl: scenarioUrl().href,
      scenario: core.scenarioSummary(readState())
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `5sigmas-context-budget-${locale}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(anchor.href);
    showFeedback(copy.exported);
  }

  function reset() {
    for (const [key, value] of Object.entries(defaults)) if (fields[key]) fields[key].value = String(value);
    history.replaceState(null, '', location.pathname);
    render();
    showFeedback(copy.reset);
  }

  root.querySelectorAll('[data-context-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      fields.contextLimit.value = button.dataset.contextPreset;
      render();
    });
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  root.querySelector('[data-action="share"]')?.addEventListener('click', share);
  root.querySelector('[data-action="export"]')?.addEventListener('click', exportJson);
  root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);

  parseStateFromUrl();
  render();
})();
