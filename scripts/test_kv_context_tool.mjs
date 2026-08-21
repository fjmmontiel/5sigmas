#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/kv-context-core.js');
const data = JSON.parse(fs.readFileSync('docs/assets/data/tools/inference-vram-presets.json', 'utf8'));
const failures = [];
const close = (actual, expected, tolerance, label) => {
  if (Math.abs(actual - expected) > tolerance) failures.push(`${label}: expected ${expected}, got ${actual}`);
};
const assert = (condition, label) => { if (!condition) failures.push(label); };

const base = {
  layers: 32,
  hiddenSize: 4096,
  attentionHeads: 32,
  kvHeads: 8,
  kvBits: 16,
  contextTokens: 8192,
  concurrentSequences: 1,
  kvBudgetGiB: 16
};

const result = core.calculate(base);
close(result.architecture.headDim, 128, 1e-12, 'Llama 3.1 8B head dimension');
close(result.perToken.mib, 0.125, 1e-12, 'KV payload per token per sequence');
close(result.selected.gib, 1, 1e-12, '8192-token KV cache');
close(result.selected.mhaGiB, 4, 1e-12, 'full-MHA equivalent KV cache');
close(result.architecture.kvVsMhaRatio, 0.25, 1e-12, 'GQA KV/MHA ratio');
close(result.budget.utilization, 0.0625, 1e-12, '16 GiB budget utilization');
assert(result.budget.fits === true, 'default 8B scenario should fit a 16 GiB KV-only budget');
assert(result.budget.maxContextTokens === 131072, `expected max context 131072, got ${result.budget.maxContextTokens}`);
assert(result.budget.maxConcurrentSequences === 16, `expected max sequences 16, got ${result.budget.maxConcurrentSequences}`);
assert(result.architecture.valid === true, 'Llama 3.1 8B attention geometry should validate');

const doubledContext = core.calculate({ ...base, contextTokens: 16384 });
close(doubledContext.selected.gib, 2, 1e-12, 'KV memory should scale linearly with context');
const fourSequences = core.calculate({ ...base, concurrentSequences: 4 });
close(fourSequences.selected.gib, 4, 1e-12, 'KV memory should scale linearly with concurrent sequences');
const fp8 = core.calculate({ ...base, kvBits: 8 });
close(fp8.selected.gib, 0.5, 1e-12, '8-bit KV payload should halve ideal storage');
const fullMha = core.calculate({ ...base, kvHeads: 32 });
close(fullMha.selected.gib, 4, 1e-12, 'full MHA should use 4x the default GQA KV payload');
close(fullMha.architecture.kvVsMhaRatio, 1, 1e-12, 'full MHA ratio');

const exactBudget = core.calculate({ ...base, kvBudgetGiB: 1 });
assert(exactBudget.budget.fits === true, 'KV payload equal to the budget should fit');
close(exactBudget.budget.headroomGiB, 0, 1e-12, 'exact-budget headroom');
const overBudget = core.calculate({ ...base, kvBudgetGiB: 0.5 });
assert(overBudget.budget.fits === false, 'KV payload above the budget should not fit');
close(overBudget.budget.headroomGiB, -0.5, 1e-12, 'over-budget deficit');
const noBudget = core.calculate({ ...base, kvBudgetGiB: 0 });
assert(noBudget.budget.fits === null, 'zero budget should be treated as unspecified capacity');
assert(noBudget.budget.maxContextTokens === null, 'zero budget should not claim a max context');

const invalid = core.calculate({ ...base, hiddenSize: 4100, attentionHeads: 32, kvHeads: 7 });
assert(invalid.architecture.valid === false, 'invalid attention geometry must not be reported as valid');
assert(invalid.architecture.issues.includes('attention_heads_not_divisible_by_kv_heads'), 'invalid GQA divisibility should be surfaced');
assert(invalid.architecture.issues.includes('hidden_size_not_divisible_by_attention_heads'), 'invalid head dimension should be surfaced');

const curve = core.curve(base, [8192, 16384, 32768]);
assert(curve.length === 3, 'expected three deterministic curve points');
close(curve[1].kvGiB / curve[0].kvGiB, 2, 1e-12, 'curve should double when context doubles');
close(curve[2].kvGiB / curve[1].kvGiB, 2, 1e-12, 'curve should remain linear across powers of two');
close(curve[0].mhaGiB / curve[0].kvGiB, 4, 1e-12, 'curve should preserve MHA/GQA ratio');

assert(data.version >= 1, 'shared architecture dataset version missing');
assert(/^2026-\d{2}-\d{2}$/.test(data.updated), 'shared architecture dataset needs an update date');
const llama8 = data.presets.find((preset) => preset.id === 'meta-llama-3-1-8b');
assert(Boolean(llama8), 'Llama 3.1 8B preset missing');
if (llama8) {
  assert(llama8.layers === 32, 'Llama 3.1 8B layer count drifted');
  assert(llama8.hidden_size === 4096, 'Llama 3.1 8B hidden size drifted');
  assert(llama8.attention_heads === 32, 'Llama 3.1 8B attention-head count drifted');
  assert(llama8.kv_heads === 8, 'Llama 3.1 8B KV-head count drifted');
  assert(llama8.max_context_tokens === 131072, 'Llama 3.1 8B context limit drifted from 128K/131072');
}
const sourceIds = new Set(data.sources.map((source) => source.id));
for (const required of ['meta-llama-model-skus', 'meta-llama-3-1-model-card', 'vllm-kv-cache']) {
  assert(sourceIds.has(required), `required KV-cache provenance source missing: ${required}`);
}
for (const source of data.sources) {
  assert(source.url?.startsWith('https://'), `source ${source.id} needs HTTPS provenance`);
  assert(/^2026-\d{2}-\d{2}$/.test(source.verified_on || ''), `source ${source.id} needs a verification date`);
}

if (failures.length) {
  console.error('KV cache/context explorer tests failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('KV cache/context explorer tests passed: payload math, GQA/MHA scaling, capacity inversion, boundaries, curve linearity and provenance verified.');
