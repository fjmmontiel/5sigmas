(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5VoiceCostCapacityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max, fallback = min) {
    return Math.min(max, Math.max(min, finite(value, fallback)));
  }

  function nonNegative(value, fallback = 0) {
    return Math.max(0, finite(value, fallback));
  }

  function percent(value, fallback = 0) {
    return clamp(value, 0, 100, fallback);
  }

  function normalize(raw = {}) {
    return {
      callsPerMonth: Math.round(nonNegative(raw.callsPerMonth, 10000)),
      averageCallMinutes: nonNegative(raw.averageCallMinutes, 4),
      userSpeechPercent: percent(raw.userSpeechPercent, 42),
      agentSpeechPercent: percent(raw.agentSpeechPercent, 38),
      serviceHoursPerMonth: nonNegative(raw.serviceHoursPerMonth, 220),
      peakConcurrency: nonNegative(raw.peakConcurrency, 35),
      targetWorkerUtilizationPercent: clamp(raw.targetWorkerUtilizationPercent, 1, 100, 70),
      sessionsPerWorker: Math.max(1, Math.round(nonNegative(raw.sessionsPerWorker, 50))),
      sttConcurrencyLimit: Math.round(nonNegative(raw.sttConcurrencyLimit, 0)),
      ttsConcurrencyLimit: Math.round(nonNegative(raw.ttsConcurrencyLimit, 0)),
      telephonyUsdPerConnectedMinute: nonNegative(raw.telephonyUsdPerConnectedMinute, 0.0178),
      mediaStreamUsdPerConnectedMinute: nonNegative(raw.mediaStreamUsdPerConnectedMinute, 0.0044),
      sttUsdPerUserAudioMinute: nonNegative(raw.sttUsdPerUserAudioMinute, 0.017),
      ttsUsdPer1000Characters: nonNegative(raw.ttsUsdPer1000Characters, 0.05),
      charactersPerAgentMinute: nonNegative(raw.charactersPerAgentMinute, 1000),
      llmInputTokensPerCall: nonNegative(raw.llmInputTokensPerCall, 1400),
      llmOutputTokensPerCall: nonNegative(raw.llmOutputTokensPerCall, 220),
      llmInputUsdPerMillionTokens: nonNegative(raw.llmInputUsdPerMillionTokens, 0.2),
      llmOutputUsdPerMillionTokens: nonNegative(raw.llmOutputUsdPerMillionTokens, 1.2),
      fixedUsdPerCall: nonNegative(raw.fixedUsdPerCall, 0)
    };
  }

  function quota(limit, expected) {
    if (!(limit > 0)) return { configured: false, limit: 0, expected, headroom: null, within: null };
    const headroom = limit - expected;
    return { configured: true, limit, expected, headroom, within: headroom >= 0 };
  }

  function evaluate(raw = {}) {
    const input = normalize(raw);
    const connectedMinutes = input.callsPerMonth * input.averageCallMinutes;
    const userAudioMinutes = connectedMinutes * input.userSpeechPercent / 100;
    const agentAudioMinutes = connectedMinutes * input.agentSpeechPercent / 100;
    const ttsCharacters = agentAudioMinutes * input.charactersPerAgentMinute;
    const llmInputTokens = input.callsPerMonth * input.llmInputTokensPerCall;
    const llmOutputTokens = input.callsPerMonth * input.llmOutputTokensPerCall;

    const telephonyCost = connectedMinutes * input.telephonyUsdPerConnectedMinute;
    const mediaCost = connectedMinutes * input.mediaStreamUsdPerConnectedMinute;
    const sttCost = userAudioMinutes * input.sttUsdPerUserAudioMinute;
    const ttsCost = ttsCharacters / 1000 * input.ttsUsdPer1000Characters;
    const llmInputCost = llmInputTokens / 1e6 * input.llmInputUsdPerMillionTokens;
    const llmOutputCost = llmOutputTokens / 1e6 * input.llmOutputUsdPerMillionTokens;
    const fixedCost = input.callsPerMonth * input.fixedUsdPerCall;
    const llmCost = llmInputCost + llmOutputCost;
    const totalCost = telephonyCost + mediaCost + sttCost + ttsCost + llmCost + fixedCost;

    const serviceMinutes = input.serviceHoursPerMonth * 60;
    const averageConcurrency = serviceMinutes > 0 ? connectedMinutes / serviceMinutes : 0;
    const peakToAverage = averageConcurrency > 0 ? input.peakConcurrency / averageConcurrency : 0;
    const targetWorkerUtilization = input.targetWorkerUtilizationPercent / 100;
    const targetSessionsPerWorker = input.sessionsPerWorker * targetWorkerUtilization;
    const workersRequired = input.peakConcurrency > 0
      ? Math.ceil(input.peakConcurrency / Math.max(targetSessionsPerWorker, 1e-9))
      : 0;
    const provisionedSessions = workersRequired * input.sessionsPerWorker;
    const targetUsableSessions = provisionedSessions * targetWorkerUtilization;
    const targetCapacityHeadroom = targetUsableSessions - input.peakConcurrency;
    const expectedActiveSttStreamsAtPeak = input.peakConcurrency * input.userSpeechPercent / 100;
    const expectedActiveTtsStreamsAtPeak = input.peakConcurrency * input.agentSpeechPercent / 100;

    const breakdown = {
      telephony: telephonyCost,
      media: mediaCost,
      stt: sttCost,
      tts: ttsCost,
      llm: llmCost,
      fixed: fixedCost
    };
    const shares = Object.fromEntries(Object.entries(breakdown).map(([key, value]) => [key, totalCost > 0 ? value / totalCost : 0]));

    return {
      input,
      usage: {
        connectedMinutes,
        userAudioMinutes,
        agentAudioMinutes,
        ttsCharacters,
        llmInputTokens,
        llmOutputTokens
      },
      costs: {
        ...breakdown,
        llmInput: llmInputCost,
        llmOutput: llmOutputCost,
        total: totalCost,
        perCall: input.callsPerMonth > 0 ? totalCost / input.callsPerMonth : 0,
        perConnectedMinute: connectedMinutes > 0 ? totalCost / connectedMinutes : 0,
        shares
      },
      capacity: {
        averageConcurrency,
        peakConcurrency: input.peakConcurrency,
        peakToAverage,
        targetWorkerUtilization,
        targetSessionsPerWorker,
        workersRequired,
        provisionedSessions,
        targetUsableSessions,
        targetCapacityHeadroom,
        expectedActiveSttStreamsAtPeak,
        expectedActiveTtsStreamsAtPeak,
        sttQuota: quota(input.sttConcurrencyLimit, expectedActiveSttStreamsAtPeak),
        ttsQuota: quota(input.ttsConcurrencyLimit, expectedActiveTtsStreamsAtPeak)
      }
    };
  }

  return { finite, clamp, nonNegative, percent, normalize, quota, evaluate };
});
