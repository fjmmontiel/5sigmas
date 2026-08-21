import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/voice-latency-core.js');

const cascade = core.evaluate(core.preset('cascade'));
assert.equal(cascade.responseMs, 1020);
assert.equal(cascade.bargeInMs, 230);
assert.equal(cascade.responseHeadroomMs, -120);
assert.equal(cascade.modelBudgetMs, 230);
assert.equal(cascade.bottleneck, 'modelMs');
assert.equal(cascade.responseWithinTarget, false);
assert.equal(cascade.bargeWithinTarget, true);

const halfCascade = core.evaluate(core.preset('halfCascade'));
assert.equal(halfCascade.responseMs, 840);
assert.equal(halfCascade.input.sttMs, 0);
assert.equal(halfCascade.input.ttsMs, 120);

const speechToSpeech = core.evaluate(core.preset('speechToSpeech'));
assert.equal(speechToSpeech.responseMs, 700);
assert.equal(speechToSpeech.input.sttMs, 0);
assert.equal(speechToSpeech.input.ttsMs, 0);

const clamped = core.evaluate({ architecture: 'cascade', ingressMs: -20, endpointMs: 'bad', modelMs: 20000 });
assert.equal(clamped.input.ingressMs, 0);
assert.equal(clamped.input.endpointMs, 300);
assert.equal(clamped.input.modelMs, 10000);

const impossible = core.evaluate({ ...core.preset('cascade'), targetMs: 500, modelMs: 0 });
assert.equal(impossible.targetFeasibleWithoutModel, false);
assert.equal(impossible.modelBudgetMs, 0);

const shares = Object.values(cascade.responseShares).reduce((sum, value) => sum + value, 0);
assert.ok(Math.abs(shares - 1) < 1e-12);

console.log('voice latency budget core: ok');
