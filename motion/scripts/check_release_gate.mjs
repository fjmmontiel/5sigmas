#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateVisualVariety} from './check_visual_variety.mjs';
import {REQUIRED_GATES,technicallyGolden} from '../src/review-policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const migration=JSON.parse(readFileSync(`${root}/migration/modelos-razonadores.json`,'utf8'));
// Historical round-one booleans are never reused as current visual evidence.
const status=JSON.parse(readFileSync(`${root}/migration/modelos-razonadores-round2.json`,'utf8'));
const visualPolicy=validateVisualVariety();
assert.equal(status.unit,migration.unit,'ledger belongs to the active release unit');
assert.equal(status.accent,migration.visualIdentity.accent,'locked unit accent must match');
assert.deepEqual(status.requiredGates,REQUIRED_GATES,'all current gates must be enforced');
assert.equal(status.review.round,2,'owner requested a complete second review');
const expected=[];
for(const [locale,videos] of [['es',migration.spanish],['en',migration.english]])for(const video of videos)expected.push(`${locale}:${video}`);
assert.equal(expected.length,12,'complete unit requires all 12 localized outputs');
assert.deepEqual(Object.keys(status.outputs).sort(),expected.sort(),'no omitted or extra outputs');
const revisionOpen=status.ownerFeedbackResolved!==true;
for(const [key,row] of Object.entries(status.outputs)){
 for(const gate of REQUIRED_GATES)assert.equal(typeof row[gate],'boolean',`${key}: missing gate ${gate}`);
 assert.equal(row.technical_golden,!revisionOpen&&technicallyGolden(row),`${key}: Technical GOLDEN must equal all current gates and resolved feedback`);
 assert.equal(row.golden,row.technical_golden,'legacy GOLDEN must mirror Technical GOLDEN');
 if(row.golden_example_approved){assert.ok(row.technical_golden&&row.approval?.source&&row.approval?.assetHash,'explicit exact-version owner approval is required');}
 if(row.technical_golden){for(const gate of REQUIRED_GATES){const evidence=row.evidence?.[gate];assert.ok(evidence?.reference&&evidence?.sourceHash&&evidence?.assetHash,`${key}: ${gate} needs bound evidence`);}}
}
for(const locale of ['es','en'])assert.equal(readdirSync(`${root}/content/modelos-razonadores`).filter(n=>n.endsWith(`.${locale}.json`)).length,6,'six specs per locale');
const golden=Object.values(status.outputs).filter(r=>r.technical_golden).length;
const ready=golden===12&&!revisionOpen&&status.release.state==='golden'&&migration.status==='golden';
console.log(JSON.stringify({unit:status.unit,technicalGolden:`${golden}/12`,ready,reviewRound:2,structuralVariety:visualPolicy.families,visualApproval:visualPolicy.visualApproval,blocked:Object.entries(status.outputs).filter(([,r])=>!r.technical_golden).map(([key,r])=>({key,missing:REQUIRED_GATES.filter(g=>!r[g])}))},null,2));
if(process.argv.includes('--require-ready')&&!ready){console.error('RELEASE BLOCKED: current round-two evidence and all 12 outputs are required.');process.exit(2);}
