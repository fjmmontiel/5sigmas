import assert from 'node:assert/strict';
import fs from 'node:fs';
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
close(base.capacity.expectedConcurrentSttSessionsAtPeak, 35);
close(base.capacity.expectedConcurrentTtsRequestsAtPeak, 1.75);
assert.equal(base.capacity.sttQuota.configured, false);

const quotaLimited = core.evaluate({ sttConcurrencyLimit: 30, ttsConcurrencyLimit: 2 });
assert.equal(quotaLimited.capacity.sttQuota.within, false);
close(quotaLimited.capacity.sttQuota.headroom, -5);
assert.equal(quotaLimited.capacity.ttsQuota.within, true);
close(quotaLimited.capacity.ttsQuota.headroom, 0.25);

const scale2x = core.evaluate({ callsPerMonth: 20000 });
close(scale2x.costs.total, base.costs.total * 2);
close(scale2x.costs.perCall, base.costs.perCall);
assert.equal(scale2x.usage.connectedMinutes, base.usage.connectedMinutes * 2);
// Peak-provider concurrency is a peak assumption and must not scale merely because monthly volume doubles.
close(scale2x.capacity.expectedConcurrentSttSessionsAtPeak, base.capacity.expectedConcurrentSttSessionsAtPeak);
close(scale2x.capacity.expectedConcurrentTtsRequestsAtPeak, base.capacity.expectedConcurrentTtsRequestsAtPeak);

const noTraffic = core.evaluate({ callsPerMonth: 0, peakConcurrency: 0 });
assert.equal(noTraffic.costs.total, 0);
assert.equal(noTraffic.costs.perCall, 0);
assert.equal(noTraffic.costs.perConnectedMinute, 0);
assert.equal(noTraffic.capacity.workersRequired, 0);
assert.equal(noTraffic.capacity.expectedConcurrentSttSessionsAtPeak, 0);
assert.equal(noTraffic.capacity.expectedConcurrentTtsRequestsAtPeak, 0);

const highPeak = core.evaluate({ peakConcurrency: 80, sessionsPerWorker: 50, targetWorkerUtilizationPercent: 70 });
assert.equal(highPeak.capacity.workersRequired, 3);
close(highPeak.capacity.targetUsableSessions, 105);
close(highPeak.capacity.targetCapacityHeadroom, 25);
close(highPeak.capacity.expectedConcurrentSttSessionsAtPeak, 80);
close(highPeak.capacity.expectedConcurrentTtsRequestsAtPeak, 4);

const customProviderOccupancy = core.evaluate({ peakConcurrency: 80, sttSessionsPerCall: 0.5, ttsGenerationDutyPercent: 12.5 });
close(customProviderOccupancy.capacity.expectedConcurrentSttSessionsAtPeak, 40);
close(customProviderOccupancy.capacity.expectedConcurrentTtsRequestsAtPeak, 10);

const overlap = core.evaluate({ userSpeechPercent: 70, agentSpeechPercent: 60 });
assert.equal(overlap.input.userSpeechPercent, 70);
assert.equal(overlap.input.agentSpeechPercent, 60);
assert.ok(overlap.usage.userAudioMinutes + overlap.usage.agentAudioMinutes > overlap.usage.connectedMinutes,
  'Independent billable audio directions may overlap during barge-in.');

const fullTrackStt = core.evaluate({ userSpeechPercent: 100 });
assert.equal(fullTrackStt.usage.userAudioMinutes, fullTrackStt.usage.connectedMinutes,
  '100% STT audio must represent a continuously streamed caller track.');

const bounded = core.evaluate({ userSpeechPercent: 200, agentSpeechPercent: -20, ttsGenerationDutyPercent: 150, targetWorkerUtilizationPercent: 0 });
assert.equal(bounded.input.userSpeechPercent, 100);
assert.equal(bounded.input.agentSpeechPercent, 0);
assert.equal(bounded.input.ttsGenerationDutyPercent, 100);
assert.equal(bounded.input.targetWorkerUtilizationPercent, 1);

const data = JSON.parse(fs.readFileSync(new URL('../docs/assets/data/tools/voice-cost-capacity-presets.json', import.meta.url), 'utf8'));
assert.equal(data.schema_version, 2);
const preset = data.presets[0];
assert.equal(preset.capacity.stt_sessions_per_call, 1);
assert.equal(preset.capacity.tts_generation_duty_percent, 5);
const urls = preset.sources.map((source) => source.url);
for (const required of [
  'https://www.twilio.com/en-us/voice/pricing/es',
  'https://www.twilio.com/docs/voice/media-streams',
  'https://developers.openai.com/api/docs/models/gpt-live-transcribe',
  'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
  'https://elevenlabs.io/pricing/api',
  'https://elevenlabs.io/docs/overview/models'
]) assert.ok(urls.includes(required), `missing provenance source ${required}`);
for (const source of preset.sources) assert.equal(source.verified_on, '2026-08-21');

console.log('voice cost/capacity tool: numerical, provider-concurrency and provenance gates passed');
