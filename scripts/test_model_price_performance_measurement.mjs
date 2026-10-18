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
assert.match(controller, /addEventListener\('input', \(\) => render\(\)\)/);
assert.match(controller, /addEventListener\('change', \(\) => render\(\{ trackCompletion: true \}\)\)/);
assert.match(controller, /emitScenarioMeasurement\(state, rows, \{ trackCompletion \}\)/);

const begin = controller.indexOf('  function emitScenarioMeasurement(state, rows, { trackCompletion = false } = {}) {');
const finish = controller.indexOf('\n  function scenarioUrl()', begin);
assert.ok(begin > 0 && finish > begin, 'measurement code is missing from real controller');
const helper = controller.slice(begin, finish);
const events = [];
let consentGranted = true;
const testFields = { inputTokens: { validity: { valid: true } } };
const context = {
  testFields,
  window: { s5Measurement: { track(name, context) {
    if (!consentGranted) return false;
    events.push({ name, context });
    return true;
  } } },
};
vm.runInNewContext([
  'let lastMeasuredScenario = null;',
  'let lastCompletedScenario = null;',
  'const fields = globalThis.testFields;',
  helper,
  'globalThis.subject = {',
  '  render: (state, rows, options) => emitScenarioMeasurement(state, rows, options),',
  '};',
].join('\n'), context);

const first = { inputTokens: 4000, outputTokens: 500, provider: 'all' };
context.subject.render(first, []); // no valid comparison -> no result
assert.equal(events.length, 0);
context.subject.render(first, [{ model: 'test' }]); // initial/default render
context.subject.render(first, [{ model: 'test' }]);
assert.equal(events.length, 0, 'landing on a default result is not a conversion');

const changed = { ...first, inputTokens: 6000 };
context.subject.render(changed, [{ model: 'test' }]); // typing
assert.equal(events.length, 0, 'keystrokes must not emit completion or result events');
context.subject.render(changed, [{ model: 'test' }], { trackCompletion: true }); // change/blur
context.subject.render(changed, [{ model: 'test' }], { trackCompletion: true });
assert.deepEqual(events.map(e => e.name),
  ['result_rendered', 'scenario_completed']);
context.subject.render({ ...changed, provider: 'nobody' }, [], { trackCompletion: true }); // empty
assert.equal(events.length, 2, 'empty results cannot count as a completed scenario');
const next = { ...changed, provider: 'OpenAI' };
context.subject.render(next, [{ model: 'test' }]);
assert.equal(events.length, 2, 'only final changed value may count');
testFields.inputTokens.validity.valid = false;
context.subject.render(next, [{ model: 'test' }], { trackCompletion: true });
assert.equal(events.length, 2, 'invalid native form fields cannot count as completion even if a clamped result renders');
testFields.inputTokens.validity.valid = true;
context.subject.render(next, [{ model: 'test' }], { trackCompletion: true });
assert.equal(events.length, 4);
// A reset displays defaults; neither conversion-related event may be emitted.
context.subject.render(first, [{ model: 'test' }]);
assert.equal(events.length, 4, 'reset/default rendering cannot count as useful conversion');
assert.equal(events.filter(e => e.name === 'scenario_completed').length, 2);

// An event declined by the consent-gated runtime is not buffered or marked as
// transmitted. Only a fresh, explicit interaction after consent may emit it.
const later = { ...next, inputTokens: 8000 };
consentGranted = false;
context.subject.render(later, [{ model: 'test' }], { trackCompletion: true });
assert.equal(events.length, 4);
consentGranted = true;
context.subject.render(later, [{ model: 'test' }]);
assert.equal(events.length, 4, 'consent does not replay past conversions');
context.subject.render(later, [{ model: 'test' }], { trackCompletion: true });
assert.equal(events.length, 6, 'a fresh valid completion is measured after consent');

for (const event of events) {
  assert.deepEqual(JSON.parse(JSON.stringify(event.context)), {
    tool_id: 'model-price-performance', result_kind: 'comparison',
  }, 'event payload must exclude inputs, values, query strings and model identities');
}
console.log('Model explorer post-click instrumentation: PASS');
