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
assert(data.methodology_version === '2026-08-22-v2', 'Methodology version drifted');
assert(data.metrics.length === 6, 'Expected six independently selectable signals');
assert(data.countries.length === 28, `Expected 28 explicit country records, got ${data.countries.length}`);
assert(new Set(data.countries.map((country) => country.id)).size === data.countries.length, 'Country ids must be unique');

const defaultScenario = Core.computeScenario(data, {});
assert(defaultScenario.activeIds.join(',') === 'private_investment_2025,new_ai_companies_2025', 'Default active signals drifted');
assert(defaultScenario.comparableCount === 12, `Expected 12 default-comparable countries, got ${defaultScenario.comparableCount}`);
assert(defaultScenario.rows[0].id === 'us', 'US should lead the sourced default scenario');
close(Object.values(defaultScenario.weights).reduce((a, b) => a + b, 0), 1);
assert(!defaultScenario.activeIds.includes('reference_vibrancy_2024'), 'External Stanford composite must never enter the 5sigmas composite');
assert(defaultScenario.excluded.some((item) => item.id === 'sa' && item.missing.includes('new_ai_companies_2025')), 'Saudi Arabia must be explicitly excluded when company formation is missing');
assert(defaultScenario.excluded.some((item) => item.id === 'nl' && item.missing.includes('private_investment_2025')), 'Countries outside a source chart must remain missing rather than become zero');

const infrastructureScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'data_centers_2025'] });
assert(infrastructureScenario.comparableCount === 9, `Expected 9 countries with current capital, company and data-center coverage, got ${infrastructureScenario.comparableCount}`);
assert(infrastructureScenario.excluded.some((item) => item.id === 'sg' && item.missing.includes('data_centers_2025')), 'Singapore must remain missing for the published data-center chart');

assert(Core.transformValue(null, 'linear') === null, 'Null must never be coerced to zero');
assert(Core.transformValue('', 'linear') === null, 'Empty value must never be coerced to zero');
assert(Core.transformValue(undefined, 'log1p') === null, 'Undefined must never be coerced to zero');

const modelsScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'notable_models_2025'] });
assert(modelsScenario.comparableCount === 7, `Expected 7 countries when notable-model coverage is active, got ${modelsScenario.comparableCount}`);
assert(modelsScenario.rows.map((row) => row.id).every((id) => ['us','cn','gb','fr','ca','sg','kr'].includes(id)), 'Model-development coverage must not invent missing values');

const talentScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'ai_skill_penetration_2024'] });
assert(talentScenario.comparableCount === 8, `Expected 8 countries with current-momentum plus talent coverage, got ${talentScenario.comparableCount}`);
assert(talentScenario.rows.some((row) => row.id === 'il'), 'Verified Israel skill penetration should remain available');
assert(!talentScenario.rows.some((row) => row.id === 'sg'), 'Missing 2015–24 Singapore skill value must not be inferred from an older edition');

const policyScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'policy_capacity_2025'] });
assert(policyScenario.comparableCount === 9, `Expected 9 countries with current-momentum plus policy coverage, got ${policyScenario.comparableCount}`);
assert(policyScenario.excluded.some((item) => item.id === 'ca' && item.missing.includes('policy_capacity_2025')), 'Canada missing policy observation must exclude it rather than become zero');

const zeroWeights = Core.computeScenario(data, {
  activeMetrics: defaultScenario.activeIds,
  weights: Object.fromEntries(defaultScenario.activeIds.map((id) => [id, 0]))
});
defaultScenario.activeIds.forEach((id) => close(zeroWeights.weights[id], 1 / 2));

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

const investmentCountries = data.countries.filter((country) => country.values.private_investment_2025 !== null);
const companyCountries = data.countries.filter((country) => country.values.new_ai_companies_2025 !== null);
const datacenterCountries = data.countries.filter((country) => country.values.data_centers_2025 !== null);
const skillCountries = data.countries.filter((country) => country.values.ai_skill_penetration_2024 !== null);
assert(investmentCountries.length === 15, '2025 investment signal must reproduce the 15 published areas, no more and no fewer');
assert(companyCountries.length === 15, '2025 company-formation signal must reproduce the 15 published areas, no more and no fewer');
assert(datacenterCountries.length === 15, '2025 data-center signal must reproduce the 15 published areas, no more and no fewer');
assert(skillCountries.length === 14, '2015–24 skill penetration signal must reproduce the 14 country observations shown around the global baseline');

console.log('global-ai-ecosystem: 28-country coverage, normalization, missing-data, weighting, state and provenance checks passed');
