import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTER03} from '../src/seguridad/chapter03-data.mjs';
import {beatState, validateBeatScene, expectedBeatEvents} from '../src/seguridad/semantic-beats.mjs';

for (const locale of ['es','en']) {
  for (const scene of CHAPTER03.scenes) {
    test(`${scene.id}/${locale} uses authored semantic beats and strong reading guidance`, () => {
      assert.equal(validateBeatScene(scene, locale), true);
      for (const beat of scene.beats) {
        const at = beatState(scene, locale, beat.at);
        const cue = at.cues.find(item => item.id === beat.id);
        assert.equal(cue.visible, true);
        assert.equal(cue.guideStrong, true);
        assert.ok(cue.guideAlpha >= .8);
        assert.ok(cue.emphasis >= .75);
        assert.notDeepEqual(beat.expected.before, beat.expected.after);
      }
    });
  }
}

test('chapter03 is contiguous, bilingual and exposes five distinct visual mechanisms', () => {
  let cursor = 0;
  const families = new Set();
  for (const scene of CHAPTER03.scenes) {
    assert.equal(scene.start, cursor);
    assert.equal(scene.end - scene.start, scene.duration);
    assert.equal(scene.text.es, scene.beats.map(beat => beat.text.es).join(' '));
    assert.equal(scene.text.en, scene.beats.map(beat => beat.text.en).join(' '));
    assert.ok(expectedBeatEvents(scene, scene.start).length >= 3);
    families.add(scene.family);
    cursor = scene.end;
  }
  assert.equal(cursor, CHAPTER03.duration);
  assert.equal(CHAPTER03.duration, 118);
  assert.equal(families.size, CHAPTER03.scenes.length);
});
