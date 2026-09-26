import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FROM_CAVE_RENDER_CONTRACT,validateFromCaveInputs,buildFromCaveRenderJobs} from '../src/from-cave/schema.mjs';
import {compileFromCaveMechanism,SUPPORTED_FROM_CAVE_TOPOLOGIES} from '../src/from-cave/mechanisms.mjs';
import {compileFromCaveChapter,fromCaveFrameState,validateFromCaveMechanismCoverage} from '../src/from-cave/engine.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bindings=readJson('motion/content/from-cave-to-agi/locale-bindings.json');
const partial=readJson('motion/content/from-cave-to-agi/series-register.partial.json');
const chapters=[
  readJson('motion/content/from-cave-to-agi/chapters/00-presentacion.json'),
  ...partial.chapters,
  readJson('motion/content/from-cave-to-agi/chapters/03-aprender.json'),
  readJson('motion/content/from-cave-to-agi/chapters/04-escalar.json'),
  readJson('motion/content/from-cave-to-agi/chapters/05-mas-alla.json')
].sort((a,b)=>a.chapter.localeCompare(b.chapter));

test('complete source-bound semantic register produces 24 deterministic native render jobs',()=>{
  const structural=validateFromCaveInputs(bindings,chapters);
  assert.deepEqual(structural,{chapters:6,concepts:30,families:30,maxFamilyUse:1});
  const jobs=buildFromCaveRenderJobs(bindings,chapters);
  assert.equal(jobs.length,24);
  assert.equal(new Set(jobs.map(j=>j.id)).size,24);
  assert.equal(jobs.filter(j=>j.orientation==='vertical').length,12);
  assert.ok(jobs.every(j=>j.fps===60&&j.durationSeconds===75&&j.nativeVerticalRequired&&j.reducedMotionRequired));
});

test('every canonical concept has an explicit mechanism in H and V with no fallback',()=>{
  const coverage=validateFromCaveMechanismCoverage(bindings,chapters);
  assert.equal(coverage.concepts,30);
  assert.equal(coverage.families,30);
  assert.equal(coverage.mechanisms,30);
  assert.equal(coverage.supportedTopologies,30);
  assert.equal(SUPPORTED_FROM_CAVE_TOPOLOGIES.length,30);
  for(const chapter of chapters) for(const concept of chapter.concepts) for(const orientation of ['horizontal','vertical']){
    const state=compileFromCaveMechanism(concept,{orientation,localSeconds:7.5,durationSeconds:15});
    assert.equal(state.orientation,orientation);
    assert.equal(state.progress,0.5);
    assert.ok(state.nodes.length>=4);
    for(const node of state.nodes){assert.ok(node.position.x>=0&&node.position.x<=1);assert.ok(node.position.y>=0&&node.position.y<=1);}
  }
  assert.throws(()=>compileFromCaveMechanism({...chapters[0].concepts[0],topology:'generic-list-fallback'}),/unsupported topology/);
});

test('chapter timeline is deterministic at cue boundaries and seek/replay',()=>{
  const job='from-cave-to-agi-04-en-vertical';
  const plan=compileFromCaveChapter(bindings,chapters,job);
  assert.equal(plan.scenes.length,5);
  assert.deepEqual(plan.scenes.map(s=>[s.start,s.end]),[[0,15],[15,30],[30,45],[45,60],[60,75]]);
  const samples=[0,7.5,14.999,15,29.999,30,60,74.999,75];
  const a=samples.map(t=>fromCaveFrameState(bindings,chapters,job,t));
  const b=samples.map(t=>fromCaveFrameState(bindings,chapters,job,t));
  assert.deepEqual(a,b);
  assert.equal(a[2].sceneIndex,0);
  assert.equal(a[3].sceneIndex,1);
  assert.equal(a.at(-1).sceneIndex,4);
  assert.equal(a.at(-1).progress,1);
});

test('reduced motion resolves each scene to a stable final semantic state',()=>{
  const state=fromCaveFrameState(bindings,chapters,'from-cave-to-agi-05-es-horizontal',31,{reducedMotion:true});
  assert.equal(state.reducedMotion,true);
  assert.equal(state.sceneIndex,2);
  assert.equal(state.scene.mechanism.progress,1);
  assert.equal(state.scene.mechanism.reducedMotion,true);
});

test('render contract preserves approved editorial identity and native H/V geometry',()=>{
  assert.deepEqual(FROM_CAVE_RENDER_CONTRACT.theme,{accent:'#26A69A',accentText:'#00776F',accentSurface:'#E7F4F0'});
  assert.deepEqual(FROM_CAVE_RENDER_CONTRACT.horizontal,{width:1920,height:1080});
  assert.deepEqual(FROM_CAVE_RENDER_CONTRACT.vertical,{width:1080,height:1920});
  assert.equal(FROM_CAVE_RENDER_CONTRACT.familyRepeatCap,2);
});
