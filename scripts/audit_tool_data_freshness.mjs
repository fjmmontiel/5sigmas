#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const now = new Date(process.env.S5_NOW || new Date().toISOString());
const dayMs = 86_400_000;

const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const ageDays = (value) => {
  assert.match(String(value || ''), /^\d{4}-\d{2}-\d{2}$/, `invalid freshness date: ${value}`);
  const date = new Date(`${value}T23:59:59Z`);
  return (now.getTime() - date.getTime()) / dayMs;
};
const assertFresh = (label, value, maxDays) => {
  const age = ageDays(value);
  assert.ok(age >= -1, `${label}: freshness date is unexpectedly in the future (${value})`);
  assert.ok(age <= maxDays, `${label}: stale by policy (${value}, age=${age.toFixed(2)}d, max=${maxDays}d)`);
};

const llm = read('docs/assets/data/tools/llm-pricing.json');
assertFresh('LLM pricing snapshot', llm.updated_at, Number(llm.freshness_policy?.review_interval_days || 14));
for (const preset of llm.presets || []) {
  assertFresh(`${preset.id} pricing source`, preset.source?.verified_on, Number(llm.freshness_policy?.review_interval_days || 14));
}
assert.equal(llm.release_coverage?.reviewed_through, llm.updated_at, 'LLM release coverage must match the pricing snapshot');

const voice = read('docs/assets/data/tools/voice-cost-capacity-presets.json');
assertFresh('Voice cost/capacity snapshot', voice.updated_at, Number(voice.freshness_policy?.review_interval_days || 14));
for (const preset of voice.presets || []) {
  for (const source of preset.sources || []) {
    assertFresh(`voice source ${source.component || source.title}`, source.verified_on, Number(voice.freshness_policy?.review_interval_days || 14));
  }
}
for (const row of voice.architecture_coverage?.reviewed_not_folded_into_cascade || []) {
  assertFresh(`voice architecture source ${row.architecture}`, row.source?.verified_on, Number(voice.freshness_policy?.review_interval_days || 14));
}

const timeline = read('docs/assets/data/tools/model-capability-timeline.json');
assertFresh('Model capability timeline', timeline.updated, 30);
assert.equal(timeline.release_coverage?.reviewed_through, timeline.updated, 'Timeline release coverage must match the dataset snapshot');

const architectures = read('docs/assets/data/tools/inference-vram-presets.json');
assertFresh('Inference/KV architecture snapshot', architectures.updated, Number(architectures.freshness_policy?.review_interval_days || 90));
assert.equal(architectures.architecture_coverage?.reviewed_through, architectures.updated, 'Architecture coverage must match the dataset snapshot');
for (const source of architectures.sources || []) {
  assertFresh(`architecture source ${source.id}`, source.verified_on, Number(architectures.freshness_policy?.review_interval_days || 90));
}

for (const [label, relativePath] of [
  ['Training compute/energy', 'docs/assets/data/tools/training-compute-energy.json'],
  ['Datacenter AI capacity', 'docs/assets/data/tools/datacenter-ai-capacity.json'],
]) {
  const data = read(relativePath);
  assertFresh(label, data.updated, 90);
  for (const [id, source] of Object.entries(data.sources || {})) {
    if (source.reviewed) assertFresh(`${label} source ${id}`, source.reviewed, 90);
  }
}

const ecosystem = read('docs/assets/data/tools/global-ai-ecosystem.json');
assertFresh('Global AI ecosystem', ecosystem.snapshot_date, Number(ecosystem.freshness_policy?.review_interval_days || 30));
assert.equal(ecosystem.revalidation?.reviewed_through, ecosystem.snapshot_date, 'Global ecosystem revalidation must match the snapshot');
for (const source of ecosystem.sources || []) {
  if (source.retrieved) assertFresh(`ecosystem source ${source.id}`, source.retrieved, Number(ecosystem.freshness_policy?.review_interval_days || 30));
}

console.log([
  `Tool data freshness passed at ${now.toISOString()}`,
  `LLM=${llm.updated_at}`,
  `voice=${voice.updated_at}`,
  `timeline=${timeline.updated}`,
  `architectures=${architectures.updated}`,
  `ecosystem=${ecosystem.snapshot_date}`,
].join(' | '));
