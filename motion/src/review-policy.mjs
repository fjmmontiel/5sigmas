import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MECHANISMS,designForScene,canonicalVideoKey} from './render/mechanisms/editorial.mjs';
export const REQUIRED_GATES=Object.freeze(['framework','sync','source','layout','delivery','accessibility','visualQa','textProminence','spatialBalance','semanticMotion','withinVideoVariety','seriesMotionDiversity','fullSeriesVisualReview','ownerFeedbackResolved']);
export const TEXT_POLICY=Object.freeze({horizontalBodyMin:46,portraitBodyMin:46,permanentLowerGapMax:200,sourceGapMax:64,horizontalEmbedBodyPixelsMin:26,portraitEmbedBodyPixelsMin:16});
const hash=text=>createHash('sha256').update(text).digest('hex');
/** Structural preflight is NOT a visual approval. Perceptual review is independent. */
export function auditSeries(specs,{exceptions={}}={}){
 const canonical=specs.filter(s=>s.locale==='es'),english=specs.filter(s=>s.locale==='en');
 assert.equal(canonical.length,6,'all six canonical chapters are required');
 assert.equal(english.length,6,'all six English chapters are required');
 assert.equal(new Set(canonical.map(canonicalVideoKey)).size,6,'duplicate canonical chapter');
 const rows=[],counts={},fingerprints=new Map();
 for(const spec of canonical){const families=[];
  const en=english.find(s=>canonicalVideoKey(s)===canonicalVideoKey(spec));assert.ok(en,`missing EN ${spec.id}`);
  assert.deepEqual(en.scenes.map(s=>s.id),spec.scenes.map(s=>s.id),'locale scene parity');
  for(const scene of spec.scenes){
   const d=designForScene(spec,scene),e=designForScene(en,en.scenes.find(s=>s.id===scene.id));
   assert.ok(d&&d.rationale?.length>=30,`${spec.id}/${scene.id}: semantic rationale required`);
   assert.equal(d.mechanism,e.mechanism,'locale mechanism parity');assert.equal(d.family,e.family,'locale family parity');
   const m=MECHANISMS[d.mechanism];assert.equal(typeof m.render,'function','real renderer required');
   const fingerprint=hash(m.render.toString());
   if(fingerprints.has(fingerprint))assert.equal(fingerprints.get(fingerprint),d.family,'same renderer renamed to evade family cap');
   fingerprints.set(fingerprint,d.family);counts[d.family]=(counts[d.family]||0)+1;families.push(d.family);
   rows.push({video:canonicalVideoKey(spec),scene:scene.id,concept:d.concept,mechanism:d.mechanism,family:d.family,topology:d.topology,rationale:d.rationale,layout:d.layout,rendererFingerprint:fingerprint,cues:scene.cues.map(q=>({id:q.id,at:q.at,end:q.end,focus:q.focus,targets:q.actions.map(a=>a.target)}))});
  }
  assert.ok(new Set(families).size>=Math.min(3,families.length),'insufficient within-video variety');
 }
 for(const [family,count] of Object.entries(counts)){
  assert.ok(count<=3,`${family}: ${count} uses exceeds the absolute series ceiling of 3`);
  if(count===3){const e=exceptions[family];assert.ok(e?.semanticJustification?.length>=60&&e?.visualReviewAccepted===true&&e?.evidenceRevision&&e?.reviewReference,'third use requires explicit current semantic and visual-review exception');}
 }
 return {unit:'modelos-razonadores',canonicalScenes:rows.length,localizedOutputs:specs.length,repeatTarget:2,absoluteCeiling:3,families:counts,scenes:rows,structuralOnly:true,visualApproval:false};
}
export function checkTextMetrics(metrics,{portrait=false}={}){
 for(const k of ['bodySize','permanentLowerGap','sourceGap','intendedEmbedBodyPixels'])assert.ok(Number.isFinite(metrics[k]),`missing actual layout metric ${k}`);
 assert.ok(metrics.bodySize>=(portrait?TEXT_POLICY.portraitBodyMin:TEXT_POLICY.horizontalBodyMin),'small explanatory text');
 assert.ok(metrics.intendedEmbedBodyPixels>=(portrait?TEXT_POLICY.portraitEmbedBodyPixelsMin:TEXT_POLICY.horizontalEmbedBodyPixelsMin),'explanatory text too small at intended embed size');
 if(!portrait){assert.ok(metrics.permanentLowerGap<=TEXT_POLICY.permanentLowerGapMax,'permanent dead lower editorial space');assert.ok(metrics.sourceGap<=TEXT_POLICY.sourceGapMax,'excess source/body gap');}
 return true;
}
export function technicallyGolden(row){return REQUIRED_GATES.every(g=>row[g]===true);}
/** A receipt is only valid for the exact source/render it inspected. */
export function assertEvidence(receipt,sourceHash,assetHash){
 assert.equal(receipt?.status,'PASS','missing PASS receipt');
 assert.equal(receipt.sourceHash,sourceHash,'stale source receipt');
 assert.equal(receipt.assetHash,assetHash,'stale rendered-asset receipt');
 assert.ok(receipt.reviewedAt&&receipt.method&&receipt.scope,'unattributed evidence');
 return true;
}