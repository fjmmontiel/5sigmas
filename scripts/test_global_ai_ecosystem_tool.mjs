import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const Core = require(path.join(repo, 'docs/assets/javascripts/tools/global-ai-ecosystem-core.js'));
const data = JSON.parse(fs.readFileSync(path.join(repo, 'docs/assets/data/tools/global-ai-ecosystem.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function close(actual, expected, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`Expected ${actual} ≈ ${expected}`);
}

assert(data.snapshot_date === '2026-08-22', 'Dataset snapshot date drifted');
assert(data.methodology_version === '2026-08-22-v1', 'Methodology version drifted');
assert(data.metrics.length === 6, 'Expected six independently selectable signals');
assert(data.countries.length === 10, 'Initial country set must remain explicit');

const defaultScenario = Core.computeScenario(data, {});
assert(defaultScenario.activeIds.join(',') === 'private_investment_2025,new_ai_companies_2025,data_centers_2025', 'Default active signals drifted');
assert(defaultScenario.comparableCount === 9, `Expected 9 default-comparable countries, got ${defaultScenario.comparableCount}`);
assert(defaultScenario.excluded.length === 1 && defaultScenario.excluded[0].id === 'sg', 'Singapore must be excluded when its data-center value is missing');
assert(defaultScenario.excluded[0].missing.includes('data_centers_2025'), 'Missing-data reason must remain explicit');
assert(defaultScenario.rows[0].id === 'us', 'US should lead the initial sourced scenario');
close(Object.values(defaultScenario.weights).reduce((a, b) => a + b, 0), 1);
assert(!defaultScenario.activeIds.includes('reference_vibrancy_2024'), 'External Stanford composite must never enter the 5sigmas composite');

const singapore = data.countries.find((country) => country.id === 'sg');
assert(singapore.values.data_centers_2025 === null, 'Missing observation must remain null in source data');
assert(Core.transformValue(null, 'linear') === null, 'Null must never be coerced to zero');
assert(Core.transformValue('', 'linear') === null, 'Empty value must never be coerced to zero');

const modelsScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'notable_models_2025'] });
assert(modelsScenario.comparableCount === 5, `Expected 5 countries when notable models are active, got ${modelsScenario.comparableCount}`);
assert(modelsScenario.rows.map((row) => row.id).every((id) => ['us','cn','gb','ca','fr'].includes(id)), 'Model-development coverage must not invent missing values');

const talentScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'ai_skill_penetration_2024'] });
assert(talentScenario.comparableCount === 7, `Expected 7 countries with talent coverage, got ${talentScenario.comparableCount}`);

const policyScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'policy_capacity_2025'] });
assert(policyScenario.comparableCount === 8, `Expected 8 countries with policy coverage, got ${policyScenario.comparableCount}`);
assert(policyScenario.excluded.some((item) => item.id === 'ca' && item.missing.includes('policy_capacity_2025')), 'Canada missing policy observation must exclude it rather than become zero');

const zeroWeights = Core.computeScenario(data, {
  activeMetrics: defaultScenario.activeIds,
  weights: Object.fromEntries(defaultScenario.activeIds.map((id) => [id, 0]))
});
defaultScenario.activeIds.forEach((id) => close(zeroWeights.weights[id], 1 / 3));

const investment = data.metrics.find((metric) => metric.id === 'private_investment_2025');
const investmentBounds = defaultScenario.bounds.private_investment_2025;
const us = data.countries.find((country) => country.id === 'us');
assert(Core.normalizeMetric(us.values.private_investment_2025, investment, investmentBounds) === 100, 'Maximum investment should normalize to 100 in the default comparable set');
assert(Core.transformValue(285.88, 'log1p') < 285.88, 'Skewed count/capital signals must apply log1p before min-max normalization');

const encoded = Core.encodeState({ activeMetrics: ['private_investment_2025','data_centers_2025'], weights: { private_investment_2025: 2, data_centers_2025: 0.5 }, focus: 'fr' });
const decoded = Core.decodeState(`?${encoded}`, data);
assert(decoded.activeMetrics.join(',') === 'private_investment_2025,data_centers_2025', 'Deep-link metric state did not round-trip');
assert(decoded.weights.private_investment_2025 === 2 && decoded.weights.data_centers_2025 === 0.5, 'Deep-link weights did not round-trip');
assert(decoded.focus === 'fr', 'Deep-link focus did not round-trip');

const sourceIds = new Set(data.sources.map((source) => source.id));
data.metrics.forEach((metric) => assert(sourceIds.has(metric.source_id), `Missing source ${metric.source_id}`));
data.sources.forEach((source) => {
  assert(/^https:\/\//.test(source.url), `Source ${source.id} must have an HTTPS URL`);
  assert(source.retrieved === '2026-08-22', `Source ${source.id} must carry the current retrieval date`);
});

console.log('global-ai-ecosystem: normalization, missing-data, weighting, state and provenance checks passed');
