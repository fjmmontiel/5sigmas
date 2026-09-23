import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTER04} from '../src/seguridad/chapter04-data.mjs';
import {beatState,validateBeatScene,expectedBeatEvents} from '../src/seguridad/semantic-beats.mjs';

for(const locale of ['es','en']){
 for(const scene of CHAPTER04.scenes){
  test(`${scene.id}/${locale} has readable semantic beats`,()=>{
   assert.equal(validateBeatScene(scene,locale),true);
   for(const beat of scene.beats){
    const state=beatState(scene,locale,beat.at+.1);
    const cue=state.cues.find(row=>row.id===beat.id);
    assert.equal(cue.visible,true);
    assert.equal(cue.guideStrong,true);
    assert.ok(cue.text_at<cue.visual_at);
    assert.ok(cue.visual_at<beat.settledAt);
    assert.notDeepEqual(beat.expected.before,beat.expected.after);
   }
  });
 }
}
test('chapter04 remains one contiguous 118s five-mechanism story',()=>{
 let cursor=0;const families=new Set();
 for(const scene of CHAPTER04.scenes){
  assert.equal(scene.start,cursor);
  assert.equal(scene.end-scene.start,scene.duration);
  assert.equal(scene.text.es,scene.beats.map(b=>b.text.es).join(' '));
  assert.equal(scene.text.en,scene.beats.map(b=>b.text.en).join(' '));
  assert.ok(expectedBeatEvents(scene,scene.start).length>=3);
  families.add(scene.family);cursor=scene.end;
 }
 assert.equal(cursor,118);assert.equal(CHAPTER04.duration,118);assert.equal(families.size,5);
});
