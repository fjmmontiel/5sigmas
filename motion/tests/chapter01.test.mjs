import test from 'node:test';import assert from 'node:assert/strict';
import {CHAPTER01} from '../src/seguridad/chapter01-data.mjs';
import {beatState,validateBeatScene,expectedBeatEvents} from '../src/seguridad/semantic-beats.mjs';
const copy=x=>structuredClone(x);
for(const l of ['es','en'])for(const s of CHAPTER01.scenes)test(`${s.id}/${l} timing/retention/seek`,()=>{
 assert.equal(validateBeatScene(s,l),true);
 for(let i=0;i<s.beats.length;i++){
  const b=s.beats[i],before=beatState(s,l,b.at-1/60),on=beatState(s,l,b.at),middle=beatState(s,l,(b.at+b.settledAt)/2),after=beatState(s,l,b.settledAt+.1);
  assert.equal(before.cues[i].visible,false);assert.equal(on.cues[i].visible,true);assert.ok(middle.cues[i].progress>0&&middle.cues[i].progress<1);assert.equal(after.cues[i].progress,1);
  assert.ok(after.cues.slice(0,i+1).every(c=>c.visible));assert.ok(on.cues.slice(i+1).every(c=>!c.visible));assert.deepEqual(beatState(s,l,b.at),on);
  assert.equal(after.cues[i].visual_target_id,b.target);
 }
 assert.ok(beatState(s,l,0,true).cues.every(c=>c.visible&&c.progress===1));
});
test('chapter duration is continuous and no footage implied outside bounds',()=>{let t=0;for(const s of CHAPTER01.scenes){assert.equal(t,s.start);t+=s.duration;assert.equal(s.end,t);}assert.equal(t,118);assert.equal(CHAPTER01.scenes.flatMap(s=>expectedBeatEvents(s,s.start)).length,20);});
test('full paragraph substituted for multiple ideas fails',()=>{const s=copy(CHAPTER01.scenes[0]);s.beats=[{...s.beats[0],text:s.text}];assert.throws(()=>validateBeatScene(s,'es'),/MULTI_IDEA/);});
test('missing translation fails',()=>{const s=copy(CHAPTER01.scenes[0]);delete s.beats[0].text.en;assert.throws(()=>validateBeatScene(s,'en'),/LOCALE/)});
test('duplicate id fails',()=>{const s=copy(CHAPTER01.scenes[0]);s.beats[1].id=s.beats[0].id;assert.throws(()=>validateBeatScene(s,'es'),/DUPLICATE/)});
test('decoration does not satisfy a semantic action',()=>{const s=copy(CHAPTER01.scenes[0]);s.beats[1].action='opacity';assert.throws(()=>validateBeatScene(s,'es'),/SEMANTIC/)});
test('unchanged before/after fails',()=>{const s=copy(CHAPTER01.scenes[0]);s.beats[1].expected.after=copy(s.beats[1].expected.before);assert.throws(()=>validateBeatScene(s,'es'),/STATE_TRANSITION/)});
test('text drift fails',()=>{const s=copy(CHAPTER01.scenes[0]);s.text.en+=' Missing cue.';assert.throws(()=>validateBeatScene(s,'en'),/TEXT_DRIFT/)});
test('out of order action fails',()=>{const s=copy(CHAPTER01.scenes[0]);s.beats[1].at=.1;assert.throws(()=>validateBeatScene(s,'en'),/READING|ORDER|HOLD/)});
test('short hold fails',()=>{const s=copy(CHAPTER01.scenes[0]);s.beats[1].settledAt=s.beats[2].at-.1;assert.throws(()=>validateBeatScene(s,'en'),/HOLD/)});
