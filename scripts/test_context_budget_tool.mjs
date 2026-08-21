import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/context-budget-core.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function close(actual, expected, tolerance = 1e-9) {
  return Math.abs(actual - expected) <= tolerance;
}

const base = core.calculate({});
assert(base.context.limit === 128000, 'default context limit must be 128k');
assert(base.input.used === 53500, `default used input mismatch: ${base.input.used}`);
assert(base.reserve.output === 8000, 'default output reserve mismatch');
assert(base.reserve.safety === 4096, 'default safety reserve mismatch');
assert(base.input.available === 115904, `available input mismatch: ${base.input.available}`);
assert(base.input.remaining === 62404, `remaining input mismatch: ${base.input.remaining}`);
assert(base.context.planned === 65596, `planned context mismatch: ${base.context.planned}`);
assert(base.context.fits === true, 'default scenario should fit');
assert(base.context.overflowTokens === 0, 'default scenario should not overflow');
assert(base.growth.turnsUntilPressure === 34, `turn estimate mismatch: ${base.growth.turnsUntilPressure}`);
assert(close(base.context.utilization, 65596 / 128000), 'context utilization mismatch');

const overflow = core.calculate({ contextLimit: 32000 });
assert(overflow.input.available === 19904, '32k available-input budget mismatch');
assert(overflow.context.fits === false, '32k scenario should overflow');
assert(overflow.context.overflowTokens === 33596, `32k overflow mismatch: ${overflow.context.overflowTokens}`);
assert(overflow.growth.turnsUntilPressure === 0, 'overflow scenario should report zero remaining turns');

const reserveConflict = core.calculate({ contextLimit: 8000, reservedOutput: 8000, safetyTokens: 1000, systemTokens: 0, toolTokens: 0, historyTokens: 0, ragTokens: 0, userTokens: 0 });
assert(reserveConflict.input.available === 0, 'reserve conflict should leave zero input capacity');
assert(reserveConflict.context.fits === false, 'output+safety above limit must not fit');
assert(reserveConflict.context.overflowTokens === 1000, 'reserve-only overflow mismatch');

const noGrowth = core.calculate({ historyGrowthPerTurn: 0 });
assert(noGrowth.growth.turnsUntilPressure === null, 'zero configured growth should produce no finite turn estimate');

const normalized = core.normalize({ contextLimit: -2, reservedOutput: -10, historyTokens: 12.6 });
assert(normalized.contextLimit === 1, 'context limit must clamp to at least one token');
assert(normalized.reservedOutput === 0, 'negative reserve must clamp to zero');
assert(normalized.historyTokens === 13, 'token counts should normalize to integer tokens');

const ranked = core.calculate({ systemTokens: 1, toolTokens: 2, historyTokens: 3, ragTokens: 9, userTokens: 4 }).rankedComponents;
assert(ranked[0].key === 'ragTokens' && ranked[0].tokens === 9, 'largest component ranking is wrong');

const summary = core.scenarioSummary({ contextLimit: 100000, ragTokens: 10000 });
assert(summary.contextLimit === 100000, 'scenario summary must preserve configured limit');
assert(summary.components.ragTokens === 10000, 'scenario summary must preserve component values');

const es = fs.readFileSync(new URL('../docs/herramientas/presupuesto-contexto.md', import.meta.url), 'utf8');
const en = fs.readFileSync(new URL('../locales/en/tools/context-budget.md', import.meta.url), 'utf8');
for (const [name, page] of [['ES', es], ['EN', en]]) {
  assert(page.includes('"@type": "WebApplication"'), `${name} page lacks WebApplication JSON-LD`);
  assert(page.includes('https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them'), `${name} page lacks primary token-limit source`);
  assert(page.includes('https://developers.openai.com/api/reference/cli/resources/responses/methods/create'), `${name} page lacks Responses API source`);
  assert(page.includes('context-budget-core.js') && page.includes('context-budget.js'), `${name} page lacks planner scripts`);
}

console.log('Context budget planner math/provenance: OK');
