#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const migration=JSON.parse(readFileSync(`${root}/migration/modelos-razonadores.json`,'utf8'));
const status=JSON.parse(readFileSync(`${root}/migration/modelos-razonadores-status.json`,'utf8'));
const requireReady=process.argv.includes('--require-ready');

assert.equal(status.unit,migration.unit,'status ledger must belong to the active release unit');
assert.equal(status.accent,migration.visualIdentity.accent,'status ledger accent must match the locked unit accent');
assert.deepEqual(status.requiredGates,['framework','sync','source','layout','delivery','accessibility','visualQa']);

const expected=[];
for(const [locale,videos] of [['es',migration.spanish],['en',migration.english]]){
  for(const video of videos) expected.push(`${locale}:${video}`);
}
assert.equal(expected.length,12,'Modelos Razonadores must release as 12 localized outputs');
assert.deepEqual(Object.keys(status.outputs).sort(),expected.sort(),'machine ledger must contain every ES/EN output and no extras');

for(const [key,row] of Object.entries(status.outputs)){
  for(const gate of status.requiredGates) assert.equal(typeof row[gate],'boolean',`${key}: ${gate} must be boolean`);
  assert.equal(typeof row.golden,'boolean',`${key}: golden must be boolean`);
  const allGates=status.requiredGates.every(gate=>row[gate]);
  assert.equal(row.golden,allGates,`${key}: GOLDEN must be exactly the conjunction of every required gate`);
}

const esSpecs=readdirSync(`${root}/content/modelos-razonadores`).filter(name=>name.endsWith('.es.json')).sort();
assert.equal(esSpecs.length,6,'all six Spanish v4 specs must be checked in before release');

const golden=Object.entries(status.outputs).filter(([,row])=>row.golden).map(([key])=>key);
const blocked=Object.entries(status.outputs).filter(([,row])=>!row.golden).map(([key,row])=>({key,missing:status.requiredGates.filter(gate=>!row[gate])}));
const ready=golden.length===expected.length && migration.status==='golden';

console.log(JSON.stringify({unit:migration.unit,accent:status.accent,golden:`${golden.length}/${expected.length}`,ready,blocked},null,2));
if(requireReady && !ready){
  console.error('RELEASE BLOCKED: one PR is allowed only when all 12 localized outputs are GOLDEN and migration.status is golden.');
  process.exit(2);
}
