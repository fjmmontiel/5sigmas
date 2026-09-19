import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGISTRY} from '../src/engine.mjs';
import {TYPES} from '../src/schema.mjs';
import {editorialFamilyNames} from '../src/render/mechanisms/editorial.mjs';

test('every semantic mechanism has a renderer and no decorative fallback exists',()=>{assert.deepEqual(Object.keys(REGISTRY).sort(),[...TYPES].sort());});

test('semantic editorial renderer module is complete and exposes the full family set',()=>{
  const source=fs.readFileSync(new URL('../src/render/mechanisms/editorial.mjs',import.meta.url),'utf8');
  assert.equal(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(source),false,'editorial renderer contains control bytes');
  assert.ok(source.endsWith('\n'),'editorial renderer must end with a newline');
  assert.ok(editorialFamilyNames().length>=28,'all review-v2 semantic families must have real renderers');
});

test('generic intro renderer owns no Test-Time-Compute-specific copy',()=>{const source=fs.readFileSync(new URL('../src/render/mechanisms/common.mjs',import.meta.url),'utf8');assert.equal(source.includes('¿DÓNDE INVERTIR EL CÓMPUTO?'),false);assert.equal(source.includes('Un presupuesto distinto para cada problema.'),false);assert.match(source,/s\.data\.heading\|\|P\.l\('where'\)/);assert.match(source,/s\.data\.endNote\|\|P\.l\('introEnd'\)/);});

test('offline exporter bundles the complete v4.1 renderer graph',()=>{const source=fs.readFileSync(new URL('../scripts/render.py',import.meta.url),'utf8');for(const module of ['theme.mjs','render/paint.mjs','render/layout.mjs','render/mechanisms/common.mjs','render/mechanisms/reasoning.mjs','render/mechanisms/editorial.mjs','engine.mjs'])assert.ok(source.includes(module),module);});
