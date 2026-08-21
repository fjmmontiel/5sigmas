(() => {
  'use strict';
  const root = document.querySelector('[data-s5-agent-reliability]');
  if (!root || !window.S5AgentReliabilityCore) return;
  const core = window.S5AgentReliabilityCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = {
    es: {
      copied: 'Enlace copiado.', copyFailed: 'No se pudo copiar automáticamente. Copia la URL del navegador.',
      downloaded: 'JSON generado.', reset: 'Escenario restablecido.', pass: 'Pasa', fail: 'No pasa',
      gateSummary: (p, t) => `${p}/${t} criterios`,
      interval: (l, h) => `IC 95% ${pct(l)}–${pct(h)}`,
      monthly: (n) => `${num(n, 0)} tareas/mes`, failures: (n) => `${num(n, 0)} fallos finales esperados`,
      range: (l, h) => `rango derivado del IC 95%: ${num(l, 0)}–${num(h, 0)}`
    },
    en: {
      copied: 'Link copied.', copyFailed: 'Automatic copy failed. Copy the browser URL instead.',
      downloaded: 'JSON generated.', reset: 'Scenario reset.', pass: 'Pass', fail: 'Fail',
      gateSummary: (p, t) => `${p}/${t} gates`,
      interval: (l, h) => `95% CI ${pct(l)}–${pct(h)}`,
      monthly: (n) => `${num(n, 0)} tasks/month`, failures: (n) => `${num(n, 0)} expected final failures`,
      range: (l, h) => `95% CI-derived range: ${num(l, 0)}–${num(h, 0)}`
    }
  }[locale];

  for (const field of root.querySelectorAll('.s5-tool-field')) {
    const input = field.querySelector('[data-field]');
    const label = field.querySelector('label');
    if (!input || !label) continue;
    if (!input.id) input.id = `s5-agent-${locale}-${input.dataset.field}`;
    if (!label.htmlFor) label.htmlFor = input.id;
  }

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((el) => [el.dataset.output, el]));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const gateRows = Object.fromEntries([...root.querySelectorAll('[data-gate]')].map((el) => [el.dataset.gate, el]));
  const paramMap = {
    tasks: 'n', firstPassSuccesses: 'fp', retryingTasks: 'rt', retryRecoveredTasks: 'rr', totalRetryAttempts: 'ra',
    expectedToolDecisions: 'td', correctToolDecisions: 'tc', wrongToolDecisions: 'tw', totalAgentSteps: 'st', unnecessarySteps: 'us',
    timeoutTasks: 'to', policyViolationTasks: 'pv', monthlyTasks: 'm', minFinalSuccessPercent: 'gs', minFirstPassPercent: 'gf',
    minToolDecisionPercent: 'gt', maxTimeoutPercent: 'gto', maxPolicyViolationPercent: 'gpv', maxUnnecessaryStepPercent: 'gus'
  };

  function num(value, digits = 1) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  }
  function pct(value, digits = 1) { return `${num(value * 100, digits)}%`; }
  function number(name) { const n = Number(fields[name]?.value); return Number.isFinite(n) ? n : 0; }
  function currentInput() { return Object.fromEntries(Object.keys(paramMap).map((name) => [name, number(name)])); }
  function setField(name, value) { if (fields[name] && value !== undefined) fields[name].value = String(value); }
  function setFeedback(text) {
    if (!feedback) return;
    feedback.textContent = text; feedback.hidden = false;
    clearTimeout(setFeedback.timer); setFeedback.timer = setTimeout(() => { feedback.hidden = true; }, 2200);
  }
  function renderGate(item) {
    const row = gateRows[item.key];
    if (!row) return;
    row.dataset.state = item.pass ? 'pass' : 'fail';
    const state = row.querySelector('[data-gate-state]');
    const actual = row.querySelector('[data-gate-actual]');
    if (state) state.textContent = item.pass ? copy.pass : copy.fail;
    if (actual) actual.textContent = `${pct(item.value)} ${item.direction === 'min' ? '≥' : '≤'} ${pct(item.threshold)}`;
  }
  function render() {
    const result = core.evaluate(currentInput());
    outputs.finalSuccess.textContent = pct(result.metrics.finalSuccessRate);
    outputs.finalSuccessCi.textContent = copy.interval(result.intervals.finalSuccess.low, result.intervals.finalSuccess.high);
    outputs.firstPass.textContent = pct(result.metrics.firstPassSuccessRate);
    outputs.retryRecovery.textContent = result.input.retryingTasks > 0 ? pct(result.metrics.retryRecoveryRate) : '—';
    outputs.toolAccuracy.textContent = result.input.expectedToolDecisions > 0 ? pct(result.metrics.toolDecisionAccuracy) : '—';
    outputs.toolAccuracyCi.textContent = result.input.expectedToolDecisions > 0 ? copy.interval(result.intervals.toolDecisionAccuracy.low, result.intervals.toolDecisionAccuracy.high) : '—';
    outputs.timeoutRate.textContent = pct(result.metrics.timeoutRate);
    outputs.policyRate.textContent = pct(result.metrics.policyViolationRate);
    outputs.missedToolRate.textContent = pct(result.metrics.missedToolDecisionRate);
    outputs.unnecessaryRate.textContent = pct(result.metrics.unnecessaryStepRate);
    outputs.stepsPerTask.textContent = num(result.metrics.meanStepsPerTask, 1);
    outputs.attemptMultiplier.textContent = `${num(result.metrics.attemptMultiplier, 2)}×`;
    outputs.gateSummary.textContent = copy.gateSummary(result.gateSummary.passed, result.gateSummary.total);
    outputs.gateSummary.dataset.state = result.gateSummary.allPass ? 'pass' : 'fail';
    result.gates.forEach(renderGate);
    outputs.monthlyTasks.textContent = copy.monthly(result.projection.monthlyTasks);
    outputs.monthlyFailures.textContent = copy.failures(result.projection.expectedFinalFailures);
    outputs.monthlyFailureRange.textContent = copy.range(result.projection.failureLow95, result.projection.failureHigh95);
    outputs.monthlyTimeouts.textContent = num(result.projection.expectedTimeoutTasks, 0);
    outputs.monthlyPolicy.textContent = num(result.projection.expectedPolicyViolationTasks, 0);
    return result;
  }
  function scenarioUrl() {
    const url = new URL(window.location.href); url.search = '';
    const input = core.normalize(currentInput());
    Object.entries(paramMap).forEach(([name, key]) => url.searchParams.set(key, String(input[name])));
    return url.toString();
  }
  function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search); let touched = false;
    Object.entries(paramMap).forEach(([name, key]) => { if (params.has(key)) { setField(name, params.get(key)); touched = true; } });
    return touched;
  }
  function reset() {
    Object.entries(core.DEFAULTS).forEach(([name, value]) => setField(name, value));
    history.replaceState(null, '', window.location.pathname); render(); setFeedback(copy.reset);
  }
  function exportJson() {
    const result = render();
    const payload = { schema_version: 1, tool: '5sigmas-agent-reliability-eval', exported_at: new Date().toISOString(), scenario: result };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '5sigmas-agent-reliability-eval.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); setFeedback(copy.downloaded);
  }

  root.addEventListener('input', (event) => { if (event.target.matches('[data-field]')) render(); });
  root.addEventListener('change', (event) => { if (event.target.matches('[data-field]')) render(); });
  root.querySelector('[data-action="share"]')?.addEventListener('click', async () => {
    const url = scenarioUrl(); history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url); setFeedback(copy.copied); } catch { setFeedback(copy.copyFailed); }
  });
  root.querySelector('[data-action="export"]')?.addEventListener('click', exportJson);
  root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
  if (!restoreFromUrl()) Object.entries(core.DEFAULTS).forEach(([name, value]) => setField(name, value));
  render();
})();
