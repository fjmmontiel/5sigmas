import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateSpec} from '../src/schema.mjs';

const dir=fileURLToPath(new URL('../content/modelos-razonadores/',import.meta.url));
const files=readdirSync(dir).filter(name=>name.endsWith('.json')).sort();
const specs=files.map(name=>({name,spec:JSON.parse(readFileSync(`${dir}/${name}`,'utf8'))}));

test('all checked-in modelos-razonadores specs satisfy the deterministic v4 contract',()=>{
  assert.ok(specs.length>=4,'expected the four authored ES candidates');
  for(const {name,spec} of specs){
    assert.equal(spec.version,4,`${name}: must use v4`);
    assert.doesNotThrow(()=>validateSpec(spec),`${name}: invalid motion spec`);
  }
});

test('the complete release unit cannot drift from the locked Teal reasoning identity',()=>{
  for(const {name,spec} of specs){
    assert.equal(spec.visualIdentity?.unit,'modelos-razonadores',`${name}: wrong release unit`);
    assert.equal(spec.visualIdentity?.accentName,'Teal reasoning',`${name}: accent name drift`);
    assert.equal(spec.visualIdentity?.accent,'#26A69A',`${name}: accent drift`);
    assert.equal(spec.visualIdentity?.accentText,'#00776F',`${name}: accent text drift`);
    assert.equal(spec.visualIdentity?.accentSurface,'#E7F4F0',`${name}: accent surface drift`);
  }
});

test('failure chapter exposes the intended mechanisms instead of decorative fallback scenes',()=>{
  const row=specs.find(({name})=>name==='02-fallos.es.json');
  assert.ok(row,'02-fallos.es.json must be present');
  assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['shortcut','systematic-bias','gaming','propagation','verification']);
  assert.equal(row.spec.scenes.reduce((sum,scene)=>sum+(scene.cues?.length||0),0),19);
  assert.equal(row.spec.scenes.reduce((sum,scene)=>sum+scene.duration,0),108);
});
