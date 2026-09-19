import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualVariety} from '../scripts/check_visual_variety.mjs';
import {EDITORIAL_LAYOUT_CONTRACT} from '../src/render/layout.mjs';
import {TEXT_POLICY} from '../src/review-policy.mjs';

test('complete reasoning series satisfies owner visual-diversity gate',()=>{
  const report=validateVisualVariety();
  assert.equal(report.canonicalScenes,30);
  assert.equal(report.localizedOutputs,12);
  assert.equal(report.repeatTarget,2);
  assert.equal(report.absoluteCeiling,3);
  assert.ok(Object.values(report.families).every(count=>count<=2));
  assert.equal(report.structuralOnly,true);
  assert.equal(report.visualApproval,false);
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalBodyTarget>=52);
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalBodyMin>=46);
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalTextWidth<=760);
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalSourceGapMax<=64);
  assert.ok(TEXT_POLICY.permanentLowerGapMax<=200);
  assert.ok(TEXT_POLICY.horizontalEmbedBodyPixelsMin>=26);
});