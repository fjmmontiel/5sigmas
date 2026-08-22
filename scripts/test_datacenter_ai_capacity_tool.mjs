import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const Core = require(path.join(repo, 'docs/assets/javascripts/tools/datacenter-ai-capacity-core.js'));
const dataset = JSON.parse(fs.readFileSync(path.join(repo, 'docs/assets/data/tools/datacenter-ai-capacity.json'), 'utf8'));

function close(actual, expected, rel = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  if (Math.abs(actual - expected) > scale * rel) throw new Error(`Expected ${actual} ≈ ${expected}`);
}

Core.assertDataset(dataset);
const h200 = Core.presetById(dataset, 'h200-sxm-bf16');
const b200 = Core.presetById(dataset, 'b200-sxm-bf16');
if (h200.peak_dense_tflops !== 989.5 || h200.tdp_w !== 700) throw new Error('H200 reference preset drifted');
if (b200.peak_dense_tflops !== 2250 || b200.tdp_w !== 1000) throw new Error('B200 reference preset drifted');
if (!dataset.sources['nvidia-b200-rack']?.url.includes('dgx-superpod-data-center-best-practices')) throw new Error('Missing rack power/cooling provenance');
if (!dataset.sources['green-grid-pue']?.url.includes('thegreengrid.org')) throw new Error('Missing PUE provenance');

const defaults = {
  facilityMW: 10,
  pue: 1.2,
  facilityReservePct: 10,
  racks: 200,
  installedPerRack: 64,
  rackPowerKW: 60,
  rackCoolingKW: 50,
  powerUtilizationPct: 85,
  otherITPct: 15,
  mfuPct: 45,
  measuredTokensPerSecPerAccelerator: 0,
  avgOutputTokens: 500
};
const base = Core.scenario(defaults, h200);
close(base.nominalITCapacityKW, 8333.333333333334, 1e-12);
close(base.usableITCapacityKW, 7500, 1e-12);
close(base.perAcceleratorITKW, 0.68425, 1e-12);
if (base.facilityPowerCapacity !== 10960) throw new Error(`Unexpected facility accelerator capacity: ${base.facilityPowerCapacity}`);
if (base.installedCapacity !== 12800) throw new Error('Installed capacity drifted');
if (base.perRackElectricalCapacity !== 87 || base.perRackCoolingCapacity !== 73) throw new Error('Rack constraint capacities drifted');
if (base.activeAccelerators !== 10960 || base.bottlenecks.length !== 1 || base.bottlenecks[0] !== 'facility_power') throw new Error('Default scenario should be facility-power limited');
close(base.facilityDrawKW, 8999.256, 1e-12);
close(base.facilityHeadroomKW, 1000.744, 1e-12);
close(base.peakDensePetaFlops, 10844.92, 1e-12);
close(base.sustainedTrainingPetaFlops, 4880.214, 1e-12);
close(base.trainingExaFlopsPerDay, 421650.4896, 1e-12);
if (base.inferenceAvailable || base.aggregateOutputTokensPerSec !== null) throw new Error('Inference mapping must be disabled without a measured throughput');

const coolingLimited = Core.scenario({ ...defaults, rackCoolingKW: 10 }, h200);
if (coolingLimited.perRackCoolingCapacity !== 14 || coolingLimited.activeAccelerators !== 2800 || !coolingLimited.bottlenecks.includes('rack_cooling')) throw new Error('Rack cooling limit not enforced');

const electricalLimited = Core.scenario({ ...defaults, rackPowerKW: 8 }, h200);
if (electricalLimited.perRackElectricalCapacity !== 11 || electricalLimited.activeAccelerators !== 2200 || !electricalLimited.bottlenecks.includes('rack_electrical')) throw new Error('Rack electrical limit not enforced');

const slotLimited = Core.scenario({ ...defaults, installedPerRack: 8 }, h200);
if (slotLimited.activeAccelerators !== 1600 || !slotLimited.bottlenecks.includes('installed_slots')) throw new Error('Physical installed-slot limit not enforced');

const pueOne = Core.scenario({ ...defaults, pue: 1 }, h200);
if (pueOne.facilityPowerCapacity <= base.facilityPowerCapacity) throw new Error('Lower PUE should expose more IT capacity for a fixed total facility envelope');

const halfMfu = Core.scenario({ ...defaults, mfuPct: 22.5 }, h200);
close(halfMfu.sustainedTrainingPetaFlops, base.sustainedTrainingPetaFlops / 2, 1e-12);
close(halfMfu.facilityDrawKW, base.facilityDrawKW, 1e-12);
if (halfMfu.activeAccelerators !== base.activeAccelerators) throw new Error('MFU must not implicitly alter infrastructure capacity');

const inference = Core.scenario({ ...defaults, measuredTokensPerSecPerAccelerator: 250, avgOutputTokens: 500 }, h200);
if (!inference.inferenceAvailable) throw new Error('Measured inference mapping should be enabled');
close(inference.aggregateOutputTokensPerSec, 2740000, 1e-12);
close(inference.approximateCompletionsPerSec, 5480, 1e-12);

const highPower = Core.scenario({ ...defaults }, { ...h200, tdp_w: 1000 });
if (highPower.activeAccelerators >= base.activeAccelerators) throw new Error('Higher accelerator power should not increase capacity');

const state = Core.queryState('?hw=h200-sxm-bf16&fac=20&pue=1.15&res=0&r=100&inst=32&rp=45&rc=40&pwr=75&it=20&mfu=50&tok=0&out=256', h200);
if (state.facilityMW !== 20 || state.facilityReservePct !== 0 || state.measuredTokensPerSecPerAccelerator !== 0 || state.avgOutputTokens !== 256) throw new Error('Deep-link state parsing drifted');

const payload = Core.exportPayload(dataset, h200, { ...defaults, peakTflops: 989.5, tdpW: 700 });
if (payload.methodologyVersion !== Core.METHODOLOGY_VERSION || payload.sourceReviewDate !== '2026-08-22') throw new Error('Export provenance metadata missing');
if (payload.hardware.source.organization !== 'NVIDIA') throw new Error('Hardware source omitted from export');
if (!payload.methodologySources.rackPowerCooling.url.includes('nvidia-dgx-superpod')) throw new Error('Rack methodology source omitted from export');
if (!payload.methodologySources.pue.url.includes('thegreengrid.org')) throw new Error('PUE source omitted from export');

console.log('datacenter-ai-capacity: numerical, constraint and provenance checks passed');
