import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/voice-cost-capacity-core.js');

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

const base = core.evaluate({});
assert.equal(base.usage.connectedMinutes, 40000);
assert.equal(base.usage.userAudioMinutes, 16800);
assert.equal(base.usage.agentAudioMinutes, 15200);
close(base.costs.telephony, 712);
close(base.costs.media, 176);
close(base.costs.stt, 285.6);
close(base.costs.tts, 760);
close(base.costs.llmInput, 2.8);
close(base.costs.llmOutput, 2.64);
close(base.costs.total, 1939.04);
close(base.costs.perCall, 0.193904);
close(base.costs.perConnectedMinute, 0.048476);
close(base.capacity.averageConcurrency, 40000 / (220 * 60));
assert.equal(base.capacity.workersRequired, 1);
close(base.capacity.expectedActiveSttStreamsAtPeak, 14.7);
close(base.capacity.expectedActiveTtsStreamsAtPeak, 13.3);
assert.equal(base.capacity.sttQuota.configured, false);

const quotaLimited = core.evaluate({ sttConcurrencyLimit: 10, ttsConcurrencyLimit: 20 });
assert.equal(quotaLimited.capacity.sttQuota.within, false);
close(quotaLimited.capacity.sttQuota.headroom, -4.7);
assert.equal(quotaLimited.capacity.ttsQuota.within, true);
close(quotaLimited.capacity.ttsQuota.headroom, 6.7);

const scale2x = core.evaluate({ callsPerMonth: 20000 });
close(scale2x.costs.total, base.costs.total * 2);
close(scale2x.costs.perCall, base.costs.perCall);
assert.equal(scale2x.usage.connectedMinutes, base.usage.connectedMinutes * 2);

const noTraffic = core.evaluate({ callsPerMonth: 0, peakConcurrency: 0 });
assert.equal(noTraffic.costs.total, 0);
assert.equal(noTraffic.costs.perCall, 0);
assert.equal(noTraffic.costs.perConnectedMinute, 0);
assert.equal(noTraffic.capacity.workersRequired, 0);

const highPeak = core.evaluate({ peakConcurrency: 80, sessionsPerWorker: 50, targetWorkerUtilizationPercent: 70 });
assert.equal(highPeak.capacity.workersRequired, 3);
close(highPeak.capacity.targetUsableSessions, 105);
close(highPeak.capacity.targetCapacityHeadroom, 25);

const overlap = core.evaluate({ userSpeechPercent: 70, agentSpeechPercent: 60 });
assert.equal(overlap.input.userSpeechPercent, 70);
assert.equal(overlap.input.agentSpeechPercent, 60);
assert.ok(overlap.usage.userAudioMinutes + overlap.usage.agentAudioMinutes > overlap.usage.connectedMinutes,
  'Overlapping speech minutes are allowed because each media direction may be billed independently.');

const bounded = core.evaluate({ userSpeechPercent: 200, agentSpeechPercent: -20, targetWorkerUtilizationPercent: 0 });
assert.equal(bounded.input.userSpeechPercent, 100);
assert.equal(bounded.input.agentSpeechPercent, 0);
assert.equal(bounded.input.targetWorkerUtilizationPercent, 1);

console.log('voice cost/capacity tool: numerical gates passed');
