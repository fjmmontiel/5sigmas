(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5TrainingComputeEnergyCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const METHODOLOGY_VERSION = '1.0.0';
  const SOURCE_REVIEW_DATE = '2026-08-22';

  function finitePositive(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function assertDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.presets) || !dataset.presets.length || !dataset.sources) {
      throw new Error('Invalid training-compute-energy dataset');
    }
    const ids = new Set();
    dataset.presets.forEach((preset) => {
      if (!preset.id || ids.has(preset.id)) throw new Error('Preset ids must be unique');
      ids.add(preset.id);
      ['peak_tflops', 'tdp_w'].forEach((key) => {
        if (!Number.isFinite(Number(preset[key])) || Number(preset[key]) <= 0) throw new Error(`Invalid ${key} in ${preset.id}`);
      });
      if (!dataset.sources[preset.source]) throw new Error(`Unknown source ${preset.source}`);
    });
    ['hoffmann-2022', 'green-grid-pue'].forEach((id) => {
      if (!dataset.sources[id]) throw new Error(`Missing methodology source ${id}`);
    });
    return dataset;
  }

  function presetById(dataset, id) {
    assertDataset(dataset);
    return dataset.presets.find((preset) => preset.id === id) || dataset.presets[0];
  }

  function effectiveHardware(preset, input = {}) {
    return {
      ...preset,
      peak_tflops: clamp(finitePositive(input.peakTflops, preset.peak_tflops), 0.001, 1e7),
      tdp_w: clamp(finitePositive(input.tdpW, preset.tdp_w), 1, 10000)
    };
  }

  function denseTrainingCompute(parametersB, tokensB, computeFactor = 6) {
    const N = finitePositive(parametersB, 70) * 1e9;
    const D = finitePositive(tokensB, 1400) * 1e9;
    const k = clamp(finitePositive(computeFactor, 6), 0.1, 100);
    return k * N * D;
  }

  function clusterScenario(input, hardware) {
    const gpus = Math.round(clamp(finitePositive(input.gpus, 1024), 1, 1e7));
    const durationHours = clamp(finitePositive(input.durationHours, 720), 0.01, 1e7);
    const mfu = clamp(finitePositive(input.mfuPct, 45) / 100, 0.001, 1);
    const powerUtilization = clamp(finitePositive(input.powerUtilizationPct, 85) / 100, 0.001, 1.5);
    const otherIT = clamp(Number.isFinite(Number(input.otherITPct)) ? Number(input.otherITPct) / 100 : 0.15, 0, 10);
    const pue = clamp(finitePositive(input.pue, 1.2), 1, 5);
    const computeFactor = clamp(finitePositive(input.computeFactor, 6), 0.1, 100);
    const parametersB = clamp(finitePositive(input.parametersB, 70), 0.001, 1e7);
    const tokensB = clamp(finitePositive(input.tokensB, 1400), 0.001, 1e9);

    const peakClusterFlopsPerSecond = gpus * Number(hardware.peak_tflops) * 1e12;
    const achievedModelFlopsPerSecond = peakClusterFlopsPerSecond * mfu;
    const scheduledSeconds = durationHours * 3600;
    const deliveredModelFlops = achievedModelFlopsPerSecond * scheduledSeconds;
    const requiredModelFlops = denseTrainingCompute(parametersB, tokensB, computeFactor);
    const coverage = deliveredModelFlops / requiredModelFlops;
    const estimatedHoursForWorkload = requiredModelFlops / achievedModelFlopsPerSecond / 3600;

    const acceleratorPowerKW = gpus * Number(hardware.tdp_w) * powerUtilization / 1000;
    const otherITPowerKW = acceleratorPowerKW * otherIT;
    const totalITPowerKW = acceleratorPowerKW + otherITPowerKW;
    const facilityPowerKW = totalITPowerKW * pue;
    const facilityOverheadKW = facilityPowerKW - totalITPowerKW;

    const acceleratorEnergyMWh = acceleratorPowerKW * durationHours / 1000;
    const otherITEnergyMWh = otherITPowerKW * durationHours / 1000;
    const facilityOverheadEnergyMWh = facilityOverheadKW * durationHours / 1000;
    const facilityEnergyMWh = facilityPowerKW * durationHours / 1000;
    const workloadFacilityEnergyMWh = facilityPowerKW * estimatedHoursForWorkload / 1000;
    const deliveredExaFlop = deliveredModelFlops / 1e18;
    const workloadExaFlop = requiredModelFlops / 1e18;
    const achievedPetaFlops = achievedModelFlopsPerSecond / 1e15;
    const facilityMW = facilityPowerKW / 1000;
    const achievedPetaFlopsPerMW = achievedPetaFlops / Math.max(1e-12, facilityMW);

    let scheduleStatus = 'matched';
    if (coverage < 0.95) scheduleStatus = 'short';
    if (coverage > 1.05) scheduleStatus = 'long';

    return {
      input: { gpus, durationHours, mfu, powerUtilization, otherIT, pue, computeFactor, parametersB, tokensB },
      peakClusterFlopsPerSecond,
      achievedModelFlopsPerSecond,
      deliveredModelFlops,
      requiredModelFlops,
      coverage,
      estimatedHoursForWorkload,
      acceleratorPowerKW,
      otherITPowerKW,
      totalITPowerKW,
      facilityPowerKW,
      facilityOverheadKW,
      acceleratorEnergyMWh,
      otherITEnergyMWh,
      facilityOverheadEnergyMWh,
      facilityEnergyMWh,
      workloadFacilityEnergyMWh,
      deliveredExaFlop,
      workloadExaFlop,
      achievedPetaFlops,
      achievedPetaFlopsPerMW,
      scheduleStatus
    };
  }

  function queryState(raw, preset) {
    const params = raw instanceof URLSearchParams ? raw : new URLSearchParams(raw || '');
    return {
      preset: params.get('hw') || preset.id,
      gpus: Math.round(clamp(finitePositive(params.get('g'), 1024), 1, 1e7)),
      durationHours: clamp(finitePositive(params.get('h'), 720), 0.01, 1e7),
      mfuPct: clamp(finitePositive(params.get('mfu'), 45), 0.1, 100),
      powerUtilizationPct: clamp(finitePositive(params.get('pwr'), 85), 0.1, 150),
      otherITPct: clamp(Number.isFinite(Number(params.get('it'))) ? Number(params.get('it')) : 15, 0, 1000),
      pue: clamp(finitePositive(params.get('pue'), 1.2), 1, 5),
      parametersB: clamp(finitePositive(params.get('n'), 70), 0.001, 1e7),
      tokensB: clamp(finitePositive(params.get('d'), 1400), 0.001, 1e9),
      computeFactor: clamp(finitePositive(params.get('k'), 6), 0.1, 100),
      peakTflops: clamp(finitePositive(params.get('peak'), preset.peak_tflops), 0.001, 1e7),
      tdpW: clamp(finitePositive(params.get('tdp'), preset.tdp_w), 1, 10000)
    };
  }

  function exportPayload(dataset, preset, input) {
    const hardware = effectiveHardware(preset, input);
    return {
      methodologyVersion: METHODOLOGY_VERSION,
      sourceReviewDate: SOURCE_REVIEW_DATE,
      datasetUpdated: dataset.updated,
      scope: dataset.scope,
      freshnessPolicy: dataset.freshness_policy,
      hardware: {
        preset: preset.id,
        peakDenseTflops: Number(hardware.peak_tflops),
        maxTdpW: Number(hardware.tdp_w),
        source: dataset.sources[preset.source]
      },
      methodologySources: {
        denseTrainingCompute: dataset.sources['hoffmann-2022'],
        pue: dataset.sources['green-grid-pue']
      },
      assumptions: {
        gpus: Number(input.gpus),
        durationHours: Number(input.durationHours),
        mfuPct: Number(input.mfuPct),
        powerUtilizationPct: Number(input.powerUtilizationPct),
        otherITPct: Number(input.otherITPct),
        pue: Number(input.pue),
        parametersB: Number(input.parametersB),
        tokensB: Number(input.tokensB),
        computeFactor: Number(input.computeFactor)
      },
      result: clusterScenario(input, hardware)
    };
  }

  return {
    METHODOLOGY_VERSION,
    SOURCE_REVIEW_DATE,
    assertDataset,
    presetById,
    effectiveHardware,
    denseTrainingCompute,
    clusterScenario,
    queryState,
    exportPayload
  };
});
