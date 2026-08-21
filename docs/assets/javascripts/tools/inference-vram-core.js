(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.S5InferenceVram = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const GIB = 1024 ** 3;
  const MIB = 1024 ** 2;
  const nonNegative = (value) => Math.max(0, Number(value) || 0);
  const positive = (value, fallback = 1) => Math.max(Number.EPSILON, Number(value) || fallback);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

  function calculate(raw = {}) {
    const parametersB = nonNegative(raw.parametersB);
    const weightBits = positive(raw.weightBits, 16);
    const weightMetadataPct = clamp(raw.weightMetadataPct, 0, 100);
    const layers = positive(raw.layers, 1);
    const hiddenSize = positive(raw.hiddenSize, 1);
    const attentionHeads = positive(raw.attentionHeads, 1);
    const kvHeads = positive(raw.kvHeads, attentionHeads);
    const contextTokens = nonNegative(raw.contextTokens);
    const concurrentSequences = nonNegative(raw.concurrentSequences);
    const kvBits = positive(raw.kvBits, 16);
    const runtimeOverheadPct = clamp(raw.runtimeOverheadPct, 0, 200);
    const devices = positive(raw.devices, 1);
    const gpuVramGiB = nonNegative(raw.gpuVramGiB);

    const architectureIssues = [];
    if (!Number.isInteger(layers)) architectureIssues.push('layers_not_integer');
    if (!Number.isInteger(attentionHeads)) architectureIssues.push('attention_heads_not_integer');
    if (!Number.isInteger(kvHeads)) architectureIssues.push('kv_heads_not_integer');
    if (kvHeads > attentionHeads) architectureIssues.push('kv_heads_gt_attention_heads');
    if (Number.isInteger(attentionHeads) && Number.isInteger(kvHeads) && attentionHeads % kvHeads !== 0) {
      architectureIssues.push('attention_heads_not_divisible_by_kv_heads');
    }
    if (Number.isInteger(hiddenSize) && Number.isInteger(attentionHeads) && hiddenSize % attentionHeads !== 0) {
      architectureIssues.push('hidden_size_not_divisible_by_attention_heads');
    }

    const headDim = hiddenSize / attentionHeads;
    const rawWeightBytes = parametersB * 1_000_000_000 * (weightBits / 8);
    const weightMetadataBytes = rawWeightBytes * (weightMetadataPct / 100);
    const weightBytes = rawWeightBytes + weightMetadataBytes;

    // Standard decoder-only attention approximation: one K and one V vector per KV head,
    // per layer, token and sequence. Architectures with MLA, hybrid/sliding-window attention,
    // recurrent state or backend-specific cache layouts need a different model.
    const kvBytesPerTokenPerSequence = layers * 2 * kvHeads * headDim * (kvBits / 8);
    const kvBytes = kvBytesPerTokenPerSequence * contextTokens * concurrentSequences;

    const modeledBaseBytes = weightBytes + kvBytes;
    const runtimeOverheadBytes = modeledBaseBytes * (runtimeOverheadPct / 100);
    const totalBytes = modeledBaseBytes + runtimeOverheadBytes;

    const clusterCapacityBytes = devices * gpuVramGiB * GIB;
    const perDeviceBytes = totalBytes / devices;
    const headroomBytes = clusterCapacityBytes - totalBytes;
    const fits = gpuVramGiB > 0 ? totalBytes <= clusterCapacityBytes : null;

    // Solve the same memory model backwards. This assumes ideal, even sharding of both model
    // weights and KV cache across the configured devices.
    const overheadFactor = 1 + runtimeOverheadPct / 100;
    const preOverheadCapacityBytes = overheadFactor > 0 ? clusterCapacityBytes / overheadFactor : clusterCapacityBytes;
    const bytesAvailableForKv = Math.max(0, preOverheadCapacityBytes - weightBytes);
    const maxContextTokens = kvBytesPerTokenPerSequence > 0 && concurrentSequences > 0
      ? Math.floor(bytesAvailableForKv / (kvBytesPerTokenPerSequence * concurrentSequences))
      : null;
    const maxConcurrentSequences = kvBytesPerTokenPerSequence > 0 && contextTokens > 0
      ? Math.floor(bytesAvailableForKv / (kvBytesPerTokenPerSequence * contextTokens))
      : null;

    const mhaKvBytesPerTokenPerSequence = layers * 2 * attentionHeads * headDim * (kvBits / 8);
    const kvVsMhaRatio = mhaKvBytesPerTokenPerSequence > 0
      ? kvBytesPerTokenPerSequence / mhaKvBytesPerTokenPerSequence
      : 1;

    return {
      version: VERSION,
      normalized: {
        parametersB,
        weightBits,
        weightMetadataPct,
        layers,
        hiddenSize,
        attentionHeads,
        kvHeads,
        contextTokens,
        concurrentSequences,
        kvBits,
        runtimeOverheadPct,
        devices,
        gpuVramGiB
      },
      architecture: {
        valid: architectureIssues.length === 0,
        issues: architectureIssues,
        headDim,
        kvVsMhaRatio,
        gqaGroupSize: kvHeads > 0 ? attentionHeads / kvHeads : null
      },
      weights: {
        rawBytes: rawWeightBytes,
        metadataBytes: weightMetadataBytes,
        totalBytes: weightBytes,
        rawGiB: rawWeightBytes / GIB,
        metadataGiB: weightMetadataBytes / GIB,
        totalGiB: weightBytes / GIB
      },
      kv: {
        bytesPerTokenPerSequence: kvBytesPerTokenPerSequence,
        mibPerTokenPerSequence: kvBytesPerTokenPerSequence / MIB,
        totalBytes: kvBytes,
        totalGiB: kvBytes / GIB
      },
      runtime: {
        overheadBytes: runtimeOverheadBytes,
        overheadGiB: runtimeOverheadBytes / GIB
      },
      memory: {
        modeledBaseBytes,
        modeledBaseGiB: modeledBaseBytes / GIB,
        totalBytes,
        totalGiB: totalBytes / GIB,
        perDeviceGiB: perDeviceBytes / GIB,
        clusterCapacityGiB: clusterCapacityBytes / GIB,
        headroomGiB: headroomBytes / GIB,
        headroomPct: clusterCapacityBytes > 0 ? (headroomBytes / clusterCapacityBytes) * 100 : null,
        fits
      },
      capacity: {
        maxContextTokens,
        maxConcurrentSequences,
        bytesAvailableForKv,
        preOverheadCapacityGiB: preOverheadCapacityBytes / GIB
      }
    };
  }

  return { VERSION, GIB, MIB, calculate };
});
