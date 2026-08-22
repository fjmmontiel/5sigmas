(function () {
  'use strict';

  const root = document.querySelector('[data-s5-training-compute-energy]');
  if (!root || !window.S5TrainingComputeEnergyCore) return;
  const Core = window.S5TrainingComputeEnergyCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = {
    es: {
      loadError: 'No se pudo cargar la referencia de hardware y energía.',
      copied: 'Escenario copiado.',
      copyFailed: 'No se pudo copiar el enlace.',
      exported: 'JSON generado.',
      short: 'Con estos supuestos, la duración programada no alcanza el cómputo aproximado del entrenamiento.',
      long: 'Con estos supuestos, la duración programada supera el cómputo aproximado del entrenamiento.',
      matched: 'La duración programada queda cerca del cómputo aproximado del entrenamiento.',
      accelerator: 'Aceleradores',
      otherIT: 'Resto de IT',
      facility: 'Sobrecoste de instalación'
    },
    en: {
      loadError: 'The hardware and energy reference could not be loaded.',
      copied: 'Scenario copied.',
      copyFailed: 'Could not copy the link.',
      exported: 'JSON generated.',
      short: 'Under these assumptions, the scheduled duration does not deliver the approximate compute required by the training workload.',
      long: 'Under these assumptions, the scheduled duration exceeds the approximate compute required by the training workload.',
      matched: 'The scheduled duration is close to the approximate compute required by the training workload.',
      accelerator: 'Accelerators',
      otherIT: 'Other IT',
      facility: 'Facility overhead'
    }
  }[locale];

  const fields = Object.fromEntries(Array.from(root.querySelectorAll('[data-field]')).map((el) => [el.dataset.field, el]));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  let dataset = null;
  let preset = null;

  function text(selector, value) {
    const el = root.querySelector(selector);
    if (el) el.textContent = value;
  }

  function number(name, fallback, min, max, allowZero) {
    const raw = Number(fields[name] && fields[name].value);
    if (!Number.isFinite(raw) || (!allowZero && raw <= 0) || (allowZero && raw < 0)) return fallback;
    return Math.min(max, Math.max(min, raw));
  }

  function readInput() {
    return {
      gpus: Math.round(number('gpus', 1024, 1, 1e7)),
      durationHours: number('durationHours', 720, 0.01, 1e7),
      mfuPct: number('mfuPct', 45, 0.1, 100),
      powerUtilizationPct: number('powerUtilizationPct', 85, 0.1, 150),
      otherITPct: number('otherITPct', 15, 0, 1000, true),
      pue: number('pue', 1.2, 1, 5),
      parametersB: number('parametersB', 70, 0.001, 1e7),
      tokensB: number('tokensB', 1400, 0.001, 1e9),
      computeFactor: number('computeFactor', 6, 0.1, 100),
      peakTflops: number('peakTflops', preset ? preset.peak_tflops : 989, 0.001, 1e7),
      tdpW: number('tdpW', preset ? preset.tdp_w : 700, 1, 10000)
    };
  }

  function format(value, digits) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    }).format(value);
  }

  function compactHours(hours) {
    if (hours >= 24 * 365) return `${format(hours / (24 * 365), 2)} ${locale === 'es' ? 'años' : 'years'}`;
    if (hours >= 24) return `${format(hours / 24, 1)} ${locale === 'es' ? 'días' : 'days'}`;
    return `${format(hours, 1)} h`;
  }

  function compactEnergy(mwh) {
    if (mwh >= 1e6) return `${format(mwh / 1e6, 2)} TWh`;
    if (mwh >= 1000) return `${format(mwh / 1000, 2)} GWh`;
    if (mwh >= 1) return `${format(mwh, mwh >= 100 ? 0 : 2)} MWh`;
    return `${format(mwh * 1000, 1)} kWh`;
  }

  function compactPower(kw) {
    if (kw >= 1e6) return `${format(kw / 1e6, 2)} GW`;
    if (kw >= 1000) return `${format(kw / 1000, 2)} MW`;
    return `${format(kw, 1)} kW`;
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

  function renderEnergyBreakdown(result) {
    const host = root.querySelector('[data-output="energy-breakdown"]');
    if (!host) return;
    const total = Math.max(result.facilityEnergyMWh, 1e-12);
    const rows = [
      [copy.accelerator, result.acceleratorEnergyMWh],
      [copy.otherIT, result.otherITEnergyMWh],
      [copy.facility, result.facilityOverheadEnergyMWh]
    ];
    host.replaceChildren();
    rows.forEach(([label, value], index) => {
      const row = document.createElement('div');
      row.className = 's5-energy-breakdown__row';
      const head = document.createElement('div');
      const name = document.createElement('span');
      const metric = document.createElement('strong');
      name.textContent = label;
      metric.textContent = `${compactEnergy(value)} · ${format(value / total * 100, 1)}%`;
      head.append(name, metric);
      const track = document.createElement('div');
      track.className = 's5-energy-breakdown__track';
      const fill = document.createElement('span');
      fill.className = `s5-energy-breakdown__fill s5-energy-breakdown__fill--${index + 1}`;
      fill.style.width = `${Math.max(0.5, value / total * 100)}%`;
      track.appendChild(fill);
      row.append(head, track);
      host.appendChild(row);
    });
  }

  function render() {
    if (!dataset || !preset) return;
    const input = readInput();
    const hardware = Core.effectiveHardware(preset, input);
    const s = Core.clusterScenario(input, hardware);
    const statusCopy = s.scheduleStatus === 'short' ? copy.short : (s.scheduleStatus === 'long' ? copy.long : copy.matched);

    text('[data-output="interpretation"]', statusCopy);
    text('[data-output="required-compute"]', `${scientific(s.requiredModelFlops)} FLOPs`);
    text('[data-output="delivered-compute"]', `${scientific(s.deliveredModelFlops)} FLOPs`);
    text('[data-output="coverage"]', `${format(s.coverage * 100, 1)}%`);
    text('[data-output="estimated-duration"]', compactHours(s.estimatedHoursForWorkload));
    text('[data-output="facility-power"]', compactPower(s.facilityPowerKW));
    text('[data-output="scheduled-energy"]', compactEnergy(s.facilityEnergyMWh));
    text('[data-output="workload-energy"]', compactEnergy(s.workloadFacilityEnergyMWh));
    text('[data-output="achieved-throughput"]', `${format(s.achievedPetaFlops, 1)} PFLOP/s`);
    text('[data-output="compute-per-mw"]', `${format(s.achievedPetaFlopsPerMW, 1)} PFLOP/s/MW`);
    text('[data-output="hardware-note"]', locale === 'es' ? preset.note_es : preset.note_en);
    renderEnergyBreakdown(s);

    const url = new URL(window.location.href);
    url.searchParams.set('hw', fields.preset.value);
    url.searchParams.set('g', String(input.gpus));
    url.searchParams.set('h', String(input.durationHours));
    url.searchParams.set('mfu', String(input.mfuPct));
    url.searchParams.set('pwr', String(input.powerUtilizationPct));
    url.searchParams.set('it', String(input.otherITPct));
    url.searchParams.set('pue', String(input.pue));
    url.searchParams.set('n', String(input.parametersB));
    url.searchParams.set('d', String(input.tokensB));
    url.searchParams.set('k', String(input.computeFactor));
    url.searchParams.set('peak', String(input.peakTflops));
    url.searchParams.set('tdp', String(input.tdpW));
    window.history.replaceState(null, '', url);
  }

  function populatePresets(selectedId) {
    fields.preset.replaceChildren();
    dataset.presets.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = locale === 'es' ? item.title_es : item.title_en;
      fields.preset.appendChild(option);
    });
    fields.preset.value = dataset.presets.some((item) => item.id === selectedId) ? selectedId : dataset.presets[0].id;
    preset = Core.presetById(dataset, fields.preset.value);
  }

  function download(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '5sigmas-training-compute-energy-scenario.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback(copy.exported);
  }

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-field]') && event.target !== fields.preset) render();
  });

  root.addEventListener('change', (event) => {
    if (event.target !== fields.preset || !dataset) return;
    preset = Core.presetById(dataset, fields.preset.value);
    fields.peakTflops.value = String(preset.peak_tflops);
    fields.tdpW.value = String(preset.tdp_w);
    render();
  });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !dataset || !preset) return;
    const action = button.dataset.action;
    if (action === 'reset') {
      populatePresets('h100-sxm-bf16');
      fields.gpus.value = '1024';
      fields.durationHours.value = '720';
      fields.mfuPct.value = '45';
      fields.powerUtilizationPct.value = '85';
      fields.otherITPct.value = '15';
      fields.pue.value = '1.2';
      fields.parametersB.value = '70';
      fields.tokensB.value = '1400';
      fields.computeFactor.value = '6';
      fields.peakTflops.value = String(preset.peak_tflops);
      fields.tdpW.value = String(preset.tdp_w);
      render();
    }
    if (action === 'share') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setFeedback(copy.copied);
      } catch (_) { setFeedback(copy.copyFailed); }
    }
    if (action === 'json') download(Core.exportPayload(dataset, preset, readInput()));
  });

  fetch('/assets/data/tools/training-compute-energy.json')
    .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then((data) => {
      dataset = Core.assertDataset(data);
      const initialPreset = Core.presetById(dataset, new URLSearchParams(window.location.search).get('hw') || 'h100-sxm-bf16');
      const state = Core.queryState(window.location.search, initialPreset);
      populatePresets(state.preset);
      preset = Core.presetById(dataset, fields.preset.value);
      fields.gpus.value = String(state.gpus);
      fields.durationHours.value = String(state.durationHours);
      fields.mfuPct.value = String(state.mfuPct);
      fields.powerUtilizationPct.value = String(state.powerUtilizationPct);
      fields.otherITPct.value = String(state.otherITPct);
      fields.pue.value = String(state.pue);
      fields.parametersB.value = String(state.parametersB);
      fields.tokensB.value = String(state.tokensB);
      fields.computeFactor.value = String(state.computeFactor);
      fields.peakTflops.value = String(state.peakTflops);
      fields.tdpW.value = String(state.tdpW);
      render();
      root.dataset.ready = 'true';
    })
    .catch(() => {
      root.dataset.error = 'true';
      setFeedback(copy.loadError);
    });
})();
