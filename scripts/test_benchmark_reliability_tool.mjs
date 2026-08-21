import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('docs/assets/javascripts/tools/benchmark-reliability-core.js', 'utf8');
const sandbox = { globalThis: {}, module: { exports: {} } };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'benchmark-reliability-core.js' });
const Core = sandbox.module.exports;

assert.equal(Core.METHODOLOGY_VERSION, '1.0.0');
assert.equal(Core.SOURCE_REVIEW_DATE, '2026-08-21');
assert.equal(Core.SOURCES.length, 3);
assert.ok(Core.SOURCES.some((s) => s.url.includes('2107.07002')), 'Benchmark Lottery source missing');
assert.ok(Core.SOURCES.some((s) => s.url.includes('2406.19314')), 'LiveBench source missing');

const defaults = Core.evaluate();
assert.ok(Math.abs(defaults.metrics.scoreA - 80.25) < 1e-9);
assert.ok(Math.abs(defaults.metrics.scoreB - 80) < 1e-9);
assert.equal(defaults.metrics.cleanItems, 980);
assert.equal(defaults.metrics.invalidItems, 20);
assert.equal(defaults.metrics.exposureItems, 49);
assert.equal(defaults.metrics.gapItems, 3);
assert.equal(defaults.metrics.intervalOverlap, true);
assert.equal(defaults.metrics.contaminationEnvelopeCoversGap, true);
assert.equal(defaults.metrics.invalidEnvelopeCoversGap, true);
assert.equal(defaults.metrics.rankSensitivity.flips, true);
assert.ok(defaults.metrics.rankSensitivity.minGap < 0);
assert.ok(defaults.metrics.rankSensitivity.maxGap > 0);
assert.ok(defaults.flags.includes('weight-fragile'));
assert.ok(defaults.flags.includes('statistically-unresolved'));

const stable = Core.evaluate({
  items: 100000,
  invalidRate: 0,
  contaminationExposure: 0,
  weightSwing: 10,
  groups: [
    { weight: 25, a: 90, b: 70 },
    { weight: 25, a: 88, b: 72 },
    { weight: 25, a: 86, b: 74 },
    { weight: 25, a: 84, b: 76 }
  ]
});
assert.equal(stable.metrics.rankSensitivity.flips, false);
assert.equal(stable.metrics.contaminationEnvelopeCoversGap, false);
assert.equal(stable.metrics.invalidEnvelopeCoversGap, false);
assert.equal(stable.metrics.intervalOverlap, false);
assert.ok(!stable.flags.includes('weight-fragile'));
assert.ok(!stable.flags.includes('statistically-unresolved'));

const saturated = Core.evaluate({
  items: 1000,
  invalidRate: 0,
  contaminationExposure: 0,
  weightSwing: 0,
  groups: [
    { weight: 25, a: 99, b: 98 },
    { weight: 25, a: 99, b: 98 },
    { weight: 25, a: 99, b: 98 },
    { weight: 25, a: 99, b: 98 }
  ]
});
assert.ok(saturated.metrics.maxHeadroom < 5);
assert.ok(saturated.flags.includes('saturated'));

const weights = Core.normalizedWeights([{weight:1},{weight:2},{weight:3},{weight:4}]);
assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0) - 1) < 1e-12);
assert.deepEqual(weights.map((x)=>Number(x.toFixed(1))), [0.1,0.2,0.3,0.4]);

console.log('benchmark reliability tool: numerical and provenance gates passed');
