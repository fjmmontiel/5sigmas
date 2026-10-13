#!/usr/bin/env node
/**
 * Contract and executable event test for the real model explorer's post-click
 * integration. No production collector, network traffic or user data required.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const controller = fs.readFileSync('docs/assets/javascripts/tools/model-price-performance.js', 'utf8');
const english = fs.readFileSync('locales/en/tools/model-price-performance.md', 'utf8');
const spanish = fs.readFileSync('docs/herramientas/precio-rendimiento-modelos.md', 'utf8');
const runtime = fs.readFileSync('docs/assets/javascripts/measurement.js', 'utf8');

for (const [locale, html] of [['en', english], ['es', spanish]]) {
  assert.match(html, new RegExp('data-s5-model-explorer data-s5-tool="model-price-performance" data-locale="' + locale + '"'));
  assert.equal((html.match(/data-s5-tool="model-price-performance"/g) || []).length, 1, locale + ': exactly one tool root');
  assert.match(html, /<section class="s5-section" data-s5-source aria-labelledby="s5-model-sources-title">/);
  assert.match(html, /<section class="s5-section" data-s5-related-content aria-labelledby="s5-model-related">/);
  assert.match(html, /data-field="inputTokens"/);
  assert.match(html, /data-field="provider"/);
}
assert.match(controller, /s5-model-focus__sources" data-s5-source/, 'focused source links must have semantic event coverage');
assert.match(runtime, /'\bresult_rendered\b'/);
assert.match(runtime, /'\bscenario_completed\b'/);
assert.match(runtime, /'\btool_open\b'/);
assert.match(runtime, /'\bmeaningful_input_change\b'/);
assert.match(runtime, /'\bsource_click\b'/);
assert.match(runtime, /'\brelated_content_click\b'/);
assert.match(controller, /addEventListener\('input', onScenarioEdited\)/);
assert.match(controller, /addEventListener\('change', onScenarioEdited\)/);
assert.match(controller, /emitScenarioMeasurement\(state, rows\)/);

const begin = controller.indexOf('  function emitScenarioMeasurement(state, rows) {');
const finish = controller.indexOf('\n  function scenarioUrl()', begin);
assert.ok(begin > 0 && finish > begin, 'measurement code is missing from real controller');
const helper = controller.slice(begin, finish);
const events = [];
const context = {
  window: { s5Measurement: { track(name, context) { events.push({ name, context }); } } },
};
vm.runInNewContext([
  'let lastMeasuredScenario = null;',
  'let userEditedScenario = false;',
  helper,
  'globalThis.subject = {',
  '  render: (state, rows) => emitScenarioMeasurement(state, rows),',
  '  markEdited: () => { userEditedScenario = true; }',
  '};',
].join('\n'), context);

const first = { inputTokens: 4000, outputTokens: 500, provider: 'all' };
context.subject.render(first, []); // no valid comparison -> no result
assert.equal(events.length, 0);
context.subject.render(first, [{ model: 'test' }]);
context.subject.render(first, [{ model: 'test' }]); // same scenario -> deduplicated
assert.deepEqual(events.map(e => e.name), ['result_rendered']);

context.subject.markEdited();
const changed = { ...first, inputTokens: 6000 };
context.subject.render(changed, [{ model: 'test' }]);
context.subject.render(changed, [{ model: 'test' }]); // input + change -> once
assert.deepEqual(events.map(e => e.name),
  ['result_rendered', 'result_rendered', 'scenario_completed']);
context.subject.render({ ...changed, provider: 'nobody' }, []); // empty model selection
assert.equal(events.length, 3, 'empty results cannot count as a completed scenario');
context.subject.render({ ...changed, provider: 'OpenAI' }, [{ model: 'test' }]);
assert.equal(events.length, 5);

for (const event of events) {
  assert.deepEqual(JSON.parse(JSON.stringify(event.context)), {
    tool_id: 'model-price-performance', result_kind: 'comparison',
  }, 'event payload must exclude inputs, values, query strings and model identities');
}
console.log('Model explorer post-click instrumentation: PASS');
