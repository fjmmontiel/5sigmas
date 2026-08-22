import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const Core = require(path.join(repo, 'docs/assets/javascripts/tools/training-compute-energy-core.js'));
const dataset = JSON.parse(fs.readFileSync(path.join(repo, 'docs/assets/data/tools/training-compute-energy.json'), 'utf8'));

function close(actual, expected, rel = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  if (Math.abs(actual - expected) > scale * rel) throw new Error(`Expected ${actual} ≈ ${expected}`);
}

Core.assertDataset(dataset);
const h100 = Core.presetById(dataset, 'h100-sxm-bf16');
if (h100.peak_tflops !== 989 || h100.tdp_w !== 700) throw new Error('H100 reference preset drifted');
if (!dataset.sources['hoffmann-2022']?.url.includes('2203.15556')) throw new Error('Missing dense-training compute provenance');
if (!dataset.sources['green-grid-pue']?.url.includes('thegreengrid.org')) throw new Error('Missing PUE provenance');

close(Core.denseTrainingCompute(70, 1400, 6), 5.88e23, 1e-12);
const base = Core.clusterScenario({
  gpus: 1024,
  durationHours: 720,
  mfuPct: 45,
  powerUtilizationPct: 85,
  otherITPct: 15,
  pue: 1.2,
  parametersB: 70,
  tokensB: 1400,
  computeFactor: 6
}, h100);
close(base.achievedPetaFlops, 455.7312, 1e-12);
close(base.requiredModelFlops, 5.88e23, 1e-12);
close(base.deliveredModelFlops, 1.1812552704e24, 1e-12);
close(base.coverage, 2.0089375346938776, 1e-12);
close(base.acceleratorPowerKW, 609.28, 1e-12);
close(base.facilityPowerKW, 840.8064, 1e-12);
close(base.facilityEnergyMWh, 605.380608, 1e-12);
close(base.estimatedHoursForWorkload, 358.3984009287346, 1e-12);
close(base.workloadFacilityEnergyMWh, 301.3436692506459, 1e-12);
if (base.scheduleStatus !== 'long') throw new Error('Default schedule should exceed approximate workload compute');

const halfMfu = Core.clusterScenario({ ...base.input, gpus: 1024, durationHours: 720, mfuPct: 22.5, powerUtilizationPct: 85, otherITPct: 15, pue: 1.2, parametersB: 70, tokensB: 1400, computeFactor: 6 }, h100);
close(halfMfu.achievedModelFlopsPerSecond, base.achievedModelFlopsPerSecond / 2, 1e-12);
close(halfMfu.estimatedHoursForWorkload, base.estimatedHoursForWorkload * 2, 1e-12);
close(halfMfu.facilityPowerKW, base.facilityPowerKW, 1e-12);

const pueOne = Core.clusterScenario({ gpus: 1024, durationHours: 720, mfuPct: 45, powerUtilizationPct: 85, otherITPct: 15, pue: 1, parametersB: 70, tokensB: 1400, computeFactor: 6 }, h100);
close(pueOne.facilityOverheadKW, 0, 1e-12);
close(pueOne.facilityPowerKW, pueOne.totalITPowerKW, 1e-12);

const noOtherIT = Core.clusterScenario({ gpus: 1024, durationHours: 720, mfuPct: 45, powerUtilizationPct: 85, otherITPct: 0, pue: 1.2, parametersB: 70, tokensB: 1400, computeFactor: 6 }, h100);
close(noOtherIT.otherITPowerKW, 0, 1e-12);
close(noOtherIT.totalITPowerKW, noOtherIT.acceleratorPowerKW, 1e-12);

const doubledGpus = Core.clusterScenario({ gpus: 2048, durationHours: 720, mfuPct: 45, powerUtilizationPct: 85, otherITPct: 15, pue: 1.2, parametersB: 70, tokensB: 1400, computeFactor: 6 }, h100);
close(doubledGpus.achievedModelFlopsPerSecond, base.achievedModelFlopsPerSecond * 2, 1e-12);
close(doubledGpus.facilityPowerKW, base.facilityPowerKW * 2, 1e-12);
close(doubledGpus.estimatedHoursForWorkload, base.estimatedHoursForWorkload / 2, 1e-12);
close(doubledGpus.workloadFacilityEnergyMWh, base.workloadFacilityEnergyMWh, 1e-12);

const payload = Core.exportPayload(dataset, h100, {
  gpus: 1024, durationHours: 720, mfuPct: 45, powerUtilizationPct: 85, otherITPct: 15, pue: 1.2,
  parametersB: 70, tokensB: 1400, computeFactor: 6, peakTflops: 989, tdpW: 700
});
if (payload.methodologyVersion !== Core.METHODOLOGY_VERSION || payload.sourceReviewDate !== '2026-08-22') throw new Error('Export provenance metadata missing');
if (payload.hardware.source.organization !== 'NVIDIA') throw new Error('Hardware source omitted from export');
if (!payload.methodologySources.pue.url.includes('thegreengrid.org')) throw new Error('PUE source omitted from export');

console.log('training-compute-energy: numerical and provenance checks passed');
