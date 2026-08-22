(function () {
  'use strict';

  const root = document.querySelector('[data-s5-datacenter-ai-capacity]');
  if (!root || !window.S5DatacenterAICapacityCore) return;
  const Core = window.S5DatacenterAICapacityCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = {
    es: {
      loadError: 'No se pudo cargar la referencia de hardware.',
      copied: 'Escenario copiado.',
      copyFailed: 'No se pudo copiar el enlace.',
      exported: 'JSON generado.',
      constraints: {
        facility_power: 'Potencia total de instalación',
        installed_slots: 'Aceleradores instalados',
        rack_electrical: 'Potencia eléctrica por rack',
        rack_cooling: 'Refrigeración por rack'
      },
      bottleneckSingle: 'El límite activo es',
      bottleneckMultiple: 'Los límites activos empatan entre',
      capacitySentence: 'La capacidad utilizable es el mínimo entre límites independientes.',
      inferenceDisabled: 'No se deriva throughput de inferencia a partir de FLOPs. Introduce una medición sostenida por acelerador para mapear esta infraestructura a tokens/s.',
      inferenceEnabled: 'El throughput de inferencia usa exclusivamente la medición sostenida que has introducido; no se deriva del pico de FLOPs.',
      accelerators: 'aceleradores',
      perDay: 'EFLOP/día'
    },
    en: {
      loadError: 'The hardware reference could not be loaded.',
      copied: 'Scenario copied.',
      copyFailed: 'Could not copy the link.',
      exported: 'JSON generated.',
      constraints: {
        facility_power: 'Total facility power',
        installed_slots: 'Installed accelerators',
        rack_electrical: 'Per-rack electrical power',
        rack_cooling: 'Per-rack cooling'
      },
      bottleneckSingle: 'The active limit is',
      bottleneckMultiple: 'The active limits tie between',
      capacitySentence: 'Usable capacity is the minimum across independent constraints.',
      inferenceDisabled: 'Inference throughput is not derived from FLOPs. Enter a sustained per-accelerator measurement to map this infrastructure to tokens/s.',
      inferenceEnabled: 'Inference throughput uses only the sustained measurement you entered; it is not derived from peak FLOPs.',
      accelerators: 'accelerators',
      perDay: 'EFLOP/day'
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

  function textAll(selector, value) {
    root.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
  }

  function number(name, fallback, min, max, allowZero) {
    const raw = Number(fields[name] && fields[name].value);
    if (!Number.isFinite(raw) || (!allowZero && raw <= 0) || (allowZero && raw < 0)) return fallback;
    return Math.min(max, Math.max(min, raw));
  }

  function readInput() {
    return {
      facilityMW: number('facilityMW', 10, 0.01, 1e6),
      pue: number('pue', 1.2, 1, 5),
      facilityReservePct: number('facilityReservePct', 10, 0, 95, true),
      racks: Math.round(number('racks', 200, 1, 1e7)),
      installedPerRack: Math.round(number('installedPerRack', 64, 1, 100000)),
      rackPowerKW: number('rackPowerKW', 60, 0.1, 1e6),
      rackCoolingKW: number('rackCoolingKW', 50, 0.1, 1e6),
      powerUtilizationPct: number('powerUtilizationPct', 85, 0.1, 100),
      otherITPct: number('otherITPct', 15, 0, 1000, true),
      mfuPct: number('mfuPct', 45, 0.1, 100),
      measuredTokensPerSecPerAccelerator: number('measuredTokensPerSecPerAccelerator', 0, 0, 1e9, true),
      avgOutputTokens: number('avgOutputTokens', 500, 1, 1e9),
      peakTflops: number('peakTflops', preset ? preset.peak_dense_tflops : 989, 0.001, 1e8),
      tdpW: number('tdpW', preset ? preset.tdp_w : 700, 1, 5000)
    };
  }

  function format(value, digits = 0) {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    }).format(value);
  }

  function compactCount(value) {
    if (value >= 1e6) return `${format(value / 1e6, 2)} M`;
    if (value >= 1e3) return `${format(value / 1e3, 1)} k`;
    return format(value, 0);
  }

  function compactPowerKW(kw) {
    if (kw >= 1e6) return `${format(kw / 1e6, 2)} GW`;
    if (kw >= 1000) return `${format(kw / 1000, 2)} MW`;
    return `${format(kw, 1)} kW`;
  }

  function compactCompute(pflops) {
    if (pflops >= 1000) return `${format(pflops / 1000, 2)} EFLOP/s`;
    return `${format(pflops, pflops >= 100 ? 0 : 1)} PFLOP/s`;
  }

  function compactTokensPerSecond(value) {
    if (value == null) return '—';
    if (value >= 1e6) return `${format(value / 1e6, 2)} M tok/s`;
    if (value >= 1e3) return `${format(value / 1e3, 1)} k tok/s`;
    return `${format(value, 1)} tok/s`;
  }

  function setFeedback(message) {
    if (!feedback) return;
    feedback.hidden = false;
    feedback.textContent = message;
    window.clearTimeout(setFeedback.timer);
    setFeedback.timer = window.setTimeout(() => { feedback.hidden = true; }, 2400);
  }

  function renderConstraints(result) {
    const host = root.querySelector('[data-output="constraint-bars"]');
    if (!host) return;
    host.replaceChildren();
    const entries = Object.entries(result.constraints);
    const max = Math.max(...entries.map(([, value]) => value), 1);
    entries.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 's5-dc-constraint';
      if (result.bottlenecks.includes(key)) row.classList.add('s5-dc-constraint--active');

      const head = document.createElement('div');
      const label = document.createElement('span');
      const metric = document.createElement('strong');
      label.textContent = copy.constraints[key];
      metric.textContent = `${compactCount(value)} ${copy.accelerators}`;
      head.append(label, metric);

      const track = document.createElement('div');
      track.className = 's5-dc-constraint__track';
      const fill = document.createElement('span');
      fill.className = 's5-dc-constraint__fill';
      fill.style.width = `${Math.max(1, value / max * 100)}%`;
      track.appendChild(fill);
      row.append(head, track);
      host.appendChild(row);
    });
  }

  function render() {
    if (!dataset || !preset) return;
    const input = readInput();
    const hardware = Core.effectiveHardware(preset, input);
    const result = Core.scenario(input, hardware);
    const bottleneckNames = result.bottlenecks.map((key) => copy.constraints[key]);
    const prefix = bottleneckNames.length > 1 ? copy.bottleneckMultiple : copy.bottleneckSingle;

    text('[data-output="interpretation"]', `${prefix} ${bottleneckNames.join(locale === 'es' ? ' y ' : ' and ')}. ${copy.capacitySentence}`);
    text('[data-output="active-accelerators"]', compactCount(result.activeAccelerators));
    text('[data-output="bottleneck"]', bottleneckNames.join(' + '));
    text('[data-output="facility-draw"]', compactPowerKW(result.facilityDrawKW));
    textAll('[data-output="training-throughput"]', compactCompute(result.sustainedTrainingPetaFlops));
    text('[data-output="usable-it"]', compactPowerKW(result.usableITCapacityKW));
    text('[data-output="reserved-it"]', compactPowerKW(result.reservedITKW));
    text('[data-output="facility-headroom"]', compactPowerKW(result.facilityHeadroomKW));
    text('[data-output="facility-utilization"]', `${format(result.facilityUtilization * 100, 1)}%`);
    text('[data-output="max-per-rack"]', format(result.maxActivePerRack, 0));
    text('[data-output="rack-it"]', compactPowerKW(result.rackITAtMaxKW));
    text('[data-output="rack-power-headroom"]', compactPowerKW(result.rackElectricalHeadroomKW));
    text('[data-output="rack-cooling-headroom"]', compactPowerKW(result.rackCoolingHeadroomKW));
    text('[data-output="peak-compute"]', compactCompute(result.peakDensePetaFlops));
    text('[data-output="training-day"]', `${format(result.trainingExaFlopsPerDay, result.trainingExaFlopsPerDay >= 1000 ? 0 : 1)} ${copy.perDay}`);
    text('[data-output="slot-utilization"]', `${format(result.physicalSlotUtilization * 100, 1)}%`);
    text('[data-output="hardware-note"]', locale === 'es' ? preset.note_es : preset.note_en);
    text('[data-output="inference-note"]', result.inferenceAvailable ? copy.inferenceEnabled : copy.inferenceDisabled);
    text('[data-output="inference-tokens"]', compactTokensPerSecond(result.aggregateOutputTokensPerSec));
    text('[data-output="inference-completions"]', result.approximateCompletionsPerSec == null ? '—' : `${format(result.approximateCompletionsPerSec, 1)}/s`);
    renderConstraints(result);

    const url = new URL(window.location.href);
    url.searchParams.set('hw', fields.preset.value);
    url.searchParams.set('fac', String(input.facilityMW));
    url.searchParams.set('pue', String(input.pue));
    url.searchParams.set('res', String(input.facilityReservePct));
    url.searchParams.set('r', String(input.racks));
    url.searchParams.set('inst', String(input.installedPerRack));
    url.searchParams.set('rp', String(input.rackPowerKW));
    url.searchParams.set('rc', String(input.rackCoolingKW));
    url.searchParams.set('pwr', String(input.powerUtilizationPct));
    url.searchParams.set('it', String(input.otherITPct));
    url.searchParams.set('mfu', String(input.mfuPct));
    url.searchParams.set('tok', String(input.measuredTokensPerSecPerAccelerator));
    url.searchParams.set('out', String(input.avgOutputTokens));
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
    anchor.download = '5sigmas-datacenter-ai-capacity-scenario.json';
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
    fields.peakTflops.value = String(preset.peak_dense_tflops);
    fields.tdpW.value = String(preset.tdp_w);
    render();
  });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !dataset || !preset) return;
    const action = button.dataset.action;
    if (action === 'reset') {
      populatePresets('h200-sxm-bf16');
      const defaults = {
        facilityMW: '10', pue: '1.2', facilityReservePct: '10', racks: '200', installedPerRack: '64',
        rackPowerKW: '60', rackCoolingKW: '50', powerUtilizationPct: '85', otherITPct: '15', mfuPct: '45',
        measuredTokensPerSecPerAccelerator: '0', avgOutputTokens: '500'
      };
      Object.entries(defaults).forEach(([key, value]) => { fields[key].value = value; });
      fields.peakTflops.value = String(preset.peak_dense_tflops);
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

  fetch('/assets/data/tools/datacenter-ai-capacity.json')
    .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then((data) => {
      dataset = Core.assertDataset(data);
      const initialPreset = Core.presetById(dataset, new URLSearchParams(window.location.search).get('hw') || 'h200-sxm-bf16');
      const state = Core.queryState(window.location.search, initialPreset);
      populatePresets(state.preset);
      preset = Core.presetById(dataset, fields.preset.value);
      Object.entries(state).forEach(([key, value]) => {
        if (key !== 'preset' && fields[key]) fields[key].value = String(value);
      });
      render();
      root.dataset.ready = 'true';
    })
    .catch(() => {
      root.dataset.error = 'true';
      setFeedback(copy.loadError);
    });
})();
