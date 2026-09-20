import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateFundamentosRegister,buildFundamentosRenderJobs,FUNDAMENTOS_RENDER_CONTRACT} from '../src/fundamentos/schema.mjs';
import {validateFundamentosMechanismCoverage,compileFundamentosChapter,fundamentosFrameState} from '../src/fundamentos/engine.mjs';
const register=JSON.parse(await readFile(new URL('../migration/fundamentos-ia-iag/series-semantic-register.json',import.meta.url),'utf8'));
test('complete source-bound register preserves diversity hard gate',()=>{
  const result=validateFundamentosRegister(register);
  assert.deepEqual(result,{chapters:5,concepts:25,mechanisms:25,families:25,maxFamilyUse:1});
});
test('native render matrix has 20 deterministic jobs',()=>{
  const jobs=buildFundamentosRenderJobs(register);
  assert.equal(jobs.length,20);assert.equal(jobs.filter(j=>j.orientation==='vertical').length,10);assert.equal(jobs.filter(j=>j.locale==='en').length,10);
  assert.ok(jobs.every(j=>j.sourceBlobSha.length===40&&j.fps===60&&j.durationSeconds===75));
});
test('all 25 explicit mechanisms compile in H/V and reduced motion',()=>{
  const result=validateFundamentosMechanismCoverage(register);
  assert.equal(result.mechanisms,25);assert.equal(result.supportedMechanisms,25);assert.equal(result.jobs,20);
});
test('chapter compiler uses localized copy and fixed five-scene timeline',()=>{
  const job=buildFundamentosRenderJobs(register).find(j=>j.locale==='en'&&j.orientation==='vertical');
  const plan=compileFundamentosChapter(register,job.id);
  assert.equal(plan.scenes.length,5);assert.deepEqual(plan.scenes.map(s=>[s.start,s.end]),[[0,15],[15,30],[30,45],[45,60],[60,75]]);
  assert.ok(plan.scenes.every(s=>s.title&&s.body&&s.mechanism.orientation==='vertical'));
});
test('seek boundaries, replay and reduced-motion states are deterministic',()=>{
  const job=buildFundamentosRenderJobs(register)[0];
  const a=fundamentosFrameState(register,job.id,15),b=fundamentosFrameState(register,job.id,15),end=fundamentosFrameState(register,job.id,75),still=fundamentosFrameState(register,job.id,3,{reducedMotion:true});
  assert.deepEqual(a,b);assert.equal(a.sceneIndex,1);assert.equal(end.sceneIndex,4);assert.equal(end.progress,1);assert.equal(still.scene.mechanism.progress,1);assert.ok(still.scene.mechanism.nodes.every(n=>n.active));
  assert.equal(FUNDAMENTOS_RENDER_CONTRACT.sceneDurationSeconds,15);
});
