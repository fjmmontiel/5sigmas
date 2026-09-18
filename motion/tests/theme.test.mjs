import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSpec} from '../src/schema.mjs';
import {resolveTheme,contrastRatio} from '../src/theme.mjs';
const spec=JSON.parse(fs.readFileSync(new URL('../content/modelos-razonadores/03-test-time-compute.es.json',import.meta.url)));
const base=JSON.parse(fs.readFileSync(new URL('../theme/5sigmas.json',import.meta.url)));
test('v4 locks a series accent into the runtime theme',()=>{
  assert.equal(validateSpec(spec).valid,true);
  const t=resolveTheme(base,spec);
  assert.equal(t.accent,'#26A69A');
  assert.equal(t.accentText,'#00776F');
});
test('accent text clears WCAG AA on the neutral background',()=>assert.ok(contrastRatio(spec.visualIdentity.accentText,base.background)>=4.5));
test('v4 refuses accent-less release units',()=>{const x=structuredClone(spec);delete x.visualIdentity;assert.throws(()=>validateSpec(x),/visualIdentity/);});
test('v4 refuses decorative-gradient policy drift',()=>{const x=structuredClone(spec);x.visualIdentity.forbidden=['per-scene palette changes'];assert.throws(()=>validateSpec(x),/gradients/);});
test('v4 refuses low-contrast accent text',()=>{const x=structuredClone(spec);x.visualIdentity.accentText='#B8C4C0';assert.throws(()=>validateSpec(x),/contrast/);});
