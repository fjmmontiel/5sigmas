import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualVariety} from '../scripts/check_visual_variety.mjs';

test('complete reasoning series satisfies owner visual-diversity gate',()=>{
  const report=validateVisualVariety();
  assert.equal(report.sceneCount,30);
  assert.equal(report.repeatCap,2);
  assert.ok(Object.values(report.families).every(count=>count<=2));
  assert.ok(report.layout.horizontalBodyTarget>=40);
  assert.ok(report.layout.horizontalSourceGapMax<=90);
});
