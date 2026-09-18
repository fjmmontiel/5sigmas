import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGISTRY} from '../src/engine.mjs';
import {TYPES} from '../src/schema.mjs';

test('every semantic mechanism has a renderer and no decorative fallback exists',()=>{assert.deepEqual(Object.keys(REGISTRY).sort(),[...TYPES].sort());});

test('generic intro renderer owns no Test-Time-Compute-specific copy',()=>{const source=fs.readFileSync(new URL('../src/render/mechanisms/common.mjs',import.meta.url),'utf8');assert.equal(source.includes('¿DÓNDE INVERTIR EL CÓMPUTO?'),false);assert.equal(source.includes('Un presupuesto distinto para cada problema.'),false);assert.match(source,/s\.data\.heading\|\|P\.l\('where'\)/);assert.match(source,/s\.data\.endNote\|\|P\.l\('introEnd'\)/);});

test('offline exporter bundles the complete v4 renderer graph',()=>{const source=fs.readFileSync(new URL('../scripts/render.py',import.meta.url),'utf8');for(const module of ['theme.mjs','render/paint.mjs','render/layout.mjs','render/mechanisms/common.mjs','render/mechanisms/reasoning.mjs','engine.mjs'])assert.ok(source.includes(module),module);});
