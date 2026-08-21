import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/agent-reliability-core.js');

const reference = core.evaluate(core.DEFAULTS);
assert.equal(reference.counts.finalSuccesses, 172, 'final successes should combine first-pass and recovered tasks');
assert.equal(reference.counts.finalFailures, 28);
assert.equal(reference.counts.missedToolDecisions, 15, 'expected decisions must partition into correct/wrong/missed');
assert.ok(Math.abs(reference.metrics.finalSuccessRate - 0.86) < 1e-12);
assert.ok(Math.abs(reference.metrics.firstPassSuccessRate - 0.74) < 1e-12);
assert.ok(Math.abs(reference.metrics.retryRecoveryRate - (24 / 42)) < 1e-12);
assert.ok(Math.abs(reference.metrics.toolDecisionAccuracy - (487 / 520)) < 1e-12);
assert.ok(reference.intervals.finalSuccess.low < reference.metrics.finalSuccessRate);
assert.ok(reference.intervals.finalSuccess.high > reference.metrics.finalSuccessRate);
assert.equal(reference.gateSummary.total, 6);
assert.equal(reference.gateSummary.passed, 4);
assert.equal(reference.gateSummary.allPass, false);
assert.ok(reference.projection.failureLow95 <= reference.projection.expectedFinalFailures);
assert.ok(reference.projection.failureHigh95 >= reference.projection.expectedFinalFailures);

const clean = core.evaluate({ ...core.DEFAULTS, correctToolDecisions: 510, wrongToolDecisions: 5, policyViolationTasks: 1, unnecessarySteps: 120 });
assert.equal(clean.gateSummary.allPass, true, 'all gates should pass when every threshold is met');

const zero = core.evaluate({ tasks: 0, expectedToolDecisions: 0, totalAgentSteps: 0, monthlyTasks: 0 });
assert.equal(zero.metrics.finalSuccessRate, 0);
assert.equal(zero.metrics.retryRecoveryRate, 0);
assert.equal(zero.metrics.toolDecisionAccuracy, 0);
assert.equal(zero.projection.expectedFinalFailures, 0);

const clamped = core.normalize({ tasks: 10, firstPassSuccesses: 9, retryingTasks: 8, retryRecoveredTasks: 8, totalRetryAttempts: 0, expectedToolDecisions: 2, correctToolDecisions: 4, wrongToolDecisions: 3, totalAgentSteps: 2, unnecessarySteps: 9, timeoutTasks: 99, policyViolationTasks: -3 });
assert.equal(clamped.retryingTasks, 1);
assert.equal(clamped.retryRecoveredTasks, 1);
assert.equal(clamped.totalRetryAttempts, 1);
assert.equal(clamped.correctToolDecisions, 2);
assert.equal(clamped.wrongToolDecisions, 0);
assert.equal(clamped.unnecessarySteps, 2);
assert.equal(clamped.timeoutTasks, 10);
assert.equal(clamped.policyViolationTasks, 0);

const narrow = core.wilson(860, 1000);
const wide = core.wilson(86, 100);
assert.ok((narrow.high - narrow.low) < (wide.high - wide.low), 'larger samples should produce narrower Wilson intervals at the same rate');

console.log('Agent reliability tool math: OK');
