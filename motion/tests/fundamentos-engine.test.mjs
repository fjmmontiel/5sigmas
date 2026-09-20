import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateFundamentosRegister,buildFundamentosRenderJobs,FUNDAMENTOS_RENDER_CONTRACT} from '../src/fundamentos/schema.mjs';
import {validateFundamentosMechanismCoverage,compileFundamentosChapter,fundamentosFrameState} from '../src/fundamentos/engine.mjs';
import {compileFundamentosCueTimeline,validateFundamentosCueBinding,FUNDAMENTOS_TIMELINE_VERSION} from '../src/fundamentos/timeline.mjs';
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
  assert.ok(plan.scenes.every(s=>s.title&&s.body&&s.mechanism.orientation==='vertical'&&s.timeline.version===FUNDAMENTOS_TIMELINE_VERSION));
});
test('seek boundaries, replay and reduced-motion states are deterministic',()=>{
  const job=buildFundamentosRenderJobs(register)[0];
  const a=fundamentosFrameState(register,job.id,15),b=fundamentosFrameState(register,job.id,15),end=fundamentosFrameState(register,job.id,75),still=fundamentosFrameState(register,job.id,3,{reducedMotion:true});
  assert.deepEqual(a,b);assert.equal(a.sceneIndex,1);assert.equal(end.sceneIndex,4);assert.equal(end.progress,1);assert.equal(still.scene.mechanism.progress,1);assert.ok(still.scene.mechanism.nodes.every(n=>n.active));
  assert.equal(still.scene.timeline.visible_body,still.scene.body);assert.ok(still.scene.timeline.events.every(e=>e.active));
  assert.equal(FUNDAMENTOS_RENDER_CONTRACT.sceneDurationSeconds,15);
});
test('body copy is not exposed before the corresponding visual cue and remains visible after reveal',()=>{
  const job=buildFundamentosRenderJobs(register).find(j=>j.locale==='es'&&j.orientation==='horizontal');
  const concept=register.concepts.find(c=>c.chapter===job.chapter);
  const reveal=concept.cues[1];
  const early=fundamentosFrameState(register,job.id,Math.max(.1,reveal-.1));
  const atCue=fundamentosFrameState(register,job.id,reveal);
  const late=fundamentosFrameState(register,job.id,14.9);
  assert.equal(early.scene.timeline.visible_body,'');
  assert.equal(atCue.scene.timeline.visible_body,concept.copy.es.body);
  assert.equal(late.scene.timeline.visible_body,concept.copy.es.body);
  assert.deepEqual(atCue.scene.timeline.visible_sentence_ids,[`${concept.id}:es:title`,`${concept.id}:es:body`]);
});
test('cue timeline is exactly bound to mechanism targets and authored cue times',()=>{
  const concept=register.concepts[0];
  const frame=fundamentosFrameState(register,buildFundamentosRenderJobs(register)[0].id,7.5);
  const timeline=compileFundamentosCueTimeline(concept,'es',{localSeconds:7.5,durationSeconds:15});
  assert.equal(validateFundamentosCueBinding(timeline,frame.scene.mechanism),true);
  assert.deepEqual(timeline.events.map(e=>e.planned_start_seconds),concept.cues);
  assert.deepEqual(timeline.events.map(e=>e.visual_target_id),concept.cues.map((_,i)=>`cue-${i}`));
});
test('negative regression: shifted textual cue cannot bind to an unchanged visual timeline',()=>{
  const concept=register.concepts[0];
  const frame=fundamentosFrameState(register,buildFundamentosRenderJobs(register)[0].id,7.5);
  const timeline=compileFundamentosCueTimeline(concept,'es',{localSeconds:7.5,durationSeconds:15});
  const shifted={...timeline,events:timeline.events.map((event,index)=>index===1?{...event,planned_start_seconds:event.planned_start_seconds+.25}:event)};
  assert.throws(()=>validateFundamentosCueBinding(shifted,frame.scene.mechanism),/timing mismatch/);
});
test('negative regression: relabelled visual target cannot masquerade as synchronized evidence',()=>{
  const concept=register.concepts[0];
  const frame=fundamentosFrameState(register,buildFundamentosRenderJobs(register)[0].id,7.5);
  const timeline=compileFundamentosCueTimeline(concept,'es',{localSeconds:7.5,durationSeconds:15});
  const relabelled={...timeline,events:timeline.events.map((event,index)=>index===1?{...event,visual_target_id:'renamed-but-wrong'}:event)};
  assert.throws(()=>validateFundamentosCueBinding(relabelled,frame.scene.mechanism),/target mismatch/);
});
