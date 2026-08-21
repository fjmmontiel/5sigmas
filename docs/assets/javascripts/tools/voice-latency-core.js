(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5VoiceLatencyCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PRESETS = {
    cascade: {
      ingressMs: 60,
      endpointMs: 300,
      sttMs: 80,
      modelMs: 350,
      ttsMs: 120,
      egressMs: 70,
      bufferMs: 40,
      targetMs: 900,
      bargeDetectMs: 80,
      cancelMs: 30,
      clearMs: 60,
      bargeTargetMs: 250
    },
    halfCascade: {
      ingressMs: 60,
      endpointMs: 250,
      sttMs: 0,
      modelMs: 300,
      ttsMs: 120,
      egressMs: 70,
      bufferMs: 40,
      targetMs: 800,
      bargeDetectMs: 80,
      cancelMs: 30,
      clearMs: 60,
      bargeTargetMs: 250
    },
    speechToSpeech: {
      ingressMs: 60,
      endpointMs: 250,
      sttMs: 0,
      modelMs: 280,
      ttsMs: 0,
      egressMs: 70,
      bufferMs: 40,
      targetMs: 750,
      bargeDetectMs: 80,
      cancelMs: 30,
      clearMs: 60,
      bargeTargetMs: 250
    }
  };

  const RESPONSE_STAGE_KEYS = ['ingressMs', 'endpointMs', 'sttMs', 'modelMs', 'ttsMs', 'egressMs', 'bufferMs'];
  const BARGE_STAGE_KEYS = ['ingressMs', 'bargeDetectMs', 'cancelMs', 'clearMs'];

  function clampMs(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(10000, Math.max(0, Math.round(n)));
  }

  function preset(name) {
    const key = Object.prototype.hasOwnProperty.call(PRESETS, name) ? name : 'cascade';
    return { architecture: key, ...PRESETS[key] };
  }

  function normalize(input = {}) {
    const architecture = Object.prototype.hasOwnProperty.call(PRESETS, input.architecture) ? input.architecture : 'cascade';
    const base = PRESETS[architecture];
    const out = { architecture };
    for (const key of [...RESPONSE_STAGE_KEYS, 'targetMs', 'bargeDetectMs', 'cancelMs', 'clearMs', 'bargeTargetMs']) {
      out[key] = clampMs(input[key], base[key]);
    }
    return out;
  }

  function sumStages(input, keys) {
    return keys.reduce((sum, key) => sum + input[key], 0);
  }

  function largestStage(input, keys) {
    return keys.reduce((best, key) => {
      if (!best || input[key] > input[best]) return key;
      return best;
    }, null);
  }

  function stageShares(input, keys, total) {
    return Object.fromEntries(keys.map((key) => [key, total > 0 ? input[key] / total : 0]));
  }

  function evaluate(rawInput = {}) {
    const input = normalize(rawInput);
    const responseMs = sumStages(input, RESPONSE_STAGE_KEYS);
    const bargeInMs = sumStages(input, BARGE_STAGE_KEYS);
    const nonModelMs = responseMs - input.modelMs;
    const modelBudgetMs = Math.max(0, input.targetMs - nonModelMs);
    const responseHeadroomMs = input.targetMs - responseMs;
    const bargeHeadroomMs = input.bargeTargetMs - bargeInMs;

    return {
      input,
      responseMs,
      bargeInMs,
      responseHeadroomMs,
      bargeHeadroomMs,
      responseWithinTarget: responseHeadroomMs >= 0,
      bargeWithinTarget: bargeHeadroomMs >= 0,
      modelBudgetMs,
      targetFeasibleWithoutModel: nonModelMs <= input.targetMs,
      bottleneck: largestStage(input, RESPONSE_STAGE_KEYS),
      responseShares: stageShares(input, RESPONSE_STAGE_KEYS, responseMs),
      bargeShares: stageShares(input, BARGE_STAGE_KEYS, bargeInMs)
    };
  }

  return {
    PRESETS,
    RESPONSE_STAGE_KEYS,
    BARGE_STAGE_KEYS,
    clampMs,
    preset,
    normalize,
    sumStages,
    largestStage,
    stageShares,
    evaluate
  };
});
