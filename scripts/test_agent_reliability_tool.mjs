import assert from 'node:assert/strict';
import fs from 'node:fs';
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

const knowledgeRuntime = fs.readFileSync(new URL('../docs/assets/javascripts/agent-knowledge-webmcp.js', import.meta.url), 'utf8');
const legacyRuntime = fs.readFileSync(new URL('../docs/assets/javascripts/agent-webmcp.js', import.meta.url), 'utf8');
const knowledgeHook = fs.readFileSync(new URL('../hooks/agent_knowledge.py', import.meta.url), 'utf8');
const globalLoader = fs.readFileSync(new URL('../docs/javascripts/external-links.js', import.meta.url), 'utf8');
for (const toolName of [
  '5sigmas_search_knowledge',
  '5sigmas_get_knowledge_item',
  '5sigmas_get_topic_bundle',
  '5sigmas_search_visuals',
  '5sigmas_get_evidence',
  '5sigmas_knowledge_stats'
]) {
  assert.ok(knowledgeRuntime.includes(toolName), `full knowledge runtime must expose ${toolName}`);
}
assert.ok(knowledgeRuntime.includes('document.modelContext'), 'knowledge runtime must use the current document.modelContext API');
assert.ok(knowledgeRuntime.includes('readOnlyHint'), 'knowledge retrieval tools must be marked read-only');
assert.ok(knowledgeRuntime.includes('/en/agent/knowledge.json') && knowledgeRuntime.includes('/agent/knowledge.json'), 'runtime must address both locale graphs');
for (const marker of ['animation', 'video', 'evidence', 'visual', 'markdown_url', 'related_item_ids']) {
  assert.ok(knowledgeHook.includes(marker), `knowledge graph generator must index ${marker}`);
}

for (const runtime of [knowledgeRuntime, legacyRuntime]) {
  assert.ok(runtime.includes('FORBIDDEN_AGENT_HOST_SUFFIXES'), 'every WebMCP runtime must enforce repository-host exclusion');
  assert.ok(runtime.includes('githubusercontent.com'), 'repository-host exclusion must include GitHub content hosts');
  assert.ok(runtime.includes('PRIVATE_AGENT_KEYS'), 'every WebMCP runtime must remove implementation metadata keys');
}
assert.ok(knowledgeHook.includes('_is_forbidden_agent_url'), 'knowledge graph generator must exclude repository hosts before publication');
assert.ok(knowledgeHook.includes('Repository implementation details are deliberately outside this public contract'), 'knowledge generator must document the public/repository boundary');
assert.ok(!knowledgeHook.includes('"source_path":'), 'public graph generator must not serialize repository source paths');
assert.ok(globalLoader.includes('agent-knowledge-webmcp.js'), 'site-wide loader must load the knowledge WebMCP runtime');

console.log('Agent reliability math + full knowledge WebMCP source contract: OK; repository exposure disabled');