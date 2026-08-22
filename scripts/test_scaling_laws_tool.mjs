import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../docs/assets/javascripts/tools/scaling-laws-core.js');
const dataset = JSON.parse(fs.readFileSync(new URL('../docs/assets/data/tools/scaling-laws.json', import.meta.url), 'utf8'));

Core.assertDataset(dataset);
assert.equal(dataset.updated, '2026-08-22');
const preset = Core.presetById(dataset, 'chinchilla-2022');
assert.equal(preset.E, 1.69);
assert.equal(preset.A, 406.4);
assert.equal(preset.B, 410.7);
assert.equal(preset.alpha, 0.34);
assert.equal(preset.beta, 0.28);
assert.equal(preset.compute_per_param_token, 6);

const N = 70e9;
const D = 1.4e12;
const C = Core.trainingCompute(N, D, preset.compute_per_param_token);
assert.equal(C, 5.88e23);
const loss = Core.predictedLoss(N, D, preset);
assert.ok(loss > preset.E && loss < 2.1);

const optimum = Core.optimumForCompute(C, preset);
assert.ok(Math.abs(Core.trainingCompute(optimum.N, optimum.D, 6) / C - 1) < 1e-12, 'Optimum must preserve compute exactly');
assert.ok(optimum.loss <= loss, 'Reallocation at fixed compute must not be worse than the starting allocation');
const derivativeBalanceLeft = preset.alpha * preset.A / Math.pow(optimum.N, preset.alpha);
const derivativeBalanceRight = preset.beta * preset.B / Math.pow(optimum.D, preset.beta);
assert.ok(Math.abs(derivativeBalanceLeft / derivativeBalanceRight - 1) < 1e-10, 'Optimum must satisfy the first-order balance condition');

const elasticities = Core.computeElasticities(preset);
assert.ok(Math.abs(elasticities.parameterExponent - preset.beta / (preset.alpha + preset.beta)) < 1e-12);
assert.ok(Math.abs(elasticities.tokenExponent - preset.alpha / (preset.alpha + preset.beta)) < 1e-12);
assert.ok(Math.abs(elasticities.parameterExponent + elasticities.tokenExponent - 1) < 1e-12);

const scenario = Core.scenario({ parametersB: 70, tokensB: 1400, budgetMultiplier: 10 }, preset);
assert.ok(Math.abs(scenario.targetCompute / scenario.currentCompute - 10) < 1e-12);
assert.ok(Math.abs(Core.trainingCompute(scenario.sameRatio.N, scenario.sameRatio.D, 6) / scenario.targetCompute - 1) < 1e-12);
assert.ok(scenario.sameRatio.loss >= scenario.optimum.loss);

const balanced = Core.scenario({ parametersB: optimum.N / 1e9, tokensB: optimum.D / 1e9, budgetMultiplier: 1 }, preset);
assert.equal(balanced.orientation, 'balanced');
assert.ok(balanced.lossGap < 1e-10);

const counterfactual = Core.effectivePreset(preset, { alpha: 0.2, beta: 0.4 });
const e2 = Core.computeElasticities(counterfactual);
assert.ok(e2.parameterExponent > e2.tokenExponent, 'Larger data exponent should move compute elasticity toward parameters');

const curve = Core.allocationCurve(C, preset, 51);
assert.equal(curve.points.length, 51);
const minCurveLoss = Math.min(...curve.points.map((point) => point.loss));
assert.ok(Math.abs(minCurveLoss - curve.optimum.loss) < 0.005, 'Allocation curve should resolve the analytical optimum');

const state = Core.queryState('?n=13&d=260&c=4&a=0.31&b=0.29', preset);
assert.deepEqual(state, { parametersB: 13, tokensB: 260, budgetMultiplier: 4, alpha: 0.31, beta: 0.29 });
const fallback = Core.queryState('?n=-1&d=nope&c=0&a=0&b=9', preset);
assert.equal(fallback.parametersB, 70);
assert.equal(fallback.tokensB, 1400);
assert.equal(fallback.budgetMultiplier, 1);
assert.equal(fallback.alpha, preset.alpha);
assert.equal(fallback.beta, 2);

const exported = Core.exportPayload(dataset, preset, { parametersB: 70, tokensB: 1400, budgetMultiplier: 1, alpha: 0.34, beta: 0.28 });
assert.equal(exported.methodologyVersion, '1.0.0');
assert.equal(exported.sourceReviewDate, '2026-08-22');
assert.equal(exported.assumptions.source.url, 'https://arxiv.org/abs/2203.15556');
assert.match(dataset.sources['kaplan-2020'].url, /^https:\/\/arxiv\.org\/abs\/2001\.08361$/);

console.log('scaling laws: compute, optimum, sensitivity, export and provenance gates passed');
