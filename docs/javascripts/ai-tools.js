/* 5sigmas AI tools runtime. Pure math stays dependency-free and testable in Node. */
(function (global) {
  'use strict';

  const PARAMS = {
    inputTokens: 'it',
    cachedPct: 'cp',
    outputTokens: 'ot',
    inputPrice: 'ip',
    cachedPrice: 'kp',
    outputPrice: 'op',
    ttftMs: 'ttft',
    outputTps: 'tps',
    overheadMs: 'oh',
    requestsDay: 'rd',
    peakRequestsMin: 'rpm'
  };

  function finiteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function calculateLlmCostLatency(raw) {
    const inputTokens = finiteNumber(raw.inputTokens);
    const cachedPct = finiteNumber(raw.cachedPct);
    const outputTokens = finiteNumber(raw.outputTokens);
    const inputPrice = finiteNumber(raw.inputPrice);
    const cachedPrice = finiteNumber(raw.cachedPrice);
    const outputPrice = finiteNumber(raw.outputPrice);
    const ttftMs = finiteNumber(raw.ttftMs);
    const outputTps = finiteNumber(raw.outputTps);
    const overheadMs = finiteNumber(raw.overheadMs);
    const requestsDay = finiteNumber(raw.requestsDay);
    const peakRequestsMin = finiteNumber(raw.peakRequestsMin);

    const values = [
      inputTokens, cachedPct, outputTokens, inputPrice, cachedPrice, outputPrice,
      ttftMs, outputTps, overheadMs, requestsDay, peakRequestsMin
    ];
    if (values.some((value) => !Number.isFinite(value))) {
      throw new RangeError('all values must be finite numbers');
    }
    if (
      inputTokens < 0 || outputTokens < 0 || inputPrice < 0 || cachedPrice < 0 ||
      outputPrice < 0 || ttftMs < 0 || overheadMs < 0 || requestsDay < 0 ||
      peakRequestsMin < 0 || outputTps <= 0 || cachedPct < 0 || cachedPct > 100
    ) {
      throw new RangeError('values are outside the supported range');
    }

    const cachedShare = clamp(cachedPct / 100, 0, 1);
    const cachedInputTokens = inputTokens * cachedShare;
    const uncachedInputTokens = inputTokens - cachedInputTokens;
    const inputCost = (uncachedInputTokens / 1_000_000) * inputPrice;
    const cachedCost = (cachedInputTokens / 1_000_000) * cachedPrice;
    const outputCost = (outputTokens / 1_000_000) * outputPrice;
    const requestCost = inputCost + cachedCost + outputCost;
    const costPerThousand = requestCost * 1000;
    const monthlyRequests = requestsDay * 30;
    const monthlyCost = requestCost * monthlyRequests;
    const generationMs = (outputTokens / outputTps) * 1000;
    const responseMs = overheadMs + ttftMs + generationMs;
    const peakConcurrency = (peakRequestsMin / 60) * (responseMs / 1000);
    const monthlyInputTokens = inputTokens * monthlyRequests;
    const monthlyOutputTokens = outputTokens * monthlyRequests;
    const monthlyTokens = monthlyInputTokens + monthlyOutputTokens;

    const components = {
      inputCost,
      cachedCost,
      outputCost
    };
    const dominantCost = Object.entries(components)
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      cachedInputTokens,
      uncachedInputTokens,
      inputCost,
      cachedCost,
      outputCost,
      requestCost,
      costPerThousand,
      monthlyRequests,
      monthlyCost,
      generationMs,
      responseMs,
      peakConcurrency,
      monthlyInputTokens,
      monthlyOutputTokens,
      monthlyTokens,
      dominantCost
    };
  }

  function initCalculator(root) {
    if (!root || root.dataset.s5Initialized === 'true') return;
    root.dataset.s5Initialized = 'true';

    const form = root.querySelector('[data-s5-tool-form]');
    if (!form) return;

    const lang = root.dataset.lang === 'en' ? 'en' : 'es';
    const locale = lang === 'en' ? 'en-US' : 'es-ES';
    const status = root.querySelector('[data-s5-live-status]');
    const interpretation = root.querySelector('[data-s5-interpretation]');
    const inputs = [...form.querySelectorAll('[data-key]')];
    const defaults = Object.fromEntries(inputs.map((input) => [input.dataset.key, input.value]));

    const currency = (value, digits) => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
    const number = (value, digits) => new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
    const compact = (value) => new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);

    function collect() {
      return Object.fromEntries(inputs.map((input) => [input.dataset.key, input.value]));
    }

    function setText(key, value) {
      const node = root.querySelector(`[data-output="${key}"]`);
      if (node) node.textContent = value;
    }

    function syncQuery(values) {
      const url = new URL(global.location.href);
      for (const [key, param] of Object.entries(PARAMS)) {
        const current = String(values[key]);
        if (current === String(defaults[key])) url.searchParams.delete(param);
        else url.searchParams.set(param, current);
      }
      global.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }

    function loadQuery() {
      const params = new URLSearchParams(global.location.search);
      for (const input of inputs) {
        const param = PARAMS[input.dataset.key];
        if (!param || !params.has(param)) continue;
        const value = params.get(param);
        if (value !== null && value.trim() !== '') input.value = value;
      }
    }

    function renderInterpretation(result) {
      if (!interpretation) return;
      const costLabel = {
        inputCost: lang === 'en' ? 'uncached input' : 'entrada sin caché',
        cachedCost: lang === 'en' ? 'cached input' : 'entrada en caché',
        outputCost: lang === 'en' ? 'output tokens' : 'tokens de salida'
      }[result.dominantCost];
      const seconds = result.responseMs / 1000;
      if (lang === 'en') {
        interpretation.textContent = `In this scenario, ${costLabel} is the largest cost component. The simplified response-time budget is ${number(seconds, 2)} s, which implies about ${number(result.peakConcurrency, 1)} concurrent in-flight requests at the configured peak arrival rate.`;
      } else {
        interpretation.textContent = `En este escenario, ${costLabel} concentra la mayor parte del coste. El presupuesto simplificado de tiempo de respuesta es ${number(seconds, 2)} s, lo que implica unas ${number(result.peakConcurrency, 1)} solicitudes concurrentes en vuelo al pico de tráfico configurado.`;
      }
    }

    function renderBars(result) {
      const total = result.requestCost;
      const entries = [
        ['input', result.inputCost],
        ['cached', result.cachedCost],
        ['output', result.outputCost]
      ];
      for (const [key, value] of entries) {
        const bar = root.querySelector(`[data-cost-bar="${key}"]`);
        if (bar) bar.style.width = `${total > 0 ? (value / total) * 100 : 0}%`;
        setText(`${key}-cost`, currency(value, value < 0.01 ? 5 : 3));
      }
    }

    function render() {
      const values = collect();
      try {
        const result = calculateLlmCostLatency(values);
        form.removeAttribute('data-invalid');
        setText('request-cost', currency(result.requestCost, result.requestCost < 0.01 ? 5 : 3));
        setText('thousand-cost', currency(result.costPerThousand, result.costPerThousand < 1 ? 2 : 0));
        setText('monthly-cost', currency(result.monthlyCost, result.monthlyCost < 100 ? 2 : 0));
        setText('response-time', `${number(result.responseMs / 1000, 2)} s`);
        setText('peak-concurrency', number(result.peakConcurrency, 1));
        setText('monthly-tokens', compact(result.monthlyTokens));
        setText('monthly-requests', compact(result.monthlyRequests));
        renderBars(result);
        renderInterpretation(result);
        if (status) status.textContent = '';
        syncQuery(values);
        root.__s5LastResult = { values, result };
      } catch (error) {
        form.setAttribute('data-invalid', 'true');
        if (status) status.textContent = root.dataset.invalidMessage || 'Check the input values.';
      }
    }

    function reset() {
      form.reset();
      const url = new URL(global.location.href);
      for (const param of Object.values(PARAMS)) url.searchParams.delete(param);
      global.history.replaceState(null, '', `${url.pathname}${url.hash}`);
      render();
      if (status) status.textContent = root.dataset.resetMessage || '';
    }

    async function share() {
      render();
      try {
        await global.navigator.clipboard.writeText(global.location.href);
        if (status) status.textContent = root.dataset.shareCopied || '';
      } catch (_) {
        if (status) status.textContent = global.location.href;
      }
    }

    function downloadCsv() {
      render();
      const snapshot = root.__s5LastResult;
      if (!snapshot) return;
      const rows = [
        ['field', 'value'],
        ...Object.entries(snapshot.values),
        ['requestCostUsd', snapshot.result.requestCost],
        ['costPer1000RequestsUsd', snapshot.result.costPerThousand],
        ['monthlyCostUsd', snapshot.result.monthlyCost],
        ['responseTimeMs', snapshot.result.responseMs],
        ['peakConcurrency', snapshot.result.peakConcurrency],
        ['monthlyTokens', snapshot.result.monthlyTokens]
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = global.document.createElement('a');
      anchor.href = url;
      anchor.download = root.dataset.downloadName || '5sigmas-llm-cost-latency.csv';
      global.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      if (status) status.textContent = root.dataset.downloadedMessage || '';
    }

    loadQuery();
    inputs.forEach((input) => input.addEventListener('input', render));
    root.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
    root.querySelector('[data-action="share"]')?.addEventListener('click', share);
    root.querySelector('[data-action="download"]')?.addEventListener('click', downloadCsv);
    render();
  }

  function initAll() {
    if (!global.document) return;
    global.document.querySelectorAll('[data-s5-tool="llm-cost-latency"]').forEach(initCalculator);
  }

  const api = { calculateLlmCostLatency, initCalculator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.S5AiTools = Object.assign(global.S5AiTools || {}, api);

  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', initAll, { once: true });
    else initAll();
    if (global.document$?.subscribe) global.document$.subscribe(initAll);
  }
})(typeof window !== 'undefined' ? window : globalThis);
