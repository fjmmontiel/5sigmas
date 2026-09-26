import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEGURIDAD_SYNC_PROFILE,
  seguridadMechanismSeconds,
  seguridadSemanticTimeline,
  seguridadTextState
} from '../src/seguridad/timeline.mjs';

test('Seguridad v3 story timeline sequences text before its matching visual phase', () => {
  const timeline=seguridadSemanticTimeline('S00-C1',12);
  assert.equal(timeline.version,'seguridad-semantic-sync-v3');
  assert.equal(timeline.concept_id,'S00-C1');
  assert.equal(timeline.action,'three_beat_text_visual_story');
  assert.equal(timeline.text_start_seconds,SEGURIDAD_SYNC_PROFILE.storyTextStarts[0]);
  assert.equal(timeline.visual_start_seconds,SEGURIDAD_SYNC_PROFILE.storyVisualStarts[0]);
  assert.ok(timeline.text_start_seconds < timeline.visual_start_seconds);
  assert.equal(timeline.visual_end_seconds,SEGURIDAD_SYNC_PROFILE.storyVisualEndSeconds);
  assert.equal(seguridadMechanismSeconds(0,12,{storyMode:true}),0);
  assert.equal(seguridadMechanismSeconds(1.24,12,{storyMode:true}),0);
  assert.ok(seguridadMechanismSeconds(1.5,12,{storyMode:true})>0);
  assert.equal(seguridadMechanismSeconds(SEGURIDAD_SYNC_PROFILE.storyVisualEndSeconds,12,{storyMode:true}),12);
});

test('Seguridad story copy is progressively disclosed with strong active guidance', () => {
  const text='Uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince.';
  const before=seguridadTextState(text,'S00-C1',0.2,12,{locale:'es'});
  assert.ok(before.cues.length >= 2);
  assert.ok(before.cues.every(c=>c.visible===false));
  const first=seguridadTextState(text,'S00-C1',0.8,12,{locale:'es'});
  assert.equal(first.cues[0].visible,true);
  assert.equal(first.cues[0].status,'active');
  assert.equal(first.cues[0].guideStrong,true);
  assert.ok(first.cues[0].guideAlpha>.5);
  assert.ok(first.cues[0].emphasis>.5);
  assert.ok(first.cues.slice(1).every(c=>!c.visible));
  const second=seguridadTextState(text,'S00-C1',4.0,12,{locale:'es'});
  assert.ok(second.cues[0].visible);
  assert.ok(second.cues[1].visible);
  assert.equal(second.cues[1].status,'active');
  assert.ok(second.cues[1].guideAlpha>.5);
});

test('Seguridad reduced motion resolves complete readable text and complete mechanism deterministically', () => {
  const text='Authorization remains an independent boundary.';
  const state=seguridadTextState(text,'S00-C5',0,12,{reducedMotion:true,locale:'en'});
  assert.ok(state.cues.every(c=>c.visible));
  assert.ok(state.cues.every(c=>c.alpha===1));
  assert.ok(state.cues.every(c=>c.emphasis===0));
  assert.ok(state.cues.every(c=>c.status==='read'));
  assert.equal(seguridadMechanismSeconds(0,12,{reducedMotion:true,storyMode:true}),12);
});

test('legacy chapter timeline rejects durations that cannot preserve read, motion and final holds', () => {
  assert.throws(()=>seguridadSemanticTimeline('S01-C1',5),/no semantic motion window/);
  assert.throws(()=>seguridadSemanticTimeline('',12),/concept id required/);
});
