import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SEGURIDAD_CHOREOGRAPHY_PROFILES,
  seguridadChoreographyProfile,
  seguridadElementProgress
} from '../src/seguridad/choreography.mjs';
import { SEGURIDAD_MECHANISM_TEXT_CONTRACT } from '../src/seguridad/render.mjs';

const register = JSON.parse(fs.readFileSync('motion/migration/seguridad-ia-series-register.json', 'utf8'));
const concepts = register.chapters.flatMap(chapter => chapter.concepts);

function plan(choreography, progress=[1,.55,.15,0]) {
  return { choreography, cueProgress: progress.map(value => ({progress:value})) };
}

test('every authored Seguridad choreography has an explicit renderer profile', () => {
  const profiles = new Set();
  for (const concept of concepts) {
    const profile = seguridadChoreographyProfile(concept.choreography);
    assert.ok(profile, `${concept.id}: missing choreography profile`);
    profiles.add(profile);
  }
  assert.ok(profiles.size >= 15, `expected broad choreography diversity, got ${profiles.size}`);
  assert.deepEqual([...profiles].sort(), SEGURIDAD_CHOREOGRAPHY_PROFILES);
});

test('authored choreography materially changes element progression', () => {
  const parallel = plan('parallel_arrival_then_merge');
  const trace = plan('edge_by_edge_reveal');
  const cycle = plan('write_retrieve_execute_revoke');
  const matrix = plan('bind_evidence_then_resolve_hold');

  assert.equal(seguridadElementProgress(parallel,'node',0,4), seguridadElementProgress(parallel,'node',1,4));
  assert.notEqual(seguridadElementProgress(trace,'node',0,4), seguridadElementProgress(trace,'node',1,4));
  assert.notEqual(seguridadElementProgress(cycle,'node',0,5), seguridadElementProgress(cycle,'node',1,5));
  assert.equal(seguridadElementProgress(matrix,'zone',0,12), seguridadElementProgress(matrix,'zone',2,12));
  assert.notEqual(seguridadElementProgress(matrix,'zone',2,12), seguridadElementProgress(matrix,'zone',3,12));
});

test('unknown choreography fails closed rather than falling back to generic reveal', () => {
  assert.throws(() => seguridadChoreographyProfile('same_animation_everywhere'), /unsupported choreography/);
  assert.throws(() => seguridadElementProgress(plan('same_animation_everywhere'),'node',0,3), /unsupported choreography/);
});

test('reduced motion resolves every choreography directly to final state', () => {
  for (const concept of concepts) {
    const p={choreography:concept.choreography,cueProgress:concept.cues.map(()=>({progress:1}))};
    for (const kind of ['zone','path','axis','edge','node']) {
      assert.equal(seguridadElementProgress(p,kind,0,4),1,`${concept.id}/${kind}`);
    }
  }
});

test('diagram labels retain readable intended embed sizes', () => {
  assert.ok(SEGURIDAD_MECHANISM_TEXT_CONTRACT.horizontalNodeLabelPx >= 34);
  assert.ok(SEGURIDAD_MECHANISM_TEXT_CONTRACT.verticalNodeLabelPx >= 38);
  assert.ok(SEGURIDAD_MECHANISM_TEXT_CONTRACT.horizontalZoneLabelPx >= 32);
  assert.ok(SEGURIDAD_MECHANISM_TEXT_CONTRACT.verticalZoneLabelPx >= 36);
  assert.ok(SEGURIDAD_MECHANISM_TEXT_CONTRACT.minimumHorizontalEmbedPx >= 16);
  assert.ok(SEGURIDAD_MECHANISM_TEXT_CONTRACT.minimumVerticalEmbedPx >= 12);
});
