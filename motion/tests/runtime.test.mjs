import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGISTRY} from '../src/engine.mjs';
import {TYPES} from '../src/schema.mjs';
import {MECHANISMS} from '../src/render/mechanisms/editorial.mjs';
import {validateVisualVariety} from '../scripts/check_visual_variety.mjs';

test('every base mechanism has a renderer and no decorative fallback exists',()=>assert.deepEqual(Object.keys(REGISTRY).sort(),[...TYPES].sort()));
test('all 28 concrete editorial renderers exist, grouped conservatively into perceptual families',()=>{
  assert.equal(Object.keys(MECHANISMS).length,28);
  for(const item of Object.values(MECHANISMS)){assert.equal(typeof item.render,'function');assert.ok(item.family&&item.topology);}
  const audit=validateVisualVariety();assert.equal(audit.canonicalScenes,30);assert.ok(Math.max(...Object.values(audit.families))<=2);
  assert.equal(audit.visualApproval,false,'code counts alone must not certify pixels');
});
test('all editorial renderer modules are complete UTF-8 source without control bytes',()=>{
  const dir=new URL('../src/render/mechanisms/',import.meta.url);
  for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.mjs'))){
    const source=fs.readFileSync(new URL(name,dir),'utf8');
    assert.equal(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(source),false,`${name}: control bytes`);
    assert.ok(source.endsWith('\n'),`${name}: incomplete ending`);
  }
});
test('generic intro renderer owns no Test-Time-Compute-specific copy',()=>{
  const source=fs.readFileSync(new URL('../src/render/mechanisms/common.mjs',import.meta.url),'utf8');
  assert.equal(source.includes('¿DÓNDE INVERTIR EL CÓMPUTO?'),false);assert.equal(source.includes('Un presupuesto distinto para cada problema.'),false);
  assert.match(source,/s\.data\.heading\|\|P\.l\('where'\)/);assert.match(source,/s\.data\.endNote\|\|P\.l\('introEnd'\)/);
});
test('offline exporter discovers every local ESM dependency and preserves module scopes',()=>{
  const source=fs.readFileSync(new URL('../scripts/render.py',import.meta.url),'utf8');
  assert.ok(source.includes("rglob('*.mjs')"),'discover module graph, not a stale hardcoded list');
  assert.ok(source.includes("map.type='importmap'"));assert.ok(source.includes('target.is_relative_to(ROOT)'));
  assert.equal(/MODULES\s*=\s*\[/.test(source),false,'no incomplete static concatenation list');
});
