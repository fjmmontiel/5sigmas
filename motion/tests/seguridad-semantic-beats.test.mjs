import test from 'node:test';
import assert from 'node:assert/strict';
import {INTRO_V3} from '../src/seguridad/intro-v3-data.mjs';
import {beatState,validateBeatScene,expectedBeatEvents} from '../src/seguridad/semantic-beats.mjs';
const copy=x=>structuredClone(x);
for(const locale of ['es','en'])for(const scene of INTRO_V3.scenes){
 test(`${scene.id}/${locale}: each clause remains absent before its own action`,()=>{
  assert.equal(validateBeatScene(scene,locale),true);
  for(const [i,b]of scene.beats.entries()){
   const before=beatState(scene,locale,b.at-1/60),during=beatState(scene,locale,b.at+.1),after=beatState(scene,locale,b.settledAt+.1);
   assert.equal(before.cues[i].visible,false);
   assert.equal(before.cues[i].progress,0);
   assert.equal(during.cues[i].visible,true);assert.ok(during.cues[i].progress>0);
   assert.equal(after.cues[i].progress,1);assert.equal(after.cues[i].visible,true);
   for(let k=0;k<i;k++)assert.equal(after.cues[k].visible,true);
   for(let k=i+1;k<scene.beats.length;k++)assert.equal(during.cues[k].visible,false);
   assert.equal(during.cues[i].visual_target_id,b.target);
   assert.equal(during.cues[i].action,b.action);
  }
 });
}
test('rejected whole-paragraph profile does not satisfy multi-idea authoring',()=>{
 const s=copy(INTRO_V3.scenes[0]);s.beats=[{...s.beats[0],text:s.text,at:.55,settledAt:10.5}];
 assert.throws(()=>validateBeatScene(s,'es'),/MULTI_IDEA/);
});
test('decorative motion cannot be the action',()=>{const s=copy(INTRO_V3.scenes[0]);s.beats[2].action='opacity';assert.throws(()=>validateBeatScene(s,'es'),/NO_SEMANTIC_ACTION/)});
test('a different name with unchanged before/after is not a transition',()=>{const s=copy(INTRO_V3.scenes[0]);s.beats[2].expected.after=copy(s.beats[2].expected.before);assert.throws(()=>validateBeatScene(s,'es'),/NO_STATE_TRANSITION/)});
test('duplicate cue rejected',()=>{const s=copy(INTRO_V3.scenes[0]);s.beats[1].id=s.beats[0].id;assert.throws(()=>validateBeatScene(s,'es'),/DUPLICATE_BEAT/)});
test('missing English rejected',()=>{const s=copy(INTRO_V3.scenes[0]);delete s.beats[1].text.en;assert.throws(()=>validateBeatScene(s,'en'),/MISSING_LOCALE/)});
test('out-of-order cue rejected',()=>{const s=copy(INTRO_V3.scenes[0]);s.beats[1].at=.2;assert.throws(()=>validateBeatScene(s,'es'),/READING|HOLD|ORDER/)});
test('shortened observation hold rejected',()=>{const s=copy(INTRO_V3.scenes[0]);s.beats[0].settledAt=s.beats[1].at-.1;assert.throws(()=>validateBeatScene(s,'es'),/OBSERVATION_HOLD/)});
test('silent textual drift rejected',()=>{const s=copy(INTRO_V3.scenes[0]);s.text.es+=' Texto extra.';assert.throws(()=>validateBeatScene(s,'es'),/TEXT_DRIFT/)});
test('96s timeline has 20 unique text/action events and no coarse 3.45s lead',()=>{
 const cues=INTRO_V3.scenes.flatMap(s=>expectedBeatEvents(s,s.start));assert.equal(cues.length,20);assert.equal(new Set(cues.map(c=>c.id)).size,20);
 for(const c of cues){assert.equal(c.text_at,c.visual_at);assert.ok(c.settled_at<c.scene_end_at)}
 assert.equal(INTRO_V3.scenes.at(-1).start+INTRO_V3.scenes.at(-1).duration,96);
});
test('seek is order-independent, including rewind',()=>{for(const s of INTRO_V3.scenes){const a=beatState(s,'es',6.2);beatState(s,'es',s.duration);assert.deepEqual(beatState(s,'es',6.2),a);assert.equal(beatState(s,'es',0).cues.some(c=>c.visible),false)}});
test('reduced-motion is the complete stable result',()=>{for(const s of INTRO_V3.scenes)assert.ok(beatState(s,'en',0,true).cues.every(c=>c.visible&&c.progress===1))});
