(function () {
  'use strict';

  const root = document.querySelector('[data-s5-scaling-laws]');
  if (!root || !window.S5ScalingLawsCore) return;
  const Core = window.S5ScalingLawsCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = {
    es: {
      loadError: 'No se pudo cargar la referencia de leyes de escalado.',
      copied: 'Escenario copiado.',
      copyFailed: 'No se pudo copiar el enlace.',
      exported: 'JSON generado.',
      parameterHeavy: 'La asignación conserva demasiado presupuesto en parámetros frente al óptimo de esta superficie.',
      dataHeavy: 'La asignación conserva demasiado presupuesto en datos frente al óptimo de esta superficie.',
      balanced: 'La asignación está cerca del óptimo de esta superficie para el presupuesto seleccionado.',
      chartLabel: 'Pérdida predicha al redistribuir un presupuesto fijo entre parámetros y tokens',
      optimum: 'Óptimo',
      sameRatio: 'Misma proporción N:D',
      params: 'Parámetros',
      tokens: 'Tokens'
    },
    en: {
      loadError: 'The scaling-law reference could not be loaded.',
      copied: 'Scenario copied.',
      copyFailed: 'Could not copy the link.',
      exported: 'JSON generated.',
      parameterHeavy: 'This allocation keeps too much of the budget in parameters relative to the optimum of this fitted surface.',
      dataHeavy: 'This allocation keeps too much of the budget in data relative to the optimum of this fitted surface.',
      balanced: 'This allocation is close to the optimum of this fitted surface for the selected budget.',
      chartLabel: 'Predicted loss while reallocating a fixed budget between parameters and tokens',
      optimum: 'Optimum',
      sameRatio: 'Same N:D ratio',
      params: 'Parameters',
      tokens: 'Tokens'
    }
  }[locale];

  const fields = Object.fromEntries(Array.from(root.querySelectorAll('[data-field]')).map((el) => [el.dataset.field, el]));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  let dataset = null;
  let basePreset = null;

  function text(selector, value) {
    const el = root.querySelector(selector);
    if (el) el.textContent = value;
  }

  function value(name) {
    return Number(fields[name] && fields[name].value);
  }

  function readInput() {
    return {
      parametersB: value('parametersB'),
      tokensB: value('tokensB'),
      budgetMultiplier: value('budgetMultiplier'),
      alpha: value('alpha'),
      beta: value('beta')
    };
  }

  function format(value, digits = 2) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    }).format(value);
  }

  function compactBillions(value) {
    const billions = value / 1e9;
    if (billions >= 1000) return `${format(billions / 1000, 2)} T`;
    if (billions >= 1) return `${format(billions, billions >= 100 ? 0 : 2)} B`;
    return `${format(billions * 1000, 1)} M`;
  }

  function scientific(value) {
    if (!Number.isFinite(value) || value <= 0) return '—';
    const exponent = Math.floor(Math.log10(value));
    const mantissa = value / Math.pow(10, exponent);
    return `${format(mantissa, 2)} × 10^${exponent}`;
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
    Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, String(val)));
    return el;
  }

  function renderChart(targetCompute, preset, sameRatio) {
    const host = root.querySelector('[data-output="chart"]');
    if (!host) return;
    host.replaceChildren();
    const curve = Core.allocationCurve(targetCompute, preset, 57);
    const width = 920;
    const height = 390;
    const margin = { top: 34, right: 32, bottom: 72, left: 68 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const logs = [...curve.points.map((p) => Math.log10(p.N)), Math.log10(sameRatio.N)];
    const losses = [...curve.points.map((p) => p.loss), sameRatio.loss];
    const rawMinX = Math.min(...logs);
    const rawMaxX = Math.max(...logs);
    const xPad = Math.max(0.08, (rawMaxX - rawMinX) * 0.04);
    const minX = rawMinX - xPad;
    const maxX = rawMaxX + xPad;
    const minY = Math.min(...losses);
    const maxY = Math.max(...losses);
    const yPad = Math.max(0.015, (maxY - minY) * 0.12);
    const x = (N) => margin.left + (Math.log10(N) - minX) / Math.max(1e-12, maxX - minX) * innerW;
    const y = (loss) => margin.top + (maxY + yPad - loss) / Math.max(1e-12, maxY + yPad - (minY - yPad)) * innerH;

    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': copy.chartLabel });
    const title = svgNode('title');
    title.textContent = copy.chartLabel;
    svg.appendChild(title);

    for (let i = 0; i <= 4; i += 1) {
      const loss = minY - yPad + (maxY - minY + 2 * yPad) * i / 4;
      const yy = y(loss);
      svg.appendChild(svgNode('line', { x1: margin.left, y1: yy, x2: width - margin.right, y2: yy, class: 's5-scaling-gridline' }));
      const label = svgNode('text', { x: margin.left - 10, y: yy + 4, 'text-anchor': 'end', class: 's5-scaling-axis-label' });
      label.textContent = format(loss, 3);
      svg.appendChild(label);
    }

    const path = curve.points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.N).toFixed(2)} ${y(point.loss).toFixed(2)}`).join(' ');
    svg.appendChild(svgNode('path', { d: path, class: 's5-scaling-curve' }));

    const markers = [
      { point: curve.optimum, label: copy.optimum, cls: 's5-scaling-marker--optimum' },
      { point: sameRatio, label: copy.sameRatio, cls: 's5-scaling-marker--current' }
    ];
    markers.forEach(({ point, label, cls }, index) => {
      const px = x(point.N);
      const py = y(point.loss);
      const g = svgNode('g', { class: `s5-scaling-marker ${cls}`, tabindex: '0', role: 'group', 'aria-label': `${label}: ${copy.params} ${compactBillions(point.N)}, ${copy.tokens} ${compactBillions(point.D)}, loss ${format(point.loss, 3)}` });
      g.appendChild(svgNode('circle', { cx: px, cy: py, r: index === 0 ? 7 : 6 }));
      const t = svgNode('text', { x: px, y: py - 14, 'text-anchor': 'middle', class: 's5-scaling-marker-label' });
      t.textContent = label;
      g.appendChild(t);
      svg.appendChild(g);
    });

    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const logN = minX + (maxX - minX) * t;
      const N = Math.pow(10, logN);
      const xx = x(N);
      const label = svgNode('text', { x: xx, y: height - 28, 'text-anchor': 'middle', class: 's5-scaling-axis-label' });
      label.textContent = compactBillions(N);
      svg.appendChild(label);
    });

    const axisTitle = svgNode('text', { x: margin.left + innerW / 2, y: height - 6, 'text-anchor': 'middle', class: 's5-scaling-axis-title' });
    axisTitle.textContent = locale === 'es' ? 'Parámetros con cómputo total fijo' : 'Parameters at fixed total compute';
    svg.appendChild(axisTitle);
    host.appendChild(svg);
  }

  function render() {
    if (!dataset || !basePreset) return;
    const input = readInput();
    const preset = Core.effectivePreset(basePreset, input);
    const s = Core.scenario(input, preset);

    text('[data-output="current-compute"]', `${scientific(s.currentCompute)} FLOPs`);
    text('[data-output="target-compute"]', `${scientific(s.targetCompute)} FLOPs`);
    text('[data-output="optimal-params"]', compactBillions(s.optimum.N));
    text('[data-output="optimal-tokens"]', compactBillions(s.optimum.D));
    text('[data-output="optimal-loss"]', format(s.optimum.loss, 3));
    text('[data-output="same-ratio-loss"]', format(s.sameRatio.loss, 3));
    text('[data-output="loss-gap"]', s.lossGap <= 1e-9 ? '≈ 0' : `+${format(s.lossGap, 3)}`);
    text('[data-output="current-ratio"]', format(s.D / s.N, 1));
    text('[data-output="optimal-ratio"]', format(s.optimum.tokensPerParameter, 1));
    text('[data-output="parameter-exponent"]', format(s.elasticities.parameterExponent, 3));
    text('[data-output="token-exponent"]', format(s.elasticities.tokenExponent, 3));
    text('[data-output="interpretation"]', s.orientation === 'parameter-heavy' ? copy.parameterHeavy : (s.orientation === 'data-heavy' ? copy.dataHeavy : copy.balanced));
    text('[data-output="fit"]', `L = ${format(preset.E, 2)} + ${format(preset.A, 1)}/N^${format(preset.alpha, 2)} + ${format(preset.B, 1)}/D^${format(preset.beta, 2)}`);

    renderChart(s.targetCompute, preset, s.sameRatio);

    const url = new URL(window.location.href);
    url.searchParams.set('n', String(input.parametersB));
    url.searchParams.set('d', String(input.tokensB));
    url.searchParams.set('c', String(input.budgetMultiplier));
    url.searchParams.set('a', String(input.alpha));
    url.searchParams.set('b', String(input.beta));
    window.history.replaceState(null, '', url);
  }

  function download(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
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

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-field]')) render();
  });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !dataset || !basePreset) return;
    const action = button.dataset.action;
    if (action === 'reset') {
      fields.parametersB.value = '70';
      fields.tokensB.value = '1400';
      fields.budgetMultiplier.value = '1';
      fields.alpha.value = String(basePreset.alpha);
      fields.beta.value = String(basePreset.beta);
      render();
    }
    if (action === 'share') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setFeedback(copy.copied);
      } catch (_) { setFeedback(copy.copyFailed); }
    }
    if (action === 'json') download('5sigmas-scaling-laws-scenario.json', Core.exportPayload(dataset, basePreset, readInput()));
  });

  fetch('/assets/data/tools/scaling-laws.json')
    .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then((data) => {
      dataset = Core.assertDataset(data);
      basePreset = Core.presetById(dataset, 'chinchilla-2022');
      const state = Core.queryState(window.location.search, basePreset);
      fields.parametersB.value = String(state.parametersB);
      fields.tokensB.value = String(state.tokensB);
      fields.budgetMultiplier.value = String(state.budgetMultiplier);
      fields.alpha.value = String(state.alpha);
      fields.beta.value = String(state.beta);
      render();
      root.dataset.ready = 'true';
    })
    .catch(() => {
      root.dataset.error = 'true';
      setFeedback(copy.loadError);
    });
})();
