import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const assert = require('assert');
const core = require('../docs/assets/javascripts/tools/prompt-injection-core.js');
const worst = core.evaluate({ preset: 'privileged-agent' });
assert.equal(worst.summary.reachablePaths, 5);
assert.equal(worst.summary.highImpactPaths, 4);
assert.equal(worst.summary.posture, 'actionable-impact');
const quarantine = core.evaluate({ preset: 'web-agent', quarantineReader: true });
assert.equal(quarantine.summary.reachablePaths, 0);
assert.equal(quarantine.summary.privilegedInfluence, false);
const direct = core.evaluate({ preset: 'web-agent', vector: 'direct', quarantineReader: true, actionIntentValidation: false, humanApproval: false });
assert.equal(direct.summary.privilegedInfluence, true);
assert.equal(direct.paths.find((p) => p.id === 'unauthorized-action').reachable, true);
const leastPrivilegeOnly = core.evaluate({ preset: 'privileged-agent', leastPrivilege: true });
assert.equal(leastPrivilegeOnly.paths.find((p) => p.id === 'unauthorized-action').reachable, true, 'least privilege limits impact but is not a complete action boundary');
const approved = core.evaluate({ preset: 'privileged-agent', humanApproval: true });
assert.equal(approved.paths.find((p) => p.id === 'unauthorized-action').reachable, false);
const egressBlocked = core.evaluate({ preset: 'privileged-agent', egressRestriction: true });
assert.equal(egressBlocked.paths.find((p) => p.id === 'data-exfiltration').reachable, false);
const memoryBlocked = core.evaluate({ preset: 'privileged-agent', memoryWriteValidation: true });
assert.equal(memoryBlocked.paths.find((p) => p.id === 'persistent-poisoning').reachable, false);
const independentControls = core.evaluate({
  preset: 'privileged-agent',
  toolsEnabled: false,
  writeTools: true,
  externalEgress: false,
  egressRestriction: false,
  persistentMemory: false,
  memoryWriteValidation: false
});
assert.equal(independentControls.input.writeTools, true, 'disabling tool execution must not rewrite the write-capability input');
assert.equal(independentControls.input.egressRestriction, false, 'removing an egress channel must not silently enable the egress-policy control');
assert.equal(independentControls.input.memoryWriteValidation, false, 'removing persistent memory must not silently enable the memory-validation control');
assert.equal(independentControls.paths.find((p) => p.id === 'unauthorized-action').reachable, false);
assert.equal(independentControls.paths.find((p) => p.id === 'data-exfiltration').reachable, false);
assert.equal(independentControls.paths.find((p) => p.id === 'persistent-poisoning').reachable, false);
console.log('Prompt-injection threat model tests passed.');
