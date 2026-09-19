#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateVisualVariety} from './check_visual_variety.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const migration=JSON.parse(readFileSync(`${root}/migration/modelos-razonadores.json`,'utf8'));
const status=JSON.parse(readFileSync(`${root}/migration/modelos-razonadores-status.json`,'utf8'));
const requireReady=process.argv.includes('--require-ready');
const visualPolicy=validateVisualVariety();
const requiredGates=[
  'framework','sync','source','layout','delivery','accessibility','visualQa',
  'textProminence','spatialBalance','semanticMotion','withinVideoVariety',
  'seriesMotionDiversity','fullSeriesVisualReview','ownerFeedbackResolved'
];

assert.equal(status.unit,migration.unit,'status ledger must belong to the active release unit');
assert.equal(status.accent,migration.visualIdentity.accent,'status ledger accent must match the locked unit accent');
assert.deepEqual(status.requiredGates,requiredGates,'owner Review v2 gates are mandatory and may not be silently dropped');
assert.equal(status.currentRevalidation?.review_round,2,'current review round must remain v2');
assert.equal(typeof status.currentRevalidation?.review_email_sent,'boolean','review email state must be tracked');
assert.equal(status.historicalEvidence?.review_v1?.status,'SUPERSEDED_BY_OWNER_FEEDBACK','Review v1 must stay historical only');
assert.equal(migration.visualQualityGate?.revision,2,'owner visual feedback v2 must remain part of the release contract');
assert.equal(migration.visualQualityGate?.motionDiversity?.animationFamilyRepeatCap,2,'animation-family cap must remain fail-closed at two');
assert.equal(migration.visualQualityGate?.motionDiversity?.sceneSpecificSemanticRendererRequired,true,'every scene must resolve to a real semantic renderer');

const expected=[];
for(const [locale,videos] of [['es',migration.spanish],['en',migration.english]])for(const video of videos)expected.push(`${locale}:${video}`);
assert.equal(expected.length,12,'Modelos Razonadores must release as 12 localized outputs');
assert.deepEqual(Object.keys(status.outputs).sort(),expected.sort(),'machine ledger must contain every ES/EN output and no extras');

const revisionOpen=migration.status!=='golden';
for(const [key,row] of Object.entries(status.outputs)){
  for(const gate of requiredGates)assert.equal(typeof row[gate],'boolean',`${key}: ${gate} must be boolean`);
  for(const field of ['technical_golden','golden_example_approved'])assert.equal(typeof row[field],'boolean',`${key}: ${field} must be boolean`);
  const allGates=requiredGates.every(gate=>row[gate]);
  const expectedTechnical=!revisionOpen&&allGates;
  assert.equal(row.technical_golden,expectedTechnical,`${key}: technical_golden must remain false while owner revision is open, otherwise equal every required gate`);
  if(row.golden_example_approved)assert.equal(row.technical_golden,true,`${key}: a Golden Example must already be technically GOLDEN`);
}

const esSpecs=readdirSync(`${root}/content/modelos-razonadores`).filter(name=>name.endsWith('.es.json')).sort();
assert.equal(esSpecs.length,6,'all six Spanish v4 specs must be checked in before release');
const golden=Object.entries(status.outputs).filter(([,row])=>row.technical_golden).map(([key])=>key);
const exemplars=Object.entries(status.outputs).filter(([,row])=>row.golden_example_approved).map(([key])=>key);
const blocked=Object.entries(status.outputs).filter(([,row])=>!row.technical_golden).map(([key,row])=>({key,missing:revisionOpen?['owner_visual_revision_v2',...requiredGates.filter(gate=>!row[gate])]:requiredGates.filter(gate=>!row[gate])}));
const ready=golden.length===expected.length&&migration.status==='golden';
assert.equal(status.currentRevalidation?.technical_golden_count,golden.length,'ledger aggregate Technical GOLDEN count must match per-output state');
assert.equal(status.currentRevalidation?.golden_example_approved_count,exemplars.length,'ledger aggregate Golden Example count must match per-output state');
console.log(JSON.stringify({unit:migration.unit,accent:status.accent,reviewRound:status.currentRevalidation.review_round,technicalGolden:`${golden.length}/${expected.length}`,goldenExamples:exemplars,ready,visualPolicy:{sceneCount:visualPolicy.sceneCount,repeatCap:visualPolicy.repeatCap,families:visualPolicy.families,implementedFamilies:visualPolicy.implementedFamilies},blocked},null,2));
if(requireReady&&!ready){console.error('RELEASE BLOCKED: one PR is releasable only after all 12 localized outputs pass every current Review v2 gate and migration.status is golden.');process.exit(2);}
