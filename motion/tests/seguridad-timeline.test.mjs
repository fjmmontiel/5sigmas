import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEGURIDAD_SYNC_PROFILE,
  seguridadMechanismSeconds,
  seguridadSemanticTimeline,
  seguridadTextState
} from '../src/seguridad/timeline.mjs';

test('Seguridad semantic timeline keeps text hidden during orientation lead and motion stopped during reading hold', () => {
  const timeline=seguridadSemanticTimeline('S00-C1',12);
  assert.equal(timeline.version,'seguridad-semantic-sync-v1');
  assert.equal(timeline.sentence_id,'S00-C1.sentence-01');
  assert.equal(timeline.concept_id,'S00-C1');
  assert.equal(timeline.visual_target_id,'S00-C1.mechanism');
  assert.equal(timeline.action,'read_then_explain');
  assert.equal(timeline.text_start_seconds,SEGURIDAD_SYNC_PROFILE.orientationLeadSeconds);
  assert.equal(timeline.visual_start_seconds,SEGURIDAD_SYNC_PROFILE.motionStartSeconds);
  assert.equal(timeline.visual_end_seconds,10.5);
  assert.equal(seguridadMechanismSeconds(0,12),0);
  assert.equal(seguridadMechanismSeconds(3.99,12),0);
  assert.ok(seguridadMechanismSeconds(4.5,12)>0);
  assert.equal(seguridadMechanismSeconds(10.5,12),12);
  assert.equal(seguridadMechanismSeconds(11.8,12),12);
});

test('Seguridad scene body is one stable semantic chunk that appears once and remains readable', () => {
  const text='Privileged instructions and external data share one language channel.';
  const before=seguridadTextState(text,'S00-C1',0.2,12);
  assert.equal(before.cues.length,1);
  assert.equal(before.cues[0].visible,false);
  assert.equal(before.cues[0].status,'future');
  assert.deepEqual(before.cues[0].range,{start:0,end:text.length});
  const reading=seguridadTextState(text,'S00-C1',0.8,12);
  assert.equal(reading.cues[0].visible,true);
  assert.ok(reading.cues[0].alpha>0);
  assert.equal(reading.cues[0].status,'active');
  assert.equal(reading.cues[0].concept_id,'S00-C1');
  assert.equal(reading.cues[0].visual_target_id,'S00-C1.mechanism');
  const explaining=seguridadTextState(text,'S00-C1',6,12);
  assert.equal(explaining.cues[0].visible,true);
  assert.equal(explaining.cues[0].status,'read');
  assert.equal(explaining.cues[0].alpha,1);
});

test('Seguridad reduced motion resolves complete readable text and complete mechanism deterministically', () => {
  const text='Authorization remains an independent boundary.';
  const state=seguridadTextState(text,'S00-C5',0,12,{reducedMotion:true});
  assert.equal(state.cues[0].visible,true);
  assert.equal(state.cues[0].alpha,1);
  assert.equal(state.cues[0].emphasis,0);
  assert.equal(state.cues[0].status,'read');
  assert.equal(seguridadMechanismSeconds(0,12,{reducedMotion:true}),12);
});

test('Seguridad timeline rejects durations that cannot preserve read, motion and final holds', () => {
  assert.throws(()=>seguridadSemanticTimeline('S00-C1',5),/no semantic motion window/);
  assert.throws(()=>seguridadSemanticTimeline('',12),/concept id required/);
});
