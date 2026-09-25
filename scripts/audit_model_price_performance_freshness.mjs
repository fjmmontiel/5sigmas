#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'docs/assets/data/tools/model-price-performance.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const maxAgeArg = process.argv.find((arg) => arg.startsWith('--max-age-days='));
const maxAgeDays = Number(maxAgeArg?.split('=')[1] || 8);
const now = new Date(process.env.S5_NOW || new Date().toISOString());
const dayMs = 86_400_000;

const ageDays = (value) => {
  const date = new Date(`${value}T23:59:59Z`);
  assert.ok(!Number.isNaN(date.getTime()), `invalid date: ${value}`);
  return (now.getTime() - date.getTime()) / dayMs;
};

assert.ok(Number.isFinite(maxAgeDays) && maxAgeDays > 0, 'max-age-days must be positive');
assert.ok(data.updated_at, 'updated_at missing');
assert.ok(ageDays(data.updated_at) <= maxAgeDays, `model explorer snapshot is stale: ${data.updated_at} is older than ${maxAgeDays} days`);
assert.equal(data.release_coverage?.reviewed_through, data.updated_at, 'release coverage must be reviewed through the dataset snapshot');
assert.match(data.release_coverage?.source?.url || '', /^https:\/\/artificialanalysis\.ai\/models\/releases/);
assert.ok(data.methodology?.benchmark?.includes('Artificial Analysis Intelligence Index v4.3.2'), 'benchmark version must be pinned');
assert.ok(Array.isArray(data.release_coverage?.included_release_names) && data.release_coverage.included_release_names.length > 0);
assert.ok(Array.isArray(data.release_coverage?.reviewed_not_charted));
assert.ok(data.release_coverage.reviewed_not_charted.every((entry) => entry.model && entry.reason), 'every non-charted release needs a reason');

for (const model of data.models || []) {
  for (const key of ['specs_pricing', 'benchmark']) {
    const source = model.sources?.[key];
    assert.ok(source?.verified_on, `${model.id}: ${key} verified_on missing`);
    assert.ok(ageDays(source.verified_on) <= maxAgeDays, `${model.id}: ${key} verification is stale (${source.verified_on})`);
  }
  const perf = model.sources?.benchmark?.performance_snapshot_on;
  assert.ok(perf, `${model.id}: performance snapshot date missing`);
  assert.ok(ageDays(perf) <= maxAgeDays, `${model.id}: performance snapshot is stale (${perf})`);
}

console.log(`Model explorer freshness passed: snapshot ${data.updated_at}, ${data.models.length} charted configurations, ${data.release_coverage.reviewed_not_charted.length} reviewed exclusions, max age ${maxAgeDays} days.`);
