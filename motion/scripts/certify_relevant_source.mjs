#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {designForScene} from '../src/render/mechanisms/editorial.mjs';

const ROOT=fileURLToPath(new URL('../', import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const shaFile=p=>sha(fs.readFileSync(p));
const MODULE_BY_MECHANISM=Object.freeze({
 area:'src/render/mechanisms/rich-foundations.mjs',
 budget:'src/render/mechanisms/rich-foundations.mjs',
 topics:'src/render/mechanisms/rich-foundations.mjs',
 tradeoffs:'src/render/mechanisms/rich-foundations.mjs',
 proof:'src/render/mechanisms/rich-foundations.mjs',
 training:'src/render/mechanisms/rich-foundations.mjs',
 experiment:'src/render/mechanisms/rich-foundations.mjs',
 counterfactual:'src/render/mechanisms/rich-failures.mjs',
 framing:'src/render/mechanisms/rich-failures.mjs',
 proxy:'src/render/mechanisms/rich-failures.mjs',
 propagation:'src/render/mechanisms/rich-failures.mjs',
 verification:'src/render/mechanisms/rich-failures.mjs',
 levers:'src/render/mechanisms/rich-compute.mjs',
 extension:'src/render/mechanisms/rich-compute.mjs',
 dependency:'src/render/mechanisms/rich-compute.mjs',
 computePlane:'src/render/mechanisms/rich-compute.mjs',
 scale:'src/render/mechanisms/rich-latency.mjs',
 clocks:'src/render/mechanisms/rich-latency.mjs',
 delivery:'src/render/mechanisms/rich-latency.mjs',
 router:'src/render/mechanisms/rich-latency.mjs',
 deadline:'src/render/mechanisms/rich-latency.mjs',
 regimes:'src/render/mechanisms/rich-risk.mjs',
 injection:'src/render/mechanisms/rich-risk.mjs',
 retrieval:'src/render/mechanisms/rich-risk.mjs',
 stopping:'src/render/mechanisms/rich-risk.mjs',
 barriers:'src/render/mechanisms/rich-risk.mjs',
 candidates:'src/render/mechanisms/reasoning.mjs',
 search:'src/render/mechanisms/reasoning.mjs'
});
const SHARED=Object.freeze([
 'src/engine.mjs','src/cues.mjs','src/schema.mjs','src/theme.mjs','src/labels.mjs',
 'src/render/paint.mjs','src/render/layout.mjs','src/render/mechanisms/editorial.mjs',
 'theme/5sigmas.json','web/render.html','scripts/render.py'
]);
export function relevantFiles(spec,specRel){
 const files=new Set([...SHARED,specRel]);let rich=false;
 for(const scene of spec.scenes){
  const design=designForScene(spec,scene);
  if(design){
   const rel=MODULE_BY_MECHANISM[design.mechanism];
   if(!rel)throw new Error(`No source mapping for semantic mechanism ${design.mechanism}`);
   files.add(rel);if(rel.includes('/rich-'))rich=true;
  }else{
   if(scene.type==='candidates'||scene.type==='tree'||scene.data?.evidenceComparison)files.add('src/render/mechanisms/reasoning.mjs');
   else files.add('src/render/mechanisms/common.mjs');
  }
  if(scene.data?.evidenceComparison)files.add('src/render/mechanisms/reasoning.mjs');
 }
 if(rich)files.add('src/render/mechanisms/rich-core.mjs');
 return [...files].sort();
}
export function certify({validationPath,assetPath,specPath}){
 const validation=JSON.parse(fs.readFileSync(validationPath,'utf8'));
 const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));
 const specRel=path.relative(ROOT,specPath).split(path.sep).join('/');
 const required=relevantFiles(spec,specRel),current={},mismatches=[],missing=[];
 for(const rel of required){
  const abs=path.join(ROOT,rel);if(!fs.existsSync(abs)){missing.push(rel);continue;}
  current[rel]=shaFile(abs);const rendered=validation.source?.files?.[rel];
  if(!rendered)missing.push(`${rel} (missing from render receipt)`);
  else if(rendered!==current[rel])mismatches.push({file:rel,rendered,current:current[rel]});
 }
 const assetHash=shaFile(assetPath),assetReceipt=validation.sha256||validation.postprocess?.output_sha256||null,assetMatches=assetReceipt===assetHash;
 const manifestHash=sha(JSON.stringify(current,Object.keys(current).sort()));
 return {status:missing.length===0&&mismatches.length===0&&assetMatches?'PASS':'FAIL',spec:spec.id,variant:validation.variant,relevantSource:{sha256:manifestHash,files:current},renderedFullGraphSha256:validation.source?.sha256||null,relevantMismatches:mismatches,missingRelevantEvidence:missing,asset:{sha256:assetHash,receiptSha256:assetReceipt,matchesReceipt:assetMatches},scope:'Output-relevant source binding. Requires separate complete-module syntax/import integrity; unrelated imported modules may change without invalidating pixel identity.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [validationPath,assetPath,specPath]=process.argv.slice(2).map(x=>path.resolve(x));
 if(!specPath){console.error('usage: certify_relevant_source.mjs VALIDATION_JSON ASSET_MP4 SPEC_JSON');process.exit(2);}
 const r=certify({validationPath,assetPath,specPath});console.log(JSON.stringify(r,null,2));if(r.status!=='PASS')process.exitCode=1;
}
