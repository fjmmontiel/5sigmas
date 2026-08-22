(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5DatacenterAICapacityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const METHODOLOGY_VERSION = '1.0.0';
  const SOURCE_REVIEW_DATE = '2026-08-22';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function finitePositive(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function finiteNonNegative(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function assertDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.presets) || !dataset.presets.length || !dataset.sources) {
      throw new Error('Invalid datacenter-ai-capacity dataset');
    }
    const ids = new Set();
    dataset.presets.forEach((preset) => {
      if (!preset.id || ids.has(preset.id)) throw new Error('Preset ids must be unique');
      ids.add(preset.id);
      ['peak_dense_tflops', 'tdp_w'].forEach((key) => {
        if (!Number.isFinite(Number(preset[key])) || Number(preset[key]) <= 0) throw new Error(`Invalid ${key} in ${preset.id}`);
      });
      if (!dataset.sources[preset.source]) throw new Error(`Unknown source ${preset.source}`);
    });
    ['nvidia-b200-rack', 'green-grid-pue'].forEach((id) => {
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
      peak_dense_tflops: clamp(finitePositive(input.peakTflops, preset.peak_dense_tflops), 0.001, 1e8),
      tdp_w: clamp(finitePositive(input.tdpW, preset.tdp_w), 1, 5000)
    };
  }

  function scenario(input, hardware) {
    const facilityMW = clamp(finitePositive(input.facilityMW, 10), 0.01, 1e6);
    const pue = clamp(finitePositive(input.pue, 1.2), 1, 5);
    const facilityReserve = clamp(finiteNonNegative(input.facilityReservePct, 10) / 100, 0, 0.95);
    const racks = Math.round(clamp(finitePositive(input.racks, 200), 1, 1e7));
    const installedPerRack = Math.round(clamp(finitePositive(input.installedPerRack, 64), 1, 100000));
    const rackPowerKW = clamp(finitePositive(input.rackPowerKW, 60), 0.1, 1e6);
    const rackCoolingKW = clamp(finitePositive(input.rackCoolingKW, 50), 0.1, 1e6);
    const powerUtilization = clamp(finitePositive(input.powerUtilizationPct, 85) / 100, 0.001, 1);
    const otherIT = clamp(finiteNonNegative(input.otherITPct, 15) / 100, 0, 10);
    const mfu = clamp(finitePositive(input.mfuPct, 45) / 100, 0.001, 1);
    const measuredTokensPerSecPerAccelerator = clamp(finiteNonNegative(input.measuredTokensPerSecPerAccelerator, 0), 0, 1e9);
    const avgOutputTokens = clamp(finitePositive(input.avgOutputTokens, 500), 1, 1e9);

    const facilityTotalKW = facilityMW * 1000;
    const nominalITCapacityKW = facilityTotalKW / pue;
    const reservedITKW = nominalITCapacityKW * facilityReserve;
    const usableITCapacityKW = nominalITCapacityKW - reservedITKW;

    const acceleratorPowerKW = Number(hardware.tdp_w) * powerUtilization / 1000;
    const perAcceleratorOtherITKW = acceleratorPowerKW * otherIT;
    const perAcceleratorITKW = acceleratorPowerKW + perAcceleratorOtherITKW;

    const facilityPowerCapacity = Math.max(0, Math.floor(usableITCapacityKW / perAcceleratorITKW));
    const installedCapacity = racks * installedPerRack;
    const perRackElectricalCapacity = Math.max(0, Math.floor(rackPowerKW / perAcceleratorITKW));
    const rackElectricalCapacity = racks * perRackElectricalCapacity;
    const perRackCoolingCapacity = Math.max(0, Math.floor(rackCoolingKW / perAcceleratorITKW));
    const rackCoolingCapacity = racks * perRackCoolingCapacity;

    const constraints = {
      facility_power: facilityPowerCapacity,
      installed_slots: installedCapacity,
      rack_electrical: rackElectricalCapacity,
      rack_cooling: rackCoolingCapacity
    };
    const activeAccelerators = Math.min(...Object.values(constraints));
    const bottlenecks = Object.entries(constraints)
      .filter(([, value]) => value === activeAccelerators)
      .map(([key]) => key);

    const maxActivePerRack = Math.min(installedPerRack, perRackElectricalCapacity, perRackCoolingCapacity);
    const usedITKW = activeAccelerators * perAcceleratorITKW;
    const facilityDrawKW = usedITKW * pue;
    const facilityHeadroomKW = Math.max(0, facilityTotalKW - facilityDrawKW);
    const usableITHeadroomKW = Math.max(0, usableITCapacityKW - usedITKW);
    const facilityUtilization = facilityDrawKW / facilityTotalKW;
    const physicalSlotUtilization = activeAccelerators / Math.max(1, installedCapacity);

    const rackITAtMaxKW = maxActivePerRack * perAcceleratorITKW;
    const rackElectricalHeadroomKW = Math.max(0, rackPowerKW - rackITAtMaxKW);
    const rackCoolingHeadroomKW = Math.max(0, rackCoolingKW - rackITAtMaxKW);

    const peakDensePetaFlops = activeAccelerators * Number(hardware.peak_dense_tflops) / 1000;
    const sustainedTrainingPetaFlops = peakDensePetaFlops * mfu;
    const trainingExaFlopsPerDay = sustainedTrainingPetaFlops * 86.4;

    const inferenceAvailable = measuredTokensPerSecPerAccelerator > 0;
    const aggregateOutputTokensPerSec = inferenceAvailable
      ? activeAccelerators * measuredTokensPerSecPerAccelerator
      : null;
    const approximateCompletionsPerSec = inferenceAvailable
      ? aggregateOutputTokensPerSec / avgOutputTokens
      : null;

    const strandedInstalledAccelerators = Math.max(0, installedCapacity - activeAccelerators);
    const strandedByFacility = Math.max(0, Math.min(installedCapacity, rackElectricalCapacity, rackCoolingCapacity) - activeAccelerators);

    return {
      input: {
        facilityMW, pue, facilityReserve, racks, installedPerRack, rackPowerKW, rackCoolingKW,
        powerUtilization, otherIT, mfu, measuredTokensPerSecPerAccelerator, avgOutputTokens
      },
      facilityTotalKW,
      nominalITCapacityKW,
      reservedITKW,
      usableITCapacityKW,
      acceleratorPowerKW,
      perAcceleratorOtherITKW,
      perAcceleratorITKW,
      facilityPowerCapacity,
      installedCapacity,
      perRackElectricalCapacity,
      rackElectricalCapacity,
      perRackCoolingCapacity,
      rackCoolingCapacity,
      activeAccelerators,
      bottlenecks,
      constraints,
      maxActivePerRack,
      usedITKW,
      facilityDrawKW,
      facilityHeadroomKW,
      usableITHeadroomKW,
      facilityUtilization,
      physicalSlotUtilization,
      rackITAtMaxKW,
      rackElectricalHeadroomKW,
      rackCoolingHeadroomKW,
      peakDensePetaFlops,
      sustainedTrainingPetaFlops,
      trainingExaFlopsPerDay,
      inferenceAvailable,
      aggregateOutputTokensPerSec,
      approximateCompletionsPerSec,
      strandedInstalledAccelerators,
      strandedByFacility
    };
  }

  function queryState(raw, preset) {
    const params = raw instanceof URLSearchParams ? raw : new URLSearchParams(raw || '');
    return {
      preset: params.get('hw') || preset.id,
      facilityMW: clamp(finitePositive(params.get('fac'), 10), 0.01, 1e6),
      pue: clamp(finitePositive(params.get('pue'), 1.2), 1, 5),
      facilityReservePct: clamp(finiteNonNegative(params.get('res'), 10), 0, 95),
      racks: Math.round(clamp(finitePositive(params.get('r'), 200), 1, 1e7)),
      installedPerRack: Math.round(clamp(finitePositive(params.get('inst'), 64), 1, 100000)),
      rackPowerKW: clamp(finitePositive(params.get('rp'), 60), 0.1, 1e6),
      rackCoolingKW: clamp(finitePositive(params.get('rc'), 50), 0.1, 1e6),
      powerUtilizationPct: clamp(finitePositive(params.get('pwr'), 85), 0.1, 100),
      otherITPct: clamp(finiteNonNegative(params.get('it'), 15), 0, 1000),
      mfuPct: clamp(finitePositive(params.get('mfu'), 45), 0.1, 100),
      measuredTokensPerSecPerAccelerator: clamp(finiteNonNegative(params.get('tok'), 0), 0, 1e9),
      avgOutputTokens: clamp(finitePositive(params.get('out'), 500), 1, 1e9),
      peakTflops: clamp(finitePositive(params.get('peak'), preset.peak_dense_tflops), 0.001, 1e8),
      tdpW: clamp(finitePositive(params.get('tdp'), preset.tdp_w), 1, 5000)
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
        peakDenseTflops: Number(hardware.peak_dense_tflops),
        maxTdpW: Number(hardware.tdp_w),
        source: dataset.sources[preset.source]
      },
      methodologySources: {
        rackPowerCooling: dataset.sources['nvidia-b200-rack'],
        pue: dataset.sources['green-grid-pue']
      },
      assumptions: {
        facilityMW: Number(input.facilityMW),
        pue: Number(input.pue),
        facilityReservePct: Number(input.facilityReservePct),
        racks: Number(input.racks),
        installedPerRack: Number(input.installedPerRack),
        rackPowerKW: Number(input.rackPowerKW),
        rackCoolingKW: Number(input.rackCoolingKW),
        powerUtilizationPct: Number(input.powerUtilizationPct),
        otherITPct: Number(input.otherITPct),
        mfuPct: Number(input.mfuPct),
        measuredTokensPerSecPerAccelerator: Number(input.measuredTokensPerSecPerAccelerator),
        avgOutputTokens: Number(input.avgOutputTokens)
      },
      result: scenario(input, hardware)
    };
  }

  return {
    METHODOLOGY_VERSION,
    SOURCE_REVIEW_DATE,
    assertDataset,
    presetById,
    effectiveHardware,
    scenario,
    queryState,
    exportPayload
  };
});
