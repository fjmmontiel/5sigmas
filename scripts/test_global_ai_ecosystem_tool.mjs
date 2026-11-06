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

assert(data.snapshot_date === '2026-11-06', 'Dataset snapshot date drifted');
assert(data.methodology_version === '2026-09-25-v3', 'Methodology version drifted');
assert(data.metrics.length === 6, 'Expected six independently selectable signals');
assert(data.freshness_policy?.review_interval_days === 30, 'Global ecosystem freshness interval must remain explicit');
assert(/metric values are from 2025/i.test(data.scope_note), 'Snapshot must distinguish revalidation date from source-data year');
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

const talentScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'ai_skill_penetration_2025'] });
assert(talentScenario.comparableCount === 8, `Expected 8 countries with current-momentum plus talent coverage, got ${talentScenario.comparableCount}`);
assert(talentScenario.rows.some((row) => row.id === 'il'), 'Verified Israel skill penetration should remain available');
assert(talentScenario.rows.some((row) => row.id === 'sg'), 'Published Singapore 2025 skill value should be available');

const policyScenario = Core.computeScenario(data, { activeMetrics: [...defaultScenario.activeIds, 'policy_capacity_2025'] });
assert(policyScenario.comparableCount === 0, `Unavailable policy values must produce zero comparable countries, got ${policyScenario.comparableCount}`);
assert(policyScenario.rows.length === 0, 'An unavailable metric must not produce ranked rows');
assert(policyScenario.excluded.length === data.countries.length, 'All countries must be excluded when policy is missing');
assert(data.countries.every((country) => country.values.policy_capacity_2025 === null), 'Unverified policy observations must remain null');
assert(data.countries.every((country) => country.reference_vibrancy_2024 === null), 'Unverified Stanford reference scores must remain null');
close(Object.values(policyScenario.weights).reduce((a, b) => a + b, 0), 1);
close(policyScenario.weights.policy_capacity_2025, 1 / 3);
const oxfordSource = data.sources.find((source) => source.id === 'oxford_gair_2025');
assert(/personal-data form/i.test(oxfordSource?.notes || '') && /could not be reverified/i.test(oxfordSource?.notes || ''), 'Oxford provenance must distinguish page access from unavailable values');

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

const legacy = Core.decodeState('?m=private_investment_2025,new_ai_companies_2025,ai_skill_penetration_2024,unknown&w_ai_skill_penetration_2024=3&w_unknown=9', data);
assert(legacy.activeMetrics.join(',') === 'private_investment_2025,new_ai_companies_2025,ai_skill_penetration_2025', 'Legacy talent signal must map to the current year while unknown metrics are rejected');
assert(legacy.weights.ai_skill_penetration_2025 === 3 && !('unknown' in legacy.weights), 'Legacy talent weight must survive and unknown weights must be rejected');
const canonicalLegacy = new URLSearchParams(Core.encodeState(legacy));
assert(canonicalLegacy.get('m').includes('ai_skill_penetration_2025') && !canonicalLegacy.get('m').includes('ai_skill_penetration_2024'), 'Re-encoded talent signal must use the current ID');
assert(canonicalLegacy.get('w_ai_skill_penetration_2025') === '3' && !canonicalLegacy.has('w_ai_skill_penetration_2024'), 'Re-encoded talent weight must use the current ID');
const bothTalentWeights = Core.decodeState('?m=ai_skill_penetration_2024,ai_skill_penetration_2025&w_ai_skill_penetration_2024=3&w_ai_skill_penetration_2025=2', data);
assert(bothTalentWeights.activeMetrics.join(',') === 'ai_skill_penetration_2025' && bothTalentWeights.weights.ai_skill_penetration_2025 === 2, 'Current ID and weight must take precedence over the legacy alias');
const withoutCurrentTalent = { ...data, metrics: data.metrics.filter((metric) => metric.id !== 'ai_skill_penetration_2025') };
const absentTalent = Core.decodeState('?m=ai_skill_penetration_2024&w_ai_skill_penetration_2024=3', withoutCurrentTalent);
assert(absentTalent.activeMetrics === undefined && !('ai_skill_penetration_2025' in absentTalent.weights), 'Legacy alias must only apply when the current metric exists');


const sourceIds = new Set(data.sources.map((source) => source.id));
data.metrics.forEach((metric) => assert(sourceIds.has(metric.source_id), `Missing source ${metric.source_id}`));
data.sources.forEach((source) => {
  assert(/^https:\/\//.test(source.url), `Source ${source.id} must have an HTTPS URL`);
  assert(source.retrieved === data.snapshot_date, `Source ${source.id} must carry the current retrieval date`);
});

const investmentCountries = data.countries.filter((country) => country.values.private_investment_2025 !== null);
const companyCountries = data.countries.filter((country) => country.values.new_ai_companies_2025 !== null);
const datacenterCountries = data.countries.filter((country) => country.values.data_centers_2025 !== null);
const skillCountries = data.countries.filter((country) => country.values.ai_skill_penetration_2025 !== null);
assert(investmentCountries.length === 15, '2025 investment signal must reproduce the 15 published areas, no more and no fewer');
assert(companyCountries.length === 15, '2025 company-formation signal must reproduce the 15 published areas, no more and no fewer');
assert(datacenterCountries.length === 15, '2025 data-center signal must reproduce the 15 published areas, no more and no fewer');
assert(skillCountries.length === 15, '2015–25 skill penetration signal must reproduce the 15 published country observations');

const publishedSkills = { in: 2.95, us: 2.02, de: 1.83, gb: 1.55, ca: 1.54, fr: 1.53, br: 1.48, es: 1.47, sg: 1.43, il: 1.38, ae: 1.37, tr: 1.28, it: 1.22, nl: 1.14, pl: 1.14 };
for (const country of data.countries) {
  assert(country.values.ai_skill_penetration_2025 === (publishedSkills[country.id] ?? null), `Incorrect 2025 skill value for ${country.id}`);
}


console.log('global-ai-ecosystem: 28-country coverage, normalization, missing-data, weighting, state and provenance checks passed');
