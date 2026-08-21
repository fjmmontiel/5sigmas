#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/inference-vram-core.js');
const data = JSON.parse(fs.readFileSync('docs/assets/data/tools/inference-vram-presets.json', 'utf8'));
const failures = [];
const close = (actual, expected, tolerance, label) => {
  if (Math.abs(actual - expected) > tolerance) failures.push(`${label}: expected ${expected}, got ${actual}`);
};
const assert = (condition, label) => { if (!condition) failures.push(label); };

const base = {
  parametersB: 8,
  weightBits: 16,
  weightMetadataPct: 0,
  layers: 32,
  hiddenSize: 4096,
  attentionHeads: 32,
  kvHeads: 8,
  contextTokens: 8192,
  concurrentSequences: 1,
  kvBits: 16,
  runtimeOverheadPct: 10,
  devices: 1,
  gpuVramGiB: 24
};

const result = core.calculate(base);
close(result.weights.totalGiB, 14.901161193847656, 1e-9, '8B BF16 nominal weight memory');
close(result.kv.mibPerTokenPerSequence, 0.125, 1e-12, 'Llama 3.1 8B KV bytes per token');
close(result.kv.totalGiB, 1, 1e-12, '8192-token KV cache');
close(result.memory.totalGiB, 17.491277313232423, 1e-9, 'total with 10% runtime reserve');
assert(result.memory.fits === true, 'default 8B scenario should fit 24 GiB under the declared approximation');
assert(result.architecture.valid === true, 'Llama 3.1 8B attention geometry should validate');
close(result.architecture.kvVsMhaRatio, 0.25, 1e-12, 'GQA KV/MHA memory ratio');
assert(result.capacity.maxContextTokens === 56665, `expected max context 56665, got ${result.capacity.maxContextTokens}`);
assert(result.capacity.maxConcurrentSequences === 6, `expected max sequences 6, got ${result.capacity.maxConcurrentSequences}`);

const quantized = core.calculate({ ...base, weightBits: 4, runtimeOverheadPct: 0, contextTokens: 0, concurrentSequences: 0 });
close(quantized.weights.totalGiB, 3.725290298461914, 1e-9, '8B INT4 nominal weight memory');

const doubledContext = core.calculate({ ...base, contextTokens: 16384 });
close(doubledContext.kv.totalGiB, 2, 1e-12, 'KV cache should scale linearly with context');
const fourSequences = core.calculate({ ...base, concurrentSequences: 4 });
close(fourSequences.kv.totalGiB, 4, 1e-12, 'KV cache should scale linearly with concurrent sequences');

const fullMha = core.calculate({ ...base, kvHeads: 32 });
close(fullMha.kv.totalGiB, 4, 1e-12, 'full MHA KV cache should be 4x the 8-head GQA cache');
close(fullMha.architecture.kvVsMhaRatio, 1, 1e-12, 'full MHA KV ratio');

const invalid = core.calculate({ ...base, hiddenSize: 4100, attentionHeads: 32, kvHeads: 7 });
assert(invalid.architecture.valid === false, 'invalid attention geometry must not be reported as valid');
assert(invalid.architecture.issues.includes('attention_heads_not_divisible_by_kv_heads'), 'invalid GQA divisibility should be surfaced');
assert(invalid.architecture.issues.includes('hidden_size_not_divisible_by_attention_heads'), 'invalid head dimension should be surfaced');

assert(data.version >= 1, 'preset dataset version missing');
assert(/^2026-\d{2}-\d{2}$/.test(data.updated), 'preset dataset must carry an update date');
assert(Array.isArray(data.presets) && data.presets.length >= 3, 'expected at least three sourced architecture presets');
assert(Array.isArray(data.sources) && data.sources.length >= 3, 'expected explicit primary-source records');
const sourceIds = new Set(data.sources.map((source) => source.id));
for (const source of data.sources) {
  assert(source.organization && source.title, `source ${source.id} needs organization/title`);
  assert(source.url?.startsWith('https://'), `source ${source.id} needs HTTPS provenance`);
  assert(/^2026-\d{2}-\d{2}$/.test(source.verified_on || ''), `source ${source.id} needs verification date`);
}
for (const preset of data.presets) {
  for (const key of ['parameters_b', 'layers', 'hidden_size', 'attention_heads', 'kv_heads', 'max_context_tokens']) {
    assert(Number(preset[key]) > 0, `${preset.id} missing positive ${key}`);
  }
  assert(preset.kv_heads <= preset.attention_heads, `${preset.id} KV heads exceed attention heads`);
  assert(preset.attention_heads % preset.kv_heads === 0, `${preset.id} attention heads must divide by KV heads`);
  assert(preset.hidden_size % preset.attention_heads === 0, `${preset.id} hidden size must divide by attention heads`);
  assert(Array.isArray(preset.source_ids) && preset.source_ids.length > 0, `${preset.id} needs source IDs`);
  for (const id of preset.source_ids) assert(sourceIds.has(id), `${preset.id} references unknown source ${id}`);
  assert(preset.note_es && preset.note_en, `${preset.id} needs ES/EN caveats`);
}

if (failures.length) {
  console.error('Inference VRAM tool tests failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Inference VRAM tool tests passed: weights, KV cache, GQA, capacity inversion, validation and provenance verified.');
