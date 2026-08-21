(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.S5KvContext = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const GIB = 1024 ** 3;
  const MIB = 1024 ** 2;
  const nonNegative = (value) => Math.max(0, Number(value) || 0);
  const positive = (value, fallback = 1) => Math.max(Number.EPSILON, Number(value) || fallback);

  function normalize(raw = {}) {
    return {
      layers: positive(raw.layers, 1),
      hiddenSize: positive(raw.hiddenSize, 1),
      attentionHeads: positive(raw.attentionHeads, 1),
      kvHeads: positive(raw.kvHeads, raw.attentionHeads || 1),
      kvBits: positive(raw.kvBits, 16),
      contextTokens: nonNegative(raw.contextTokens),
      concurrentSequences: nonNegative(raw.concurrentSequences),
      kvBudgetGiB: nonNegative(raw.kvBudgetGiB)
    };
  }

  function architectureIssues(input) {
    const issues = [];
    if (!Number.isInteger(input.layers)) issues.push('layers_not_integer');
    if (!Number.isInteger(input.attentionHeads)) issues.push('attention_heads_not_integer');
    if (!Number.isInteger(input.kvHeads)) issues.push('kv_heads_not_integer');
    if (input.kvHeads > input.attentionHeads) issues.push('kv_heads_gt_attention_heads');
    if (Number.isInteger(input.attentionHeads) && Number.isInteger(input.kvHeads) && input.attentionHeads % input.kvHeads !== 0) {
      issues.push('attention_heads_not_divisible_by_kv_heads');
    }
    if (Number.isInteger(input.hiddenSize) && Number.isInteger(input.attentionHeads) && input.hiddenSize % input.attentionHeads !== 0) {
      issues.push('hidden_size_not_divisible_by_attention_heads');
    }
    return issues;
  }

  function calculate(raw = {}) {
    const input = normalize(raw);
    const issues = architectureIssues(input);
    const headDim = input.hiddenSize / input.attentionHeads;
    const kvBytesPerTokenPerSequence = input.layers * 2 * input.kvHeads * headDim * (input.kvBits / 8);
    const mhaBytesPerTokenPerSequence = input.layers * 2 * input.attentionHeads * headDim * (input.kvBits / 8);
    const kvBytes = kvBytesPerTokenPerSequence * input.contextTokens * input.concurrentSequences;
    const mhaBytes = mhaBytesPerTokenPerSequence * input.contextTokens * input.concurrentSequences;
    const budgetBytes = input.kvBudgetGiB * GIB;
    const utilization = budgetBytes > 0 ? kvBytes / budgetBytes : null;
    const fitsBudget = budgetBytes > 0 ? kvBytes <= budgetBytes : null;
    const maxContextTokens = kvBytesPerTokenPerSequence > 0 && input.concurrentSequences > 0 && budgetBytes > 0
      ? Math.floor(budgetBytes / (kvBytesPerTokenPerSequence * input.concurrentSequences))
      : null;
    const maxConcurrentSequences = kvBytesPerTokenPerSequence > 0 && input.contextTokens > 0 && budgetBytes > 0
      ? Math.floor(budgetBytes / (kvBytesPerTokenPerSequence * input.contextTokens))
      : null;
    const kvVsMhaRatio = mhaBytesPerTokenPerSequence > 0 ? kvBytesPerTokenPerSequence / mhaBytesPerTokenPerSequence : 1;

    return {
      version: VERSION,
      normalized: input,
      architecture: {
        valid: issues.length === 0,
        issues,
        headDim,
        kvVsMhaRatio,
        gqaGroupSize: input.kvHeads > 0 ? input.attentionHeads / input.kvHeads : null
      },
      perToken: {
        bytes: kvBytesPerTokenPerSequence,
        mib: kvBytesPerTokenPerSequence / MIB,
        mhaBytes: mhaBytesPerTokenPerSequence,
        mhaMib: mhaBytesPerTokenPerSequence / MIB
      },
      selected: {
        bytes: kvBytes,
        gib: kvBytes / GIB,
        mhaBytes,
        mhaGiB: mhaBytes / GIB,
        residentTokens: input.contextTokens * input.concurrentSequences
      },
      budget: {
        bytes: budgetBytes,
        gib: input.kvBudgetGiB,
        utilization,
        headroomGiB: budgetBytes > 0 ? (budgetBytes - kvBytes) / GIB : null,
        fits: fitsBudget,
        maxContextTokens,
        maxConcurrentSequences
      }
    };
  }

  function curve(raw = {}, contexts = []) {
    const base = normalize(raw);
    return contexts.map((contextTokens) => {
      const result = calculate({ ...base, contextTokens });
      return {
        contextTokens: Number(contextTokens),
        kvGiB: result.selected.gib,
        mhaGiB: result.selected.mhaGiB
      };
    });
  }

  return { VERSION, GIB, MIB, calculate, curve };
});
